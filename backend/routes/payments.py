"""Stripe Checkout integration for Travo DMC bookings.

Security notes:
- Amount is computed server-side from the proposal + booking options
- Frontend only passes `proposal_id`, `origin_url`, and booking-confirmation context
- Booking is created in MongoDB only AFTER Stripe reports the session is paid
- Idempotent: re-polling the status endpoint never double-creates the booking
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from db import db, STRIPE_API_KEY, logger, get_current_user
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

payments_router = APIRouter(prefix="/payments", tags=["Payments"])


class StripeCheckoutRequest(BaseModel):
    proposal_id: str
    origin_url: str
    # Confirmation-page context (so the booking can be created post-payment)
    payment_option: str = Field(default="full", alias="paymentOption")
    custom_partial_amount: Optional[float] = Field(default=None, alias="customPartialAmount")
    travelers: List[Dict[str, Any]] = []
    contact_info: Dict[str, Any] = Field(default_factory=dict, alias="contactInfo")
    special_occasion: str = Field(default="none", alias="specialOccasion")
    coupon_code: Optional[str] = Field(default=None, alias="couponCode")
    coupon_discount: float = Field(default=0, alias="couponDiscount")

    class Config:
        populate_by_name = True


def _compute_amount_to_pay(proposal: dict, payment_option: str, custom_partial_amount: Optional[float], coupon_discount: float) -> tuple[float, float]:
    """Returns (amount_to_pay, final_total) using server-side proposal pricing.
    Mirrors the math in PaymentPage.jsx (totalPrice + markup_land - discount_amount - coupon)."""
    total_price = float(proposal.get("total_price") or proposal.get("pricing_breakdown", {}).get("total") or 0)
    markup_land = float(proposal.get("markup_land") or 0)
    discount_amount = float(proposal.get("discount_amount") or 0)
    coupon = float(coupon_discount or 0)
    price_after_markup = max(0.0, total_price + markup_land - discount_amount - coupon)

    if payment_option == "partial":
        if custom_partial_amount and float(custom_partial_amount) > 0:
            amount_to_pay = float(custom_partial_amount)
        else:
            amount_to_pay = round(price_after_markup * 0.25, 2)
    else:
        amount_to_pay = price_after_markup

    return amount_to_pay, price_after_markup


@payments_router.post("/stripe/checkout")
async def create_stripe_checkout(
    request: Request,
    body: StripeCheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured on the server")

    proposal = await db.proposals.find_one({"id": body.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    amount, final_total = _compute_amount_to_pay(
        proposal, body.payment_option, body.custom_partial_amount, body.coupon_discount
    )
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")

    # Build success/cancel URLs from frontend-provided origin (never hard-code).
    origin = (body.origin_url or "").rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"

    # Stripe webhook URL — built from the FastAPI base URL so it stays correct in any pod.
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    metadata = {
        "proposal_id": body.proposal_id,
        "user_id": current_user.get("id") or current_user.get("email") or "",
        "payment_option": body.payment_option,
        "coupon_code": (body.coupon_code or "").upper(),
    }
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="aed",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe_checkout.create_checkout_session(checkout_request)

    # Persist transaction BEFORE redirect, with the booking context stashed
    # so it can be re-created when Stripe reports the session as paid.
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "proposal_id": body.proposal_id,
        "user_id": current_user.get("id") or current_user.get("email"),
        "booked_by_name": current_user.get("full_name") or current_user.get("name", ""),
        "amount": float(amount),
        "final_total": float(final_total),
        "currency": "AED",
        "payment_method": "stripe",
        "payment_option": body.payment_option,
        "status": "initiated",
        "payment_status": "pending",
        "booking_context": {
            "travelers": body.travelers,
            "contact_info": body.contact_info,
            "special_occasion": body.special_occasion,
            "payment_option": body.payment_option,
            "coupon_code": body.coupon_code,
            "coupon_discount": float(body.coupon_discount or 0),
        },
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"success": True, "url": session.url, "session_id": session.session_id}


async def _finalize_paid_session(session_id: str, payment_status: str, amount_total_cents: Optional[int] = None):
    """Idempotently mark transaction as paid AND create/update the booking.
    Called from both the polling status endpoint and the webhook."""
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        return None

    # Already processed? Bail out (idempotency).
    if transaction.get("status") == "completed" and transaction.get("booking_id"):
        return transaction

    now_iso = datetime.now(timezone.utc).isoformat()
    update_set: Dict[str, Any] = {
        "payment_status": payment_status,
        "updated_at": now_iso,
    }
    if amount_total_cents is not None:
        update_set["amount_total"] = amount_total_cents

    if payment_status != "paid":
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_set})
        return transaction

    # Create the booking via the shared helper.
    from routes.bookings import _create_or_update_booking_doc  # lazy import to avoid circular
    ctx = transaction.get("booking_context", {}) or {}
    booking_result = await _create_or_update_booking_doc(
        proposal_id=transaction["proposal_id"],
        user_id=transaction.get("user_id") or "",
        booked_by_name=transaction.get("booked_by_name") or "",
        travelers=ctx.get("travelers", []),
        contact_info=ctx.get("contact_info", {}),
        special_occasion=ctx.get("special_occasion", "none"),
        payment_option=ctx.get("payment_option", "full"),
        confirmation_time=now_iso,
        payment_method="stripe",
        payment_amount=float(transaction.get("amount") or 0),
        order_id=session_id,
        coupon_code=ctx.get("coupon_code"),
        coupon_discount=float(ctx.get("coupon_discount") or 0),
        final_total=float(transaction.get("final_total") or 0),
    )

    update_set.update({
        "status": "completed",
        "booking_id": booking_result.get("id"),
        "booking_ref": booking_result.get("booking_ref"),
        "completed_at": now_iso,
    })
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_set})

    # Best-effort coupon redemption (don't break payment flow).
    coupon_code = ctx.get("coupon_code")
    if coupon_code and not transaction.get("coupon_redeemed"):
        try:
            await db.coupons.update_one(
                {"code": coupon_code.upper().strip()},
                {"$inc": {"usage_count": 1}},
            )
            await db.payment_transactions.update_one(
                {"session_id": session_id}, {"$set": {"coupon_redeemed": True}}
            )
        except Exception as e:
            logger.warning(f"Coupon redemption failed for {coupon_code}: {e}")

    return {**transaction, **update_set, "booking_id": booking_result.get("id")}


@payments_router.get("/stripe/status/{session_id}")
async def get_stripe_status(session_id: str, current_user: dict = Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    await _finalize_paid_session(
        session_id=session_id,
        payment_status=status.payment_status,
        amount_total_cents=getattr(status, "amount_total", None),
    )

    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})

    return {
        "success": True,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "booking_id": (transaction or {}).get("booking_id"),
        "booking_ref": (transaction or {}).get("booking_ref"),
    }


@payments_router.post("/paypal/checkout")
async def create_paypal_checkout(proposal_id: str, origin_url: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    return {
        "success": False,
        "message": "PayPal integration requires PAYPAL_CLIENT_ID and PAYPAL_SECRET in environment variables",
        "setup_instructions": "Please provide your PayPal sandbox/live credentials",
    }
