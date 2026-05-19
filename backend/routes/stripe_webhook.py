"""Top-level Stripe webhook endpoint at `/api/webhook/stripe` (mandated by the
integration playbook). Kept in its own router because it doesn't sit under the
`/payments` prefix."""
from fastapi import APIRouter, Request
from db import STRIPE_API_KEY, logger
from emergentintegrations.payments.stripe.checkout import StripeCheckout
from routes.payments import _finalize_paid_session

webhook_router = APIRouter()


@webhook_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"status": "stripe not configured"}

    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")

    try:
        wh = await stripe_checkout.handle_webhook(body, signature)
        if wh.session_id and wh.payment_status:
            await _finalize_paid_session(
                session_id=wh.session_id,
                payment_status=wh.payment_status,
            )
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error", "detail": str(e)}
