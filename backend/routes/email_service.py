import os
import asyncio
import logging
import resend
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from db import db, get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


class SendProposalEmailRequest(BaseModel):
    recipient_email: str
    recipient_name: str = ""
    subject: str = ""
    message: str = ""
    proposal_id: str


class SendNotificationEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    html_content: str


def build_proposal_email_html(proposal, sender_name, message):
    customer_name = proposal.get("customer_name", "Valued Client")
    cities = proposal.get("cities", [])
    city_names = ", ".join([c.get("name", c) if isinstance(c, dict) else c for c in cities])
    total_price = proposal.get("total_price", 0)
    leaving_on = proposal.get("leaving_on", "")
    total_nights = proposal.get("total_nights", 0)
    proposal_name = proposal.get("proposal_name", f"Trip to {city_names}")

    try:
        dt = datetime.fromisoformat(str(leaving_on).replace("Z", "+00:00"))
        formatted_date = dt.strftime("%d %b %Y")
    except Exception:
        formatted_date = str(leaving_on)

    return f'''
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#002B5B;padding:30px 24px;text-align:center;">
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Travo Tours & Travels</div>
            <h1 style="color:white;font-size:24px;margin:10px 0 4px;font-weight:800;">{proposal_name}</h1>
            <div style="color:rgba(255,255,255,0.7);font-size:14px;">{city_names}</div>
        </div>
        <div style="padding:24px;">
            <p style="font-size:14px;color:#374151;margin-bottom:16px;">Dear {customer_name},</p>
            {f'<p style="font-size:14px;color:#374151;margin-bottom:16px;">{message}</p>' if message else ''}
            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
                <table style="width:100%;font-size:13px;color:#374151;">
                    <tr><td style="padding:4px 0;color:#6b7280;">Travel Date</td><td style="padding:4px 0;text-align:right;font-weight:600;">{formatted_date}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Duration</td><td style="padding:4px 0;text-align:right;font-weight:600;">{total_nights} Nights</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Destinations</td><td style="padding:4px 0;text-align:right;font-weight:600;">{city_names}</td></tr>
                    <tr style="border-top:1px solid #e5e7eb;"><td style="padding:8px 0 4px;font-weight:700;font-size:14px;">Total Price</td><td style="padding:8px 0 4px;text-align:right;font-weight:800;font-size:16px;color:#002B5B;">AED {total_price:,.0f}</td></tr>
                </table>
            </div>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">Best regards,<br><strong>{sender_name}</strong><br>Travo Tours & Travels</p>
        </div>
        <div style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            Travo Tours & Travels | info@travotours.ae
        </div>
    </div>
    '''


def build_status_change_email_html(booking, new_status, note):
    stage_labels = {
        "held": "Hold",
        "payment_pending": "Payment Pending",
        "payment_received": "Payment Received",
        "confirmed": "Confirmed",
        "ticketed": "Ticketed",
    }
    stage_colors = {
        "held": "#f59e0b",
        "payment_pending": "#f97316",
        "payment_received": "#14b8a6",
        "confirmed": "#22c55e",
        "ticketed": "#3b82f6",
    }
    status_label = stage_labels.get(new_status, new_status)
    status_color = stage_colors.get(new_status, "#6b7280")
    customer_name = booking.get("customer_name", "Valued Client")
    ref = booking.get("booking_ref") or (
        f"TBM-{str(booking['booking_number']).zfill(6)}" if booking.get("booking_number") is not None
        else "TBM-" + ("".join(ch for ch in str(booking.get("id", "")) if ch.isdigit())[:6].zfill(6))
    )

    return f'''
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#002B5B;padding:24px;text-align:center;">
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Travo Tours & Travels</div>
            <h1 style="color:white;font-size:20px;margin:10px 0 0;font-weight:800;">Booking Status Update</h1>
        </div>
        <div style="padding:24px;">
            <p style="font-size:14px;color:#374151;">Dear {customer_name},</p>
            <p style="font-size:14px;color:#374151;">Your booking <strong>{ref}</strong> has been updated:</p>
            <div style="text-align:center;margin:20px 0;">
                <span style="display:inline-block;background:{status_color};color:white;padding:10px 24px;border-radius:20px;font-weight:800;font-size:16px;">{status_label}</span>
            </div>
            {f'<p style="font-size:13px;color:#6b7280;background:#f8fafc;padding:12px;border-radius:6px;">Note: {note}</p>' if note else ''}
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">If you have any questions, please contact your travel consultant.</p>
        </div>
        <div style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            Travo Tours & Travels | info@travotours.ae
        </div>
    </div>
    '''


def build_booking_confirmation_email_html(booking):
    customer_name = booking.get("customer_name", "Valued Client")
    ref = booking.get("booking_ref") or (
        f"TBM-{str(booking['booking_number']).zfill(6)}" if booking.get("booking_number") is not None
        else "TBM-" + ("".join(ch for ch in str(booking.get("id", "")) if ch.isdigit())[:6].zfill(6))
    )
    total = booking.get("total_price", 0)
    leaving_on = booking.get("leaving_on", "")
    cities = booking.get("cities", [])
    city_names = ", ".join([c.get("name", c) if isinstance(c, dict) else c for c in cities])

    try:
        dt = datetime.fromisoformat(str(leaving_on).replace("Z", "+00:00"))
        formatted_date = dt.strftime("%d %b %Y")
    except Exception:
        formatted_date = str(leaving_on)

    return f'''
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#002B5B,#00508F);padding:30px 24px;text-align:center;">
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Travo Tours & Travels</div>
            <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:50%;margin:12px auto;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:28px;">&#10003;</span>
            </div>
            <h1 style="color:white;font-size:22px;margin:8px 0 0;font-weight:800;">Booking Confirmed!</h1>
        </div>
        <div style="padding:24px;">
            <p style="font-size:14px;color:#374151;">Dear {customer_name},</p>
            <p style="font-size:14px;color:#374151;">Your booking has been confirmed. Here are the details:</p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                <table style="width:100%;font-size:13px;color:#374151;">
                    <tr><td style="padding:4px 0;color:#6b7280;">Reference</td><td style="padding:4px 0;text-align:right;font-weight:700;">{ref}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Destinations</td><td style="padding:4px 0;text-align:right;font-weight:600;">{city_names}</td></tr>
                    <tr><td style="padding:4px 0;color:#6b7280;">Travel Date</td><td style="padding:4px 0;text-align:right;font-weight:600;">{formatted_date}</td></tr>
                    <tr style="border-top:1px solid #bbf7d0;"><td style="padding:8px 0 4px;font-weight:700;">Total</td><td style="padding:8px 0 4px;text-align:right;font-weight:800;font-size:16px;color:#002B5B;">AED {total:,.0f}</td></tr>
                </table>
            </div>
            <p style="font-size:13px;color:#6b7280;">We look forward to making your trip memorable!</p>
        </div>
        <div style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            Travo Tours & Travels | info@travotours.ae
        </div>
    </div>
    '''


async def send_email_async(to_email, subject, html_content):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return None
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return None


@router.post("/email/send-proposal")
async def send_proposal_email(req: SendProposalEmailRequest, current_user: dict = Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": req.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    sender_name = current_user.get("full_name", current_user.get("email", "Travo Agent"))
    html = build_proposal_email_html(proposal, sender_name, req.message)
    subject = req.subject or f"Your Trip Proposal — {proposal.get('proposal_name', 'Travo Tours')}"

    result = await send_email_async(req.recipient_email, subject, html)
    if result is None and RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {"status": "success", "message": f"Email sent to {req.recipient_email}", "email_id": result.get("id") if result else None}


@router.post("/email/booking-status")
async def send_booking_status_email(booking_id: str, new_status: str, note: str = ""):
    """Called internally when status changes - not a user-facing endpoint"""
    booking = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        return

    email = booking.get("customer_email")
    if not email:
        return

    stage_labels = {"held": "Hold", "payment_pending": "Payment Pending", "payment_received": "Payment Received", "confirmed": "Confirmed", "ticketed": "Ticketed"}
    html = build_status_change_email_html(booking, new_status, note)
    subject = f"Booking Update — {stage_labels.get(new_status, new_status)} | Travo Tours"

    await send_email_async(email, subject, html)

    # If confirmed, also send confirmation summary
    if new_status == "confirmed":
        confirmation_html = build_booking_confirmation_email_html(booking)
        await send_email_async(email, "Booking Confirmed! | Travo Tours", confirmation_html)
