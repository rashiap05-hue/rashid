"""Invoice & Voucher PDF generators (WeasyPrint).
Layouts mirror the Nexus DMC reference PDFs provided by the user.
"""
import base64
import logging
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
from weasyprint import HTML

import re

from db import db, get_current_user
from booking_number import format_booking_ref
from routes.pdf_generator import resolve_image, fmt_date, add_days, short_ref, _render_term_bullets
from routes.email_service import send_email_async, RESEND_API_KEY, SENDER_EMAIL
import resend

logger = logging.getLogger(__name__)

router = APIRouter()


def _short_ref(booking_or_pid):
    """Returns the booking display ref. Accepts either a booking dict or a raw id (legacy)."""
    if isinstance(booking_or_pid, dict):
        # Prefer the persisted ref if booking has it
        if booking_or_pid.get("booking_ref"):
            return booking_or_pid["booking_ref"]
        if booking_or_pid.get("booking_number"):
            return format_booking_ref(booking_or_pid["booking_number"])
        pid = booking_or_pid.get("id")
    else:
        pid = booking_or_pid
    if not pid:
        return ""
    # Legacy fallback for bookings created before booking_number was added.
    digits = "".join(ch for ch in str(pid) if ch.isdigit())
    seed = digits[:6] if len(digits) >= 6 else str(abs(hash(str(pid))))[:6]
    return format_booking_ref(seed.lstrip("0") or "0")


def _company_block(user):
    return {
        "name": (user or {}).get("company_name") or "Travo Tours & Travels",
        "email": (user or {}).get("email") or "care@travotours.ae",
    }


# Path to the brand logo (Travo by MedVentures). Loaded once at import-time and embedded
# as a base64 data URL so WeasyPrint can render it without a network fetch.
_LOGO_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "travo_logo.png")
try:
    with open(_LOGO_PATH, "rb") as _lf:
        _LOGO_DATA_URL = "data:image/png;base64," + base64.b64encode(_lf.read()).decode("ascii")
except Exception as _e:
    logger.warning("Travo logo not loaded from %s: %s", _LOGO_PATH, _e)
    _LOGO_DATA_URL = ""


def _format_money(amount, currency="AED"):
    try:
        v = float(amount or 0)
        return f"{currency} {v:,.2f}"
    except Exception:
        return f"{currency} 0.00"


def _guest_lines(travelers):
    if not travelers:
        return ["Guest 1"]
    out = []
    for t in travelers:
        title = t.get("title") or "Mr"
        first = t.get("firstName") or ""
        last = t.get("lastName") or ""
        full = f"{title}. {first} {last}".strip()
        out.append(full)
    return out


# ---------------- INVOICE ----------------

def build_invoice_html(booking, proposal, user):
    company = _company_block(user)
    ref = _short_ref(booking)
    customer_name = booking.get("customer_name") or proposal.get("customer_name") or ""
    customer_email = booking.get("customer_email") or proposal.get("customer_email") or ""
    travelers = booking.get("travelers") or []
    guest_lines = _guest_lines(travelers)
    visible_guests = guest_lines[:6]
    extra_count = max(0, len(guest_lines) - 6)

    booking_date = booking.get("created_at") or booking.get("held_at")
    journey_date = booking.get("leaving_on") or proposal.get("leaving_on")
    # PNR / Confirmation ref — always use our TBM code, never the legacy ORN order_id
    pnr = booking.get("confirmation_pnr") or ref
    final_due = booking.get("final_payment_due_date") or ""
    if not final_due and journey_date:
        try:
            d = datetime.strptime(str(journey_date)[:10], "%Y-%m-%d") - timedelta(days=15)
            final_due = d.strftime("%Y-%m-%d")
        except Exception:
            pass

    # Build description blocks: hotels, transfers, activities
    desc_blocks = ""
    cities = proposal.get("cities", []) or []
    selected_hotels = proposal.get("selected_hotels", {}) or {}
    selected_activities = proposal.get("selected_activities", {}) or {}
    arrival_t = proposal.get("arrival_transfer")
    departure_t = proposal.get("departure_transfer")
    inter_city = proposal.get("inter_city_transfers", {}) or {}

    rooms_total = sum((r.get("rooms", 1) for r in (proposal.get("room_data") or [])), 0) or 1
    adults = sum((r.get("adults", 0) for r in (proposal.get("room_data") or [])), 0) or booking.get("adults", 1)
    children = sum((len(r.get("children") or []) for r in (proposal.get("room_data") or [])), 0)
    pax_line_parts = [f"{adults} adult{'s' if adults != 1 else ''}"]
    if children:
        pax_line_parts.append(f"{children} child{'ren' if children != 1 else ''}")
    pax_line = ", ".join(pax_line_parts)

    day_cursor = 0
    for ci, c in enumerate(cities):
        cname = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        check_in = add_days(journey_date, day_cursor)
        check_out = add_days(check_in, nights)
        h = selected_hotels.get(f"{cname}_{ci}") or {}
        if h:
            sel_room = h.get("selected_room") or h.get("selectedRoom") or {}
            room_name = sel_room.get("name") or "Standard Room"
            _rp = sel_room.get("rate_plan") or sel_room.get("ratePlan") or {}
            meal = (
                _rp.get("meal_plan") or _rp.get("mealPlan")
                or sel_room.get("meal_plan") or sel_room.get("mealPlan")
                or sel_room.get("meals") or h.get("meal_plan") or "Room Only"
            )
            desc_blocks += f"""
            <div class="svc-block">
                <div class="svc-title">Stay in {cname}</div>
                <div class="svc-detail">Check-in Date: {fmt_date(check_in)}, Check-out Date: {fmt_date(check_out)}</div>
                <div class="svc-detail">{h.get('name','')}</div>
                <div class="svc-detail">{rooms_total} x {room_name}</div>
                <div class="svc-detail">Meals Included - {meal}</div>
            </div>
            """
        day_cursor += nights

    if arrival_t:
        title = arrival_t.get("title") or arrival_t.get("name") or "Arrival Transfer"
        ttype = arrival_t.get("transfer_type") or arrival_t.get("type") or "Private"
        desc_blocks += f"""
        <div class="svc-block">
            <div class="svc-title">{title} - {ttype}</div>
            <div class="svc-detail">{pax_line}</div>
        </div>
        """

    for k, t in inter_city.items():
        if not t:
            continue
        title = t.get("title") or t.get("name") or "Inter-city Transfer"
        ttype = t.get("transfer_type") or t.get("type") or "Private"
        desc_blocks += f"""
        <div class="svc-block">
            <div class="svc-title">{title} - {ttype}</div>
            <div class="svc-detail">{pax_line}</div>
        </div>
        """

    for key, val in selected_activities.items():
        items = val if isinstance(val, list) else [val]
        for a in items:
            if not a:
                continue
            name = a.get("name") or a.get("title") or ""
            ttype = a.get("transfer_type") or a.get("type") or "Private"
            desc_blocks += f"""
            <div class="svc-block">
                <div class="svc-title">{name} - {ttype}</div>
                <div class="svc-detail">{pax_line}</div>
            </div>
            """

    if departure_t:
        title = departure_t.get("title") or departure_t.get("name") or "Departure Transfer"
        ttype = departure_t.get("transfer_type") or departure_t.get("type") or "Private"
        desc_blocks += f"""
        <div class="svc-block">
            <div class="svc-title">{title} - {ttype}</div>
            <div class="svc-detail">{pax_line}</div>
        </div>
        """

    total_amount = float(booking.get("total_price") or proposal.get("total_price") or 0)
    paid_amount = float(booking.get("payment_amount") or 0)
    payment_fee = float(booking.get("payment_fee") or 0)
    refund_amount = float(booking.get("refund_amount") or 0)
    balance_due = max(total_amount - paid_amount + payment_fee - refund_amount, 0)
    has_balance = balance_due > 0.01

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@page {{ size: A4; margin: 18mm 16mm; }}
body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; margin: 0; }}
.header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #002B5B; margin-bottom: 22px; }}
.brand {{ font-size: 24px; font-weight: 800; color: #002B5B; letter-spacing: 2px; }}
.brand-tag {{ font-size: 9px; letter-spacing: 4px; color: #6B7280; text-transform: uppercase; margin-top: 2px; }}
.brand-block {{ display: flex; align-items: center; }}
.brand-logo {{ max-height: 64px; max-width: 220px; object-fit: contain; }}
.title {{ font-size: 16px; font-weight: 700; color: #4B5563; }}
.row {{ display: flex; gap: 28px; margin-bottom: 18px; }}
.col {{ flex: 1; }}
.label-h {{ font-size: 10px; font-weight: 800; color: #6B7280; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase; }}
.value {{ color: #111827; }}
.txn-row {{ display: flex; justify-content: space-between; padding: 3px 0; }}
.txn-row .l {{ color: #6B7280; }}
.txn-row .v {{ font-weight: 600; color: #111827; }}
.guest {{ margin-bottom: 2px; font-size: 10.5px; }}
.divider {{ border: none; border-top: 1px solid #E5E7EB; margin: 18px 0; }}
.desc-header {{ display: flex; justify-content: space-between; padding-bottom: 6px; border-bottom: 1px solid #002B5B; margin-bottom: 10px; }}
.desc-header h3 {{ margin: 0; font-size: 12px; font-weight: 800; color: #002B5B; letter-spacing: 1px; text-transform: uppercase; }}
.svc-block {{ padding: 10px 0; border-bottom: 1px solid #F3F4F6; }}
.svc-block:last-child {{ border-bottom: none; }}
.svc-title {{ font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 3px; }}
.svc-detail {{ font-size: 11px; color: #4B5563; margin-bottom: 1px; }}
.notes {{ margin-top: 14px; font-size: 10px; color: #6B7280; line-height: 1.7; }}
.totals {{ margin-top: 18px; margin-left: auto; width: 50%; }}
.totals-row {{ display: flex; justify-content: space-between; padding: 4px 0; font-size: 11.5px; }}
.totals-row.grand {{ border-top: 2px solid #002B5B; margin-top: 6px; padding-top: 8px; font-weight: 800; color: #002B5B; font-size: 13px; }}
.totals-row.grand.unpaid {{ color: #B91C1C; border-top-color: #B91C1C; }}
.txn-row.due-highlight .l {{ color: #B91C1C; font-weight: 700; }}
.txn-row.due-highlight .v {{ color: #B91C1C; font-weight: 800; background: #FEF2F2; padding: 2px 8px; border-radius: 4px; border: 1px solid #FECACA; }}
.footer {{ margin-top: 28px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 9.5px; color: #6B7280; line-height: 1.7; }}
</style></head><body>

<div class="header">
    <div class="brand-block">
        {f'<img src="{_LOGO_DATA_URL}" alt="Travo logo" class="brand-logo" />' if _LOGO_DATA_URL else f'<div class="brand">{company["name"].upper()}</div><div class="brand-tag">Travel & Tourism</div>'}
    </div>
    <div class="title">Proforma Invoice</div>
</div>

<div class="row">
    <div class="col">
        <div class="label-h">Issued To</div>
        <div class="value" style="font-weight:700;">{customer_name}</div>
        <div class="value" style="color:#6B7280;">{customer_email}</div>
    </div>
    <div class="col">
        <div class="label-h">Transaction Details</div>
        <div class="txn-row"><span class="l">Booking Reference:</span><span class="v">{ref}</span></div>
        <div class="txn-row"><span class="l">Booking Date:</span><span class="v">{fmt_date(booking_date)}</span></div>
        <div class="txn-row"><span class="l">Date of Journey:</span><span class="v">{fmt_date(journey_date)}</span></div>
        <div class="txn-row{' due-highlight' if has_balance else ''}"><span class="l">Final Payment Due:</span><span class="v">{fmt_date(final_due) if final_due else '—'}</span></div>
    </div>
</div>

<div class="row">
    <div class="col">
        <div class="label-h">Guest Names</div>
        {''.join(f'<div class="guest">{g}</div>' for g in visible_guests)}
        {f'<div class="guest" style="color:#6B7280;font-style:italic;">+ {extra_count} more</div>' if extra_count else ''}
    </div>
    <div class="col">
        <div class="label-h">Confirmation / PNR</div>
        <div class="value" style="font-weight:700;">{pnr or '—'}</div>
    </div>
</div>

<hr class="divider" />

<div class="desc-header">
    <h3>Description</h3>
    <h3>Confirmation/PNR: {pnr or '—'}</h3>
</div>

{desc_blocks}

<div class="notes">
    <p style="font-weight:700;color:#374151;margin-bottom:4px;">Notes:</p>
    <p>Tax invoice will be issued upon complete payment after service delivery (your travel completion).</p>
    <p>This is an electronically generated invoice and does not require a physical signature.</p>
    <p>For queries, contact us on {company['email']}.</p>
</div>

<div class="totals">
    <div class="totals-row"><span>Total Amount</span><span>{_format_money(total_amount)}</span></div>
    <div class="totals-row"><span>Amount Paid</span><span>{_format_money(paid_amount)}</span></div>
    <div class="totals-row"><span>Payment Fee</span><span>{_format_money(payment_fee)}</span></div>
    <div class="totals-row"><span>Amount Refunded</span><span>{_format_money(refund_amount)}</span></div>
    <div class="totals-row grand{' unpaid' if has_balance else ''}"><span>Balance Due</span><span>{_format_money(balance_due)}</span></div>
</div>

<div class="footer">
    <strong>{company['name']}</strong><br/>
    For queries, email {company['email']}
</div>

</body></html>"""


# ---------------- VOUCHER ----------------

def build_voucher_html(booking, proposal, user, terms):
    company = _company_block(user)
    ref = _short_ref(booking)
    cities = proposal.get("cities", []) or []
    journey_date = booking.get("leaving_on") or proposal.get("leaving_on")
    travelers = booking.get("travelers") or []
    selected_hotels = proposal.get("selected_hotels", {}) or {}
    selected_activities = proposal.get("selected_activities", {}) or {}
    arrival_t = proposal.get("arrival_transfer")
    departure_t = proposal.get("departure_transfer")
    inter_city = proposal.get("inter_city_transfers", {}) or {}

    total_nights = sum((c.get("nights", 1) if isinstance(c, dict) else 1) for c in cities) or 1
    itinerary_summary = ", ".join(f"{(c.get('nights', 1) if isinstance(c, dict) else 1)} nights in {(c.get('name') if isinstance(c, dict) else c)}" for c in cities)
    if len(cities) == 1:
        first_city = cities[0].get("name") if isinstance(cities[0], dict) else cities[0]
        itinerary_summary = f"{total_nights} nights in {first_city}"

    # Guest list
    guest_html = ""
    for i, t in enumerate(travelers, 1):
        title = t.get("title") or "Mr"
        first = t.get("firstName") or ""
        last = t.get("lastName") or ""
        guest_html += f'<div class="guest-line">{i}. {title}. {first} {last}</div>'
    if not guest_html:
        guest_html = '<div class="guest-line">1. Mr. Guest</div>'

    # Hotel sections
    hotel_html = ""
    day_cursor = 0
    for ci, c in enumerate(cities):
        cname = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        check_in = add_days(journey_date, day_cursor)
        check_out = add_days(check_in, nights)
        h = selected_hotels.get(f"{cname}_{ci}") or {}
        if h:
            sel_room = h.get("selected_room") or h.get("selectedRoom") or {}
            room_name = sel_room.get("name") or "Standard Room"
            _rp = sel_room.get("rate_plan") or sel_room.get("ratePlan") or {}
            meal = (
                _rp.get("meal_plan") or _rp.get("mealPlan")
                or sel_room.get("meal_plan") or sel_room.get("mealPlan")
                or sel_room.get("meals") or h.get("meal_plan") or "Room Only"
            )
            stars = "★" * int(h.get("star_rating") or h.get("rating") or 4)
            num_rooms = sum((r.get("rooms", 1) for r in (proposal.get("room_data") or [])), 0) or 1
            address = h.get("address") or h.get("location") or ""
            phone = h.get("phone") or ""
            # Prefer the operational dashboard's confirmation number for this specific hotel,
            # then fall back to any code on the snapshot, then "Pending".
            sc = (booking.get("service_confirmations") or {}).get(f"hotel:{cname}_{ci}") or {}
            confirmation = (
                sc.get("confirmation_number")
                or h.get("confirmation_code")
                or "Pending"
            )

            hotel_html += f"""
            <div class="hotel-block">
                <div class="trip-row">
                    <div class="trip-label">{nights} nights in {cname}</div>
                    <div class="trip-value">{nights} NIGHT{'S' if nights > 1 else ''}</div>
                </div>
                <div class="kv"><span class="k">Hotel:</span> <span class="v">{h.get('name', '')} <span class="stars">{stars}</span></span></div>
                <div class="kv"><span class="k">Address:</span> <span class="v">{address}</span></div>
                {f'<div class="kv"><span class="k">Phone:</span> <span class="v">{phone}</span></div>' if phone else ''}
                <div class="grid-block">
                    <div class="grid-row">
                        <div><span class="k">Confirmation No.:</span> <span class="v">{confirmation}</span></div>
                        <div><span class="k">Number of rooms:</span> <span class="v">{num_rooms}</span></div>
                    </div>
                    <div class="grid-row">
                        <div><span class="k">Room:</span> <span class="v">{num_rooms} x {room_name}</span></div>
                        <div><span class="k">Nights:</span> <span class="v">{nights} nights</span></div>
                    </div>
                    <div class="grid-row">
                        <div><span class="k">Check-in:</span> <span class="v">{fmt_date(check_in)}, 02:00 PM</span></div>
                        <div><span class="k">Check-out:</span> <span class="v">{fmt_date(check_out)}, 12:00 PM</span></div>
                    </div>
                    <div class="grid-row">
                        <div><span class="k">Meal Plan:</span> <span class="v">{meal}</span></div>
                    </div>
                </div>
            </div>
            """
        day_cursor += nights

    # Inclusions list (transfers + activities)
    inclusions_list = []
    if arrival_t:
        title = arrival_t.get("title") or arrival_t.get("name") or "Arrival Transfer"
        ttype = arrival_t.get("transfer_type") or arrival_t.get("type") or "Private"
        inclusions_list.append(f"{title} - {ttype}")
    for k, t in inter_city.items():
        if not t:
            continue
        title = t.get("title") or t.get("name") or "Inter-city Transfer"
        ttype = t.get("transfer_type") or t.get("type") or "Private"
        inclusions_list.append(f"{title} - {ttype}")
    for key, val in selected_activities.items():
        items = val if isinstance(val, list) else [val]
        for a in items:
            if not a:
                continue
            name = a.get("name") or a.get("title") or ""
            ttype = a.get("transfer_type") or a.get("type") or "Private"
            inclusions_list.append(f"{name} - {ttype}")
    if departure_t:
        title = departure_t.get("title") or departure_t.get("name") or "Departure Transfer"
        ttype = departure_t.get("transfer_type") or departure_t.get("type") or "Private"
        inclusions_list.append(f"{title} - {ttype}")
    inclusions_html = "".join(f'<div class="inc-item">✓ {i}</div>' for i in inclusions_list)

    # Terms (rendered as proper bullet lists, with sub-section headings)
    default_terms = [
        ("Booking Confirmation", "Airline seats and hotel rooms are subject to availability at the time of confirmation. In case of unavailability, arrangements for an alternate accommodation will be made in a hotel of similar standard."),
        ("Refunds", "There will be no refund for unused nights, early check-out (subject to hotel policy in case of medical conditions), or any unutilized services (meals, entrance fees, optional tours, hotels, transport and sightseeing, etc.) for any reason."),
        ("Personal Expenses", "The price does not include expenses of personal nature, such as laundry, telephone calls, room service, alcoholic beverages, mini-bar charges, tips, portage, camera fees, etc."),
        ("Itinerary Modifications", "We reserve the right to modify the itinerary due to Force Majeure events, strikes, weather conditions, traffic problems, overbooking, cancellation/re-routing of flights, closure of or entry restrictions at a place of visit, etc. We are not liable for refunds/compensation arising from such changes."),
        ("Hotel Policies", "Check-in and check-out timings are as per hotel policies. Early check-in or late check-out is subject to availability and may incur additional charges payable directly at the hotel."),
        ("Cancellation Policy", "Hotel cancellations are subject to the respective hotel's policy. Non-refundable bookings are not eligible for any refund. Transfers and activities are non-refundable if cancelled within 3 days of the travel start date."),
        ("Service Charges", "A service charge of 5% of the total booking value will be applicable for cancellations of land services (including activities and transfers), as well as for any amendments."),
        ("Amendment of Booking", f"Amendment requests must be submitted in writing to your travel expert or by email to {company['email']}. All such requests are subject to availability and may attract cancellation charges as per airline and hotel policies."),
    ]

    def _render_voucher_term(t: dict) -> str:
        """Build HTML for one term entry — supports list `content`, string `content`, and `sub_sections`."""
        title = t.get("title") or t.get("name") or ""
        content = t.get("content") or t.get("description")
        sub_sections = t.get("sub_sections") or []

        body_html = ""
        if content:
            if isinstance(content, list):
                cleaned = [str(c).strip() for c in content if str(c).strip()]
                # If only one label and we have sub_sections, treat label as a region heading and skip it
                if sub_sections and len(cleaned) == 1:
                    pass
                else:
                    body_html += _render_term_bullets(cleaned)
            elif isinstance(content, str):
                body_html += f'<p class="term-body">{content}</p>'

        for sub in sub_sections:
            if not isinstance(sub, dict):
                continue
            sub_title = sub.get("title") or ""
            sub_items = sub.get("items") or sub.get("content") or []
            sub_bullets = _render_term_bullets(sub_items)
            if sub_title or sub_bullets:
                body_html += f"""
                <div class="term-sub">
                    {f'<h4 class="term-sub-title">{sub_title}</h4>' if sub_title else ''}
                    {sub_bullets}
                </div>
                """

        if not (title or body_html):
            return ""
        return f"""
        <div class="term-block">
            <div class="term-title">{title}</div>
            {body_html}
        </div>
        """

    if terms and isinstance(terms, list):
        # Build HTML directly from the structured records (with bullets + sub-sections)
        custom_html_parts = [_render_voucher_term(t) for t in terms if t]
        custom_html_parts = [p for p in custom_html_parts if p.strip()]
        if custom_html_parts:
            terms_html = "".join(custom_html_parts)
        else:
            terms_html = "".join(f"""
            <div class="term-block">
                <div class="term-title">{title}</div>
                <p class="term-body">{body}</p>
            </div>
            """ for title, body in default_terms)
    else:
        terms_html = "".join(f"""
        <div class="term-block">
            <div class="term-title">{title}</div>
            <p class="term-body">{body}</p>
        </div>
        """ for title, body in default_terms)

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@page {{ size: A4; margin: 16mm; }}
body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; margin: 0; }}
.header {{ display: flex; align-items: center; gap: 14px; padding-bottom: 14px; border-bottom: 2px solid #002B5B; margin-bottom: 18px; }}
.brand-circle {{ width: 56px; height: 56px; border-radius: 50%; background: #002B5B; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; letter-spacing: 1px; }}
.brand-text {{ }}
.brand-text .name {{ font-size: 22px; font-weight: 800; color: #002B5B; letter-spacing: 2px; }}
.brand-text .tag {{ font-size: 9px; letter-spacing: 4px; color: #6B7280; text-transform: uppercase; margin-top: 2px; }}
.voucher-brand-logo {{ max-height: 80px; max-width: 240px; object-fit: contain; }}
.trip-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }}
.trip-label {{ font-weight: 700; color: #111827; font-size: 13px; }}
.trip-value {{ font-weight: 700; color: #002B5B; }}
.section-title {{ font-size: 14px; font-weight: 800; color: #111827; margin: 16px 0 8px 0; }}
.guest-list {{ display: flex; flex-direction: column; }}
.guest-line {{ font-size: 11px; padding: 2px 0; color: #1f2937; }}
.guest-count {{ float: right; color: #6B7280; font-size: 11px; font-weight: 600; }}
.hotel-block {{ margin-bottom: 16px; }}
.kv {{ padding: 3px 0; }}
.kv .k {{ font-weight: 700; color: #374151; }}
.kv .v {{ color: #111827; }}
.stars {{ color: #F59E0B; margin-left: 4px; }}
.grid-block {{ background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 14px; margin-top: 10px; }}
.grid-row {{ display: flex; justify-content: space-between; padding: 3px 0; }}
.grid-row > div {{ flex: 1; }}
.inc-list {{ background: #FFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 14px; margin-top: 10px; }}
.inc-item {{ font-size: 11px; padding: 3px 0; color: #1f2937; }}
.cancel-line {{ margin-top: 14px; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; color: #B91C1C; }}
.cancel-line .k {{ font-weight: 800; }}
.term-block {{ margin-bottom: 12px; page-break-inside: avoid; }}
.term-title {{ font-size: 12px; font-weight: 800; color: #002B5B; margin-bottom: 6px; }}
.term-body {{ font-size: 10.5px; color: #4B5563; line-height: 1.6; margin: 4px 0; }}
.term-bullets {{ font-size: 10.5px; color: #4B5563; line-height: 1.55; padding-left: 18px; margin: 4px 0 8px 0; }}
.term-bullets li {{ margin-bottom: 4px; }}
.term-sub {{ margin: 6px 0 8px 0; padding-left: 10px; border-left: 2px solid #DBE3EC; }}
.term-sub-title {{ font-size: 11.5px; font-weight: 700; color: #1F2937; margin: 4px 0; }}
.page-break {{ page-break-before: always; }}
.tc-header {{ text-align: center; font-size: 18px; font-weight: 800; color: #002B5B; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #002B5B; }}
</style></head><body>

<div class="header">
    {f'<img src="{_LOGO_DATA_URL}" alt="Travo logo" class="voucher-brand-logo" />' if _LOGO_DATA_URL else f'<div class="brand-circle">{company["name"][:1]}</div><div class="brand-text"><div class="name">{company["name"].upper()}</div><div class="tag">Travel & Tourism</div></div>'}
</div>

<div class="trip-row">
    <div class="trip-label">Trip Reference</div>
    <div class="trip-value">{ref}</div>
</div>
<div class="trip-row">
    <div class="trip-label">Your Trip Itinerary</div>
    <div class="trip-value">{itinerary_summary}</div>
</div>

<div class="section-title">Guest Details <span class="guest-count">{len(travelers) or 1} Guest{'s' if (len(travelers) or 1) != 1 else ''}</span></div>
<div class="guest-list">{guest_html}</div>

{hotel_html}

<div class="section-title">Inclusions</div>
<div class="inc-list">{inclusions_html if inclusions_html else '<div class="inc-item">No additional inclusions specified</div>'}</div>

<div class="cancel-line"><span class="k">Cancellation Policy:</span> Non-refundable. Refer to terms below for full policy.</div>

<!-- Terms & Conditions -->
<div class="page-break">
    <div class="tc-header">Terms and Conditions</div>
    {terms_html}
</div>

</body></html>"""


# ---------------- ROUTES ----------------

async def _load_booking_context(booking_id, current_user):
    booking = await db.held_bookings.find_one({"id": booking_id}, {"_id": 0}) \
        or await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    proposal = {}
    if booking.get("proposal_id"):
        proposal = await db.proposals.find_one({"id": booking["proposal_id"]}, {"_id": 0}) or {}

    user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0, "password": 0})

    # Filter terms by trip destination countries (mirror proposal-PDF logic)
    proposal_cities = (proposal or {}).get("cities", []) or []
    city_names = [
        (c.get("name") if isinstance(c, dict) else c)
        for c in proposal_cities
        if c
    ]
    trip_countries = set()
    for c in proposal_cities:
        if isinstance(c, dict):
            cn = (c.get("country") or "").strip()
            if cn:
                trip_countries.add(cn)
    if city_names:
        regexes = [{"name": {"$regex": f"^{re.escape(n)}$", "$options": "i"}} for n in city_names if n]
        if regexes:
            async for cdoc in db.cities.find({"$or": regexes}, {"_id": 0, "name": 1, "country": 1}):
                cn = (cdoc.get("country") or "").strip()
                if cn:
                    trip_countries.add(cn)

    all_terms = await db.terms_policies.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(200)
    trip_countries_lower = {c.lower() for c in trip_countries}

    def _is_relevant(t: dict) -> bool:
        applies = (t.get("applies_to") or "all").lower()
        country = (t.get("country") or "").strip()
        if applies == "all" or not country:
            return True
        return country.lower() in trip_countries_lower

    terms = [t for t in all_terms if _is_relevant(t)]
    terms.sort(key=lambda t: (t.get("order") if isinstance(t.get("order"), (int, float)) else 999))
    return booking, proposal, user, terms


@router.get("/bookings/{booking_id}/invoice-pdf")
async def get_invoice_pdf(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking, proposal, user, _ = await _load_booking_context(booking_id, current_user)
    html_content = build_invoice_html(booking, proposal, user)
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice PDF generation failed: {e}")
    ref = _short_ref(booking)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Trip_Invoice_{ref}.pdf"'},
    )


@router.get("/bookings/{booking_id}/voucher-pdf")
async def get_voucher_pdf(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking, proposal, user, terms = await _load_booking_context(booking_id, current_user)
    html_content = build_voucher_html(booking, proposal, user, terms)
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voucher PDF generation failed: {e}")
    ref = _short_ref(booking)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{ref}_Voucher.pdf"'},
    )


# ---------------- PAYMENT RECEIPT ----------------

def _build_transactions(booking):
    """Build transaction rows (matches BookingDetail.jsx logic)."""
    total_price = float(booking.get("total_price") or 0)
    payments = booking.get("payments") or []
    if payments:
        rows = []
        for p in payments:
            rows.append({
                "date": p.get("paid_at") or p.get("created_at"),
                "amount": float(p.get("amount") or 0),
                "status": p.get("status") or "Processed Successfully",
                "ref": p.get("id") or p.get("order_id") or "",
            })
        return rows, total_price
    if booking.get("paid_at"):
        return [{
            "date": booking.get("paid_at"),
            "amount": float(booking.get("payment_amount") or total_price),
            "status": "Processed Successfully",
            "ref": booking.get("order_id") or "",
        }], total_price
    return [], total_price


def _fmt_receipt_date(iso):
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return dt.strftime("%d %b, %Y at %I:%M %p")
    except Exception:
        return str(iso)[:10]


def _fmt_receipt_date_only(iso):
    if not iso:
        return "—"
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return str(iso)[:10]


def build_receipt_html(booking, proposal, user, txn_index=None):
    """Payment Receipt PDF (Nexus-style layout).
    If `txn_index` is given, only that single transaction is highlighted;
    otherwise all transactions are listed.
    """
    company = _company_block(user)
    ref = _short_ref(booking)
    customer_name = booking.get("customer_name") or (proposal or {}).get("customer_name") or "—"
    customer_email = booking.get("customer_email") or (proposal or {}).get("customer_email") or "—"
    customer_phone = booking.get("customer_phone") or (booking.get("contact_info") or {}).get("phone") or (user or {}).get("mobile") or "—"

    transactions, total_price = _build_transactions(booking)

    # If a specific transaction index was requested, filter to that single row
    if isinstance(txn_index, int) and 0 <= txn_index < len(transactions):
        displayed_txns = [transactions[txn_index]]
    else:
        displayed_txns = transactions

    paid_amount = sum(float(t.get("amount") or 0) for t in transactions)

    booking_date = booking.get("created_at") or booking.get("held_at")

    # Payment Reference — always TBM-branded. If a specific transaction index is
    # shown, suffix the booking ref with `-P<n>` (P1, P2...); otherwise use the
    # bare booking ref. We never expose legacy `ORN*` order_ids on receipts.
    if isinstance(txn_index, int) and txn_index >= 0:
        payment_ref = f"{ref}-P{txn_index + 1}"
    else:
        payment_ref = ref

    # Build the table rows HTML
    if displayed_txns:
        txn_rows = "".join(
            f"""
            <tr>
                <td class="desc-col">Paid</td>
                <td class="on-col">{_fmt_receipt_date(t.get('date'))}</td>
                <td class="amt-col">{_format_money(t.get('amount'))}</td>
            </tr>
            """
            for t in displayed_txns
        )
    else:
        txn_rows = """
        <tr><td colspan="3" class="no-txn">No payment transactions recorded yet.</td></tr>
        """

    logo_block = (
        f'<img src="{_LOGO_DATA_URL}" class="brand-logo" alt="Travo by MedVentures" />'
        if _LOGO_DATA_URL else f'<div class="brand-text">{company["name"].upper()}</div>'
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <title>Payment Receipt — {ref}</title>
        <style>
            @page {{ size: A4; margin: 18mm 16mm; }}
            * {{ box-sizing: border-box; }}
            body {{
                font-family: "Helvetica", "Arial", sans-serif;
                color: #1f2937;
                font-size: 11pt;
                margin: 0;
            }}
            .hdr {{
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding-bottom: 18px;
                border-bottom: 1px solid #e5e7eb;
            }}
            .brand-logo {{
                max-height: 72px;
                max-width: 230px;
            }}
            .brand-text {{
                font-size: 20pt;
                font-weight: 900;
                letter-spacing: 0.5px;
                color: #4a2b10;
            }}
            .doc-title {{
                font-size: 20pt;
                font-weight: 700;
                color: #1f2937;
                text-align: right;
                letter-spacing: -0.5px;
            }}
            .doc-sub {{
                font-size: 9pt;
                color: #6b7280;
                text-align: right;
                margin-top: 3px;
                letter-spacing: 0.5px;
            }}
            .info-grid {{
                display: flex;
                gap: 36px;
                margin-top: 26px;
            }}
            .info-col {{ flex: 1; }}
            .info-label {{
                font-size: 9pt;
                font-weight: 700;
                color: #9ca3af;
                letter-spacing: 1.2px;
                margin-bottom: 10px;
            }}
            .info-name {{
                font-size: 13pt;
                font-weight: 700;
                color: #111827;
                margin-bottom: 6px;
                text-transform: uppercase;
            }}
            .info-line {{
                font-size: 10.5pt;
                color: #4b5563;
                margin-bottom: 3px;
            }}
            .kv-row {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 10.5pt;
            }}
            .kv-label {{ color: #6b7280; }}
            .kv-val {{ color: #111827; font-weight: 600; }}
            .sep {{
                border-top: 1px solid #e5e7eb;
                margin: 30px 0 0;
            }}
            table.txn-table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            table.txn-table thead th {{
                text-align: left;
                font-size: 9pt;
                font-weight: 700;
                color: #9ca3af;
                letter-spacing: 1.2px;
                padding: 10px 4px;
                border-bottom: 1px solid #e5e7eb;
                text-transform: uppercase;
            }}
            table.txn-table thead th.amt-col {{ text-align: right; }}
            table.txn-table tbody td {{
                padding: 14px 4px;
                font-size: 10.5pt;
                color: #1f2937;
                border-bottom: 1px solid #f3f4f6;
            }}
            table.txn-table tbody td.amt-col {{
                text-align: right;
                font-weight: 700;
                color: #059669;
            }}
            table.txn-table tbody td.no-txn {{
                text-align: center;
                color: #9ca3af;
                font-style: italic;
                padding: 20px;
            }}
            .summary {{
                margin-top: 22px;
                display: flex;
                justify-content: flex-end;
            }}
            .summary-box {{
                width: 300px;
            }}
            .summary-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 11pt;
            }}
            .summary-row.total {{
                border-top: 2px solid #111827;
                font-weight: 800;
                font-size: 12pt;
                color: #111827;
                margin-top: 6px;
                padding-top: 12px;
            }}
            .footer {{
                position: fixed;
                bottom: 12mm;
                left: 16mm;
                right: 16mm;
                text-align: center;
                font-size: 9pt;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 10px;
                line-height: 1.6;
            }}
            .footer .co-name {{ font-weight: 700; color: #374151; }}
        </style>
    </head>
    <body>
        <div class="hdr">
            <div>{logo_block}</div>
            <div>
                <div class="doc-title">Payment Receipt</div>
                <div class="doc-sub">REF {ref}</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-col">
                <div class="info-label">ISSUED TO</div>
                <div class="info-name">{customer_name}</div>
                <div class="info-line">{customer_email}</div>
                <div class="info-line">{customer_phone}</div>
            </div>
            <div class="info-col">
                <div class="info-label">TRANSACTION DETAILS</div>
                <div class="kv-row"><span class="kv-label">Booking Reference</span><span class="kv-val">{ref}</span></div>
                <div class="kv-row"><span class="kv-label">Booking Date</span><span class="kv-val">{_fmt_receipt_date_only(booking_date)}</span></div>
                <div class="kv-row"><span class="kv-label">Payment Reference</span><span class="kv-val">#{payment_ref}</span></div>
            </div>
        </div>

        <div class="sep"></div>

        <table class="txn-table">
            <thead>
                <tr>
                    <th class="desc-col">DESCRIPTION</th>
                    <th class="on-col">ON</th>
                    <th class="amt-col">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                {txn_rows}
            </tbody>
        </table>

        <div class="summary">
            <div class="summary-box">
                <div class="summary-row">
                    <span class="kv-label">Total Booking Amount</span>
                    <span class="kv-val">{_format_money(total_price)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount Paid</span>
                    <span>{_format_money(paid_amount)}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="co-name">{company['name']}</div>
            <div>Email: {company['email']}</div>
        </div>
    </body>
    </html>
    """
    return html


@router.get("/bookings/{booking_id}/receipt-pdf")
async def get_receipt_pdf(
    booking_id: str,
    txn: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Generate a Payment Receipt PDF. Optional `?txn=<index>` pins the receipt to one
    specific transaction row (matches the row on the BookingDetail 'Print Receipt' link)."""
    booking, proposal, user, _ = await _load_booking_context(booking_id, current_user)
    html_content = build_receipt_html(booking, proposal, user, txn_index=txn)
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Receipt PDF generation failed: {e}")
    ref = _short_ref(booking)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Payment_Receipt_{ref}.pdf"'},
    )



async def _refresh_refund_deadline(hotel: dict, sel_room: dict) -> str:
    """Pulls the latest `refund_deadline` from the master `hotels` collection so edits
    to Hotel Management flow through to vouchers without resaving the proposal."""
    hotel_id = hotel.get("id") or hotel.get("hotel_id")
    if not hotel_id:
        return ""
    master = await db.hotels.find_one({"id": hotel_id}, {"_id": 0, "rooms": 1, "room_types": 1})
    if not master:
        return ""
    # Find the matching room + rate plan in the master record
    room_name = (sel_room.get("name") or "").strip()
    rp_name = ((sel_room.get("rate_plan") or sel_room.get("ratePlan") or {}).get("name")
               or sel_room.get("rate_plan_name") or "").strip()
    rooms = master.get("rooms") or master.get("room_types") or []
    for r in rooms:
        if not isinstance(r, dict):
            continue
        if room_name and r.get("name", "").strip() != room_name:
            continue
        rate_plans = r.get("rate_plans") or r.get("ratePlans") or []
        for rp in rate_plans:
            if not isinstance(rp, dict):
                continue
            if rp_name and rp.get("name", "").strip() != rp_name:
                continue
            return (rp.get("refund_deadline") or rp.get("refundDeadline") or "").strip()
    return ""


def _build_hotel_voucher_html(booking, proposal, user, terms, hotel_key, fresh_refund_deadline=""):
    """Hotel-specific voucher (one-hotel Happihaus-style layout)."""
    from datetime import datetime as _dt, timedelta as _td

    selected_hotels = (proposal or {}).get("selected_hotels") or {}
    hotel = selected_hotels.get(hotel_key) or {}
    if not hotel:
        raise HTTPException(status_code=404, detail=f"Hotel '{hotel_key}' not found on this booking")

    # Parse "<City>_<cityIdx>"
    last_us = hotel_key.rfind("_")
    city_name = hotel_key[:last_us] if last_us > 0 else hotel_key
    try:
        city_idx = int(hotel_key[last_us + 1:])
    except (ValueError, IndexError):
        city_idx = 0

    cities = (proposal or {}).get("cities") or []
    matched_city = cities[city_idx] if city_idx < len(cities) else None
    nights = int((matched_city or {}).get("nights") if isinstance(matched_city, dict) else 0) or int(hotel.get("nights") or 1)

    # Check-in / check-out
    leaving_on = (proposal or {}).get("leaving_on") or (proposal or {}).get("start_date")
    prior_nights = sum(int((c or {}).get("nights", 0) if isinstance(c, dict) else 0) for c in cities[:city_idx])
    check_in_date = hotel.get("check_in") or (add_days(leaving_on, prior_nights) if leaving_on else "")
    check_out_date = hotel.get("check_out") or (add_days(leaving_on, prior_nights + nights) if leaving_on else "")

    # Rooms / room data
    sel_room = hotel.get("selected_room") or hotel.get("selectedRoom") or {}
    room_name = sel_room.get("name") or hotel.get("room_type") or "Standard Room"
    rp = sel_room.get("rate_plan") or sel_room.get("ratePlan") or {}
    meal_plan = (
        rp.get("meal_plan") or rp.get("mealPlan")
        or sel_room.get("meal_plan") or sel_room.get("mealPlan") or sel_room.get("meals")
        or hotel.get("meal_plan") or "Room Only"
    )
    refundable = rp.get("refundable") if "refundable" in rp else sel_room.get("refundable")
    # Compute actual cancellation deadline date.
    # Prefer the freshly-fetched value from master `hotels` (so Hotel-Management edits flow through).
    # Fall back to the proposal's frozen snapshot.
    refund_phrase = (
        (fresh_refund_deadline or "").strip()
        or rp.get("refund_deadline")
        or sel_room.get("refundable_until")
        or rp.get("cancellation_deadline")
        or ""
    ).strip()
    cancel_deadline_date = ""
    if refund_phrase:
        # 1) Try to parse as an absolute date
        for fmt in ("%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                cancel_deadline_date = _dt.strptime(refund_phrase, fmt).date().isoformat()
                break
            except ValueError:
                continue
        # 2) Fallback: relative phrase like "1 week before"
        if not cancel_deadline_date and check_in_date:
            try:
                ci_date = _dt.fromisoformat(check_in_date) if isinstance(check_in_date, str) else check_in_date
                phrase_lower = refund_phrase.lower()
                import re as _re
                m = _re.search(r"(\d+)\s*(hour|day|week|month)", phrase_lower)
                if m:
                    n = int(m.group(1))
                    unit = m.group(2)
                    if unit == "hour":
                        cancel_deadline_date = (ci_date - _td(hours=n)).date().isoformat()
                    elif unit == "day":
                        cancel_deadline_date = (ci_date - _td(days=n)).date().isoformat()
                    elif unit == "week":
                        cancel_deadline_date = (ci_date - _td(weeks=n)).date().isoformat()
                    elif unit == "month":
                        cancel_deadline_date = (ci_date - _td(days=30 * n)).date().isoformat()
            except Exception:
                cancel_deadline_date = ""

    if refundable is False:
        cancel_policy_text = "Non-refundable"
        cancel_policy_color = "#dc2626"
    elif cancel_deadline_date:
        cancel_policy_text = f"Free cancellation until {fmt_date(cancel_deadline_date)}"
        cancel_policy_color = "#15803d"
    elif refund_phrase:
        cancel_policy_text = f"Refundable — {refund_phrase} check-in"
        cancel_policy_color = "#15803d"
    else:
        cancel_policy_text = "Refundable as per hotel policy"
        cancel_policy_color = "#374151"

    room_data = (proposal or {}).get("room_data") or []
    total_rooms = sum(int(r.get("rooms", 1) or 1) for r in room_data) or 1
    total_adults = sum(int(r.get("adults", 0) or 0) for r in room_data) or int(hotel.get("guests_count") or 2)

    # Per-service confirmation
    sc = (booking.get("service_confirmations") or {}).get(f"hotel:{hotel_key}") or {}
    confirmation_num = sc.get("confirmation_number") or hotel.get("confirmation_code") or "Pending"

    # Guests list from booking.travelers (preferred) or booking.passengers (legacy)
    traveler_list = booking.get("travelers") or booking.get("passengers") or []
    guest_names = []
    for p in traveler_list:
        if not isinstance(p, dict):
            continue
        title = (p.get("title") or "").strip()
        # Support both camelCase (firstName) and snake_case (first_name)
        first = (p.get("firstName") or p.get("first_name") or "").strip()
        last = (p.get("lastName") or p.get("last_name") or "").strip()
        full = " ".join(x for x in [title, first, last] if x).strip()
        if full:
            guest_names.append(full.upper())
    if not guest_names:
        cn = booking.get("customer_name") or (user or {}).get("full_name") or ""
        if cn:
            guest_names = [cn.upper()]
    total_guests = len(guest_names) or total_adults

    address = hotel.get("address") or hotel.get("location") or ""
    phone = hotel.get("phone") or hotel.get("contact_number") or ""
    stars = int(hotel.get("star_rating") or hotel.get("rating") or 4)
    ref = _short_ref(booking)

    # Build room breakdown list (visual bullets with checkmark)
    room_breakdown_items = []
    for r in room_data:
        qty = int(r.get("rooms", 1) or 1)
        extras = []
        if "breakfast" in meal_plan.lower():
            extras.append("Breakfast")
        if r.get("extra_bed"):
            extras.append(f"{r.get('extra_bed')} Extra Bed/Mattress")
        else:
            extras.append("No Extra Bed")
        detail = ", ".join(extras)
        room_breakdown_items.append(f"{qty} x {room_name} ({detail})")
    if not room_breakdown_items:
        room_breakdown_items = [f"{total_rooms} x {room_name} ({meal_plan})"]

    guests_html = "".join(f"<li>{g}</li>" for g in guest_names) if guest_names else "<li>Not provided</li>"
    rooms_list_html = "".join(f"<li>{r}</li>" for r in room_breakdown_items)
    room_breakdown_html = "".join(
        f'<div class="room-row"><span class="check">✓</span> {r}</div>'
        for r in room_breakdown_items
    )
    stars_html = "".join("★" for _ in range(stars))

    # Terms block (reuse voucher renderer)
    terms_blocks_html = ""
    for t in (terms or []):
        title = t.get("title") or t.get("name") or ""
        content = t.get("content") or t.get("description")
        sub_sections = t.get("sub_sections") or []
        body = ""
        if content:
            if isinstance(content, list):
                items = [str(c).strip() for c in content if str(c).strip()]
                if sub_sections and len(items) == 1:
                    pass
                else:
                    body += _render_term_bullets(items)
            elif isinstance(content, str):
                body += f'<p class="tc-body">{content}</p>'
        for sub in sub_sections:
            if not isinstance(sub, dict):
                continue
            sub_title = sub.get("title") or ""
            sub_items = sub.get("items") or sub.get("content") or []
            sub_bullets = _render_term_bullets(sub_items)
            if sub_title or sub_bullets:
                body += f'<div class="tc-sub">{f"<h4 class=tc-sub-title>{sub_title}</h4>" if sub_title else ""}{sub_bullets}</div>'
        if title or body:
            terms_blocks_html += f'<div class="tc-block"><h3 class="tc-title">{title}</h3>{body}</div>'

    note_text = "You'll be asked to pay the following charges at the property. Fees may include applicable taxes."
    note_items_html = '<li>A damage deposit may be collected before check-in.</li>'
    if meal_plan and "tax" not in meal_plan.lower():
        pass  # Skip injecting random items

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8" />
    <title>Hotel Voucher — {ref}</title>
    <style>
      @page {{ size: A4; margin: 18mm 16mm 18mm 16mm; }}
      * {{ box-sizing: border-box; }}
      body {{ margin: 0; padding: 0; font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11.5px; color: #1F2937; line-height: 1.5; }}

      .header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #E5E7EB; margin-bottom: 18px; }}
      .brand-logo {{ max-height: 64px; max-width: 220px; object-fit: contain; }}
      .brand-fallback {{ font-size: 22px; font-weight: 800; color: #002B5B; letter-spacing: 2px; }}
      .trip-ref {{ text-align: right; }}
      .trip-ref .label {{ font-size: 9px; uppercase; letter-spacing: 2px; color: #6B7280; text-transform: uppercase; font-weight: 700; }}
      .trip-ref .val {{ font-size: 18px; font-weight: 800; color: #002B5B; margin-top: 2px; }}

      .section-title {{ font-size: 14px; font-weight: 800; color: #002B5B; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; }}
      .section-title .count {{ font-size: 10px; font-weight: 600; color: #6B7280; background: #F3F4F6; padding: 2px 8px; border-radius: 10px; }}

      .guests-box {{ border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; }}
      .guests-box ol {{ margin: 0; padding-left: 20px; }}
      .guests-box li {{ margin-bottom: 4px; font-size: 11.5px; }}

      .nights-badge {{ background: #F3F4F6; border-radius: 6px; padding: 10px 14px; font-weight: 700; color: #002B5B; display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 14px; }}
      .nights-badge .right {{ color: #0066CC; font-size: 15px; }}

      .hotel-row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }}
      .hotel-name {{ font-size: 15px; font-weight: 800; color: #0F172A; }}
      .stars {{ color: #F59E0B; font-size: 13px; letter-spacing: 1px; margin-top: 2px; }}
      .kv {{ margin-bottom: 6px; font-size: 11px; }}
      .kv .k {{ font-weight: 700; color: #374151; }}
      .kv .v {{ color: #1F2937; }}

      .conf-box {{ background: #EAF4FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 10px 14px; font-size: 13px; font-weight: 700; color: #1E40AF; margin-bottom: 14px; display: inline-block; }}

      .rooms {{ margin-bottom: 14px; }}
      .rooms ul {{ margin: 0; padding-left: 18px; }}
      .rooms li {{ margin-bottom: 3px; }}

      .checkin-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 12px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-bottom: 14px; }}
      .checkin-grid .label {{ font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #6B7280; }}
      .checkin-grid .val {{ font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 3px; }}

      .room-row {{ background: #F9FAFB; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; font-size: 11.5px; }}
      .room-row .check {{ color: #10B981; font-weight: 800; margin-right: 6px; }}

      .cancel-box {{ margin-top: 12px; }}
      .cancel-box .label {{ font-size: 11px; font-weight: 700; color: #374151; }}
      .cancel-box .val {{ font-size: 13px; font-weight: 700; margin-top: 3px; }}

      .note-box {{ background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 16px; margin-top: 14px; font-size: 11px; color: #92400E; }}
      .note-box .label {{ font-weight: 800; color: #78350F; display: block; margin-bottom: 4px; }}
      .note-box ul {{ margin: 4px 0 0 0; padding-left: 18px; }}

      .tc-section {{ margin-top: 22px; padding-top: 16px; border-top: 2px solid #E5E7EB; }}
      .tc-title {{ font-size: 12px; font-weight: 800; color: #002B5B; margin-bottom: 6px; }}
      .tc-body {{ font-size: 10.5px; color: #4B5563; line-height: 1.6; margin: 4px 0; }}
      .term-bullets {{ font-size: 10.5px; color: #4B5563; line-height: 1.55; padding-left: 18px; margin: 4px 0 8px 0; }}
      .term-bullets li {{ margin-bottom: 4px; }}
      .tc-sub {{ margin: 6px 0 8px 0; padding-left: 10px; border-left: 2px solid #DBE3EC; }}
      .tc-sub-title {{ font-size: 11px; font-weight: 700; color: #1F2937; margin: 4px 0; }}
      .tc-block {{ margin-bottom: 10px; page-break-inside: avoid; }}
    </style>
    </head>
    <body>

    <div class="header">
      <div class="brand-block">
        {f'<img src="{_LOGO_DATA_URL}" class="brand-logo" />' if _LOGO_DATA_URL else '<div class="brand-fallback">TRAVO TOURS &amp; TRAVELS</div>'}
      </div>
      <div class="trip-ref">
        <div class="label">Trip Reference</div>
        <div class="val">{ref}</div>
      </div>
    </div>

    <div class="section-title">Guest Details <span class="count">{total_guests} Guest{'s' if total_guests != 1 else ''}</span></div>
    <div class="guests-box">
      <ol>{guests_html}</ol>
    </div>

    <div class="nights-badge">
      <span>{nights} night{'s' if nights != 1 else ''} in {city_name}</span>
      <span class="right">{nights} NIGHT{'S' if nights != 1 else ''}</span>
    </div>

    <div class="hotel-row">
      <div>
        <div class="hotel-name">{hotel.get('name', '—')}</div>
        <div class="stars">{stars_html}</div>
        <div class="kv"><span class="k">Address:</span> <span class="v">{address or '—'}</span></div>
        <div class="kv"><span class="k">Phone:</span> <span class="v">{phone or '—'}</span></div>
      </div>
      <div>
        <div class="conf-box">Confirmation No.: {confirmation_num}</div>
        <div class="rooms">
          <div class="kv"><span class="k">Room:</span></div>
          <ul>{rooms_list_html}</ul>
        </div>
        <div class="kv"><span class="k">Guests:</span> <span class="v">{total_rooms} room{'s' if total_rooms != 1 else ''}, {total_adults} adult{'s' if total_adults != 1 else ''}</span></div>
        <div class="kv"><span class="k">Number of rooms:</span> <span class="v">{total_rooms}</span></div>
      </div>
    </div>

    <div class="checkin-grid">
      <div>
        <div class="label">Check-in</div>
        <div class="val">{fmt_date(check_in_date)}, 02:00 PM</div>
      </div>
      <div>
        <div class="label">Check-out</div>
        <div class="val">{fmt_date(check_out_date)}, 12:00 PM</div>
      </div>
    </div>

    {room_breakdown_html}

    <div class="cancel-box">
      <div class="label">Cancellation Policy:</div>
      <div class="val" style="color: {cancel_policy_color};">{cancel_policy_text}</div>
    </div>

    <div class="note-box">
      <span class="label">Note:</span>
      {note_text}
      <ul>{note_items_html}</ul>
    </div>

    <div class="tc-section">
      <div class="section-title" style="font-size: 13px; margin-bottom: 12px;">Terms and Conditions</div>
      {terms_blocks_html or '<p class="tc-body">Standard terms & conditions apply. Please contact your travel advisor for details.</p>'}
    </div>

    </body>
    </html>
    """


@router.get("/bookings/{booking_id}/hotel-voucher-pdf")
async def get_hotel_voucher_pdf(
    booking_id: str,
    key: str,  # e.g. "Bangkok_0" (matches selected_hotels key)
    current_user: dict = Depends(get_current_user),
):
    booking, proposal, user, terms = await _load_booking_context(booking_id, current_user)
    # Refresh refund_deadline from the master hotels collection so the latest
    # Hotel Management edit flows into the voucher without resaving the proposal.
    selected_hotels = (proposal or {}).get("selected_hotels") or {}
    hotel = selected_hotels.get(key) or {}
    sel_room = hotel.get("selected_room") or hotel.get("selectedRoom") or {}
    fresh_refund = await _refresh_refund_deadline(hotel, sel_room) if hotel else ""
    html_content = _build_hotel_voucher_html(booking, proposal, user, terms, key, fresh_refund)
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotel voucher PDF generation failed: {e}")
    ref = _short_ref(booking)
    safe_city = key.rsplit("_", 1)[0].replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{ref}_{safe_city}_Hotel_Voucher.pdf"'},
    )


# ---------------- EMAIL (with PDF attachment) ----------------

def _send_pdf_email(to_email, subject, html_body, attachment_filename, pdf_bytes):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email")
        return None
    try:
        resend.api_key = RESEND_API_KEY
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
            "attachments": [{
                "filename": attachment_filename,
                "content": base64.b64encode(pdf_bytes).decode("utf-8"),
            }],
        }
        result = resend.Emails.send(params)
        logger.info(f"Email with {attachment_filename} sent to {to_email}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to send PDF email to {to_email}: {e}")
        return None


def _build_doc_email_html(doc_kind, customer_name, ref, company_name):
    title = "Trip Invoice" if doc_kind == "invoice" else "Travel Voucher"
    return f'''
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#002B5B;padding:28px 24px;text-align:center;">
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">{company_name}</div>
            <h1 style="color:white;font-size:22px;margin:10px 0 4px;font-weight:800;">Your {title}</h1>
            <div style="color:rgba(255,255,255,0.7);font-size:13px;">Reference: {ref}</div>
        </div>
        <div style="padding:24px;">
            <p style="font-size:14px;color:#374151;">Dear {customer_name or 'Valued Client'},</p>
            <p style="font-size:14px;color:#374151;">Please find your <strong>{title.lower()}</strong> attached as a PDF for your reference.</p>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">For any questions, just reply to this email — we're happy to help.</p>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">Best regards,<br><strong>{company_name}</strong></p>
        </div>
        <div style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            {company_name} | care@travotours.ae
        </div>
    </div>
    '''


@router.post("/bookings/{booking_id}/send-invoice")
async def send_invoice_email(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking, proposal, user, _ = await _load_booking_context(booking_id, current_user)
    to_email = booking.get("customer_email") or proposal.get("customer_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="No customer email on booking")

    html_pdf = build_invoice_html(booking, proposal, user)
    pdf_bytes = HTML(string=html_pdf).write_pdf()
    ref = _short_ref(booking)
    company = _company_block(user)
    subject = f"Trip Invoice — {ref} | {company['name']}"
    body = _build_doc_email_html("invoice", booking.get("customer_name") or proposal.get("customer_name"), ref, company["name"])
    result = _send_pdf_email(to_email, subject, body, f"Trip_Invoice_{ref}.pdf", pdf_bytes)

    if RESEND_API_KEY and result is None:
        raise HTTPException(status_code=500, detail="Failed to send invoice email")

    now = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one({"id": booking_id}, {"$set": {"last_invoice_sent_at": now}})
    await db.held_bookings.update_one({"id": booking_id}, {"$set": {"last_invoice_sent_at": now}})
    return {"status": "success", "recipient": to_email, "sent_at": now}


@router.post("/bookings/{booking_id}/send-voucher")
async def send_voucher_email(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking, proposal, user, terms = await _load_booking_context(booking_id, current_user)
    to_email = booking.get("customer_email") or proposal.get("customer_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="No customer email on booking")

    html_pdf = build_voucher_html(booking, proposal, user, terms)
    pdf_bytes = HTML(string=html_pdf).write_pdf()
    ref = _short_ref(booking)
    company = _company_block(user)
    subject = f"Travel Voucher — {ref} | {company['name']}"
    body = _build_doc_email_html("voucher", booking.get("customer_name") or proposal.get("customer_name"), ref, company["name"])
    result = _send_pdf_email(to_email, subject, body, f"{ref}_Voucher.pdf", pdf_bytes)

    if RESEND_API_KEY and result is None:
        raise HTTPException(status_code=500, detail="Failed to send voucher email")

    now = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one({"id": booking_id}, {"$set": {"last_voucher_sent_at": now}})
    await db.held_bookings.update_one({"id": booking_id}, {"$set": {"last_voucher_sent_at": now}})
    return {"status": "success", "recipient": to_email, "sent_at": now}



# ---------------- PAYMENT REMINDER (with PDF attachment) ----------------

def _build_reminder_email_html(customer_name, ref, company_name, balance_due, due_date_str, currency="AED"):
    """Customer-facing payment reminder email body — friendly tone, prominent
    Balance Due + Due Date callout, branded header bar."""
    safe_name = customer_name or "Valued Client"
    return f'''
    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:#002B5B;padding:28px 24px;text-align:center;">
            <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;">{company_name}</div>
            <h1 style="color:white;font-size:22px;margin:10px 0 4px;font-weight:800;">Payment Reminder</h1>
            <div style="color:rgba(255,255,255,0.75);font-size:13px;">Reference: {ref}</div>
        </div>
        <div style="padding:24px;">
            <p style="font-size:14px;color:#374151;">Dear {safe_name},</p>
            <p style="font-size:14px;color:#374151;line-height:1.6;">
                We hope you're looking forward to your upcoming trip! This is a friendly reminder that there is an
                outstanding balance on your booking which needs to be settled before your travel date.
            </p>
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:18px;margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:6px 0;font-size:12px;color:#991B1B;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Balance Due</td>
                        <td style="padding:6px 0;text-align:right;font-size:24px;color:#B91C1C;font-weight:800;">{currency} {balance_due:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;font-size:12px;color:#991B1B;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-top:1px solid #FECACA;">Final Payment Due</td>
                        <td style="padding:6px 0;text-align:right;font-size:16px;color:#B91C1C;font-weight:700;border-top:1px solid #FECACA;">{due_date_str or 'On request'}</td>
                    </tr>
                </table>
            </div>
            <p style="font-size:13px;color:#374151;line-height:1.6;">
                The latest <strong>Proforma Invoice</strong> is attached to this email for your records. To complete payment,
                please reply to this message or contact your travel advisor — we'll guide you through the secure payment process.
            </p>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">If payment has already been made, please ignore this reminder.</p>
            <p style="font-size:13px;color:#6b7280;margin-top:16px;">Warm regards,<br><strong>{company_name}</strong></p>
        </div>
        <div style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            {company_name} | care@travotours.ae
        </div>
    </div>
    '''


@router.post("/bookings/{booking_id}/send-payment-reminder")
async def send_payment_reminder(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Admin/Staff-only endpoint that emails the customer a friendly payment
    reminder with the latest Proforma Invoice attached.

    Refuses to send when there's no outstanding balance, no customer email,
    or when called by a non-admin/staff user.
    """
    if current_user.get("role") not in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Only admin/staff can send payment reminders")

    booking, proposal, user, _ = await _load_booking_context(booking_id, current_user)

    to_email = booking.get("customer_email") or proposal.get("customer_email")
    if not to_email:
        raise HTTPException(status_code=400, detail="No customer email on booking")

    total_amount = float(booking.get("total_price") or proposal.get("total_price") or 0)
    paid_amount = float(booking.get("payment_amount") or 0)
    payment_fee = float(booking.get("payment_fee") or 0)
    refund_amount = float(booking.get("refund_amount") or 0)
    balance_due = max(total_amount - paid_amount + payment_fee - refund_amount, 0)
    if balance_due < 0.01:
        raise HTTPException(status_code=400, detail="No outstanding balance — nothing to remind")

    # Use the explicit due date if set, else default to journey - 15 days
    final_due = booking.get("final_payment_due_date") or ""
    journey_date = booking.get("leaving_on") or proposal.get("leaving_on")
    if not final_due and journey_date:
        try:
            d = datetime.strptime(str(journey_date)[:10], "%Y-%m-%d") - timedelta(days=15)
            final_due = d.strftime("%Y-%m-%d")
        except Exception:
            final_due = ""

    html_pdf = build_invoice_html(booking, proposal, user)
    pdf_bytes = HTML(string=html_pdf).write_pdf()
    ref = _short_ref(booking)
    company = _company_block(user)
    subject = f"Payment Reminder — {ref} | Balance Due AED {balance_due:,.2f}"
    body = _build_reminder_email_html(
        booking.get("customer_name") or proposal.get("customer_name"),
        ref,
        company["name"],
        balance_due,
        fmt_date(final_due) if final_due else "",
    )
    result = _send_pdf_email(to_email, subject, body, f"Payment_Reminder_{ref}.pdf", pdf_bytes)

    if RESEND_API_KEY and result is None:
        raise HTTPException(status_code=500, detail="Failed to send payment reminder email")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "last_payment_reminder_at": now,
        "payment_reminder_count": int(booking.get("payment_reminder_count") or 0) + 1,
    }
    await db.bookings.update_one({"id": booking_id}, {"$set": update})
    await db.held_bookings.update_one({"id": booking_id}, {"$set": update})
    return {
        "status": "success",
        "recipient": to_email,
        "balance_due": round(balance_due, 2),
        "final_payment_due_date": final_due,
        "sent_at": now,
        "reminder_count": update["payment_reminder_count"],
        "email_sent": bool(result) if RESEND_API_KEY else False,
    }
