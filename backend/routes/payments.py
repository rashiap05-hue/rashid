from fastapi import APIRouter, HTTPException, Request
from db import db, STRIPE_API_KEY, logger
from models.schemas import PaymentCreate
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from typing import Optional
from datetime import datetime, timezone
import uuid
import os

payments_router = APIRouter(prefix="/payments", tags=["Payments"])


@payments_router.post("/stripe/checkout")
async def create_stripe_checkout(request: Request, proposal_id: str, origin_url: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    amount = float(proposal.get("total_price", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/payments/webhook/stripe"

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"

    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="aed",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"proposal_id": proposal_id}
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "proposal_id": proposal_id,
        "amount": amount,
        "currency": "AED",
        "payment_method": "stripe",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {"success": True, "url": session.url, "session_id": session.session_id}


@payments_router.get("/stripe/status/{session_id}")
async def get_stripe_status(session_id: str):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status.payment_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction:
            await db.proposals.update_one(
                {"id": transaction["proposal_id"]},
                {"$set": {"status": "confirmed", "payment_status": "paid"}}
            )

    return {
        "success": True,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }


@payments_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"status": "not configured"}

    body = await request.body()
    signature = request.headers.get("Stripe-Signature")

    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")

    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction:
                await db.proposals.update_one(
                    {"id": transaction["proposal_id"]},
                    {"$set": {"status": "confirmed", "payment_status": "paid"}}
                )
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


@payments_router.post("/paypal/checkout")
async def create_paypal_checkout(proposal_id: str, origin_url: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    return {
        "success": False,
        "message": "PayPal integration requires PAYPAL_CLIENT_ID and PAYPAL_SECRET in environment variables",
        "setup_instructions": "Please provide your PayPal sandbox/live credentials"
    }
