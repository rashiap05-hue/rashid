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
    pnr = booking.get("confirmation_pnr") or booking.get("order_id") or ""
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

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@page {{ size: A4; margin: 18mm 16mm; }}
body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1f2937; line-height: 1.5; margin: 0; }}
.header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #002B5B; margin-bottom: 22px; }}
.brand {{ font-size: 24px; font-weight: 800; color: #002B5B; letter-spacing: 2px; }}
.brand-tag {{ font-size: 9px; letter-spacing: 4px; color: #6B7280; text-transform: uppercase; margin-top: 2px; }}
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
.footer {{ margin-top: 28px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 9.5px; color: #6B7280; line-height: 1.7; }}
</style></head><body>

<div class="header">
    <div>
        <div class="brand">{company['name'].upper()}</div>
        <div class="brand-tag">Travel & Tourism</div>
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
        <div class="txn-row"><span class="l">Final Payment Due:</span><span class="v">{fmt_date(final_due) if final_due else '—'}</span></div>
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
    <div class="totals-row grand"><span>Balance Due</span><span>{_format_money(max(total_amount - paid_amount + payment_fee - refund_amount, 0))}</span></div>
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
    <div class="brand-circle">{company['name'][:1]}</div>
    <div class="brand-text">
        <div class="name">{company['name'].upper()}</div>
        <div class="tag">Travel & Tourism</div>
    </div>
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
