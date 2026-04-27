"""Invoice & Voucher PDF generators (WeasyPrint).
Layouts mirror the Nexus DMC reference PDFs provided by the user.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
from weasyprint import HTML

from db import db, get_current_user
from routes.pdf_generator import resolve_image, fmt_date, add_days, short_ref

router = APIRouter()


def _short_ref(pid):
    if not pid:
        return ""
    digits = "".join(ch for ch in str(pid) if ch.isdigit())
    return ("ORN" + (digits[:7] if len(digits) >= 7 else str(abs(hash(str(pid))))[:7])).upper()


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
    ref = _short_ref(booking.get("id"))
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
            meal = sel_room.get("meal_plan") or sel_room.get("mealPlan") or h.get("meal_plan") or "Room Only"
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
    ref = _short_ref(booking.get("id"))
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
            meal = sel_room.get("meal_plan") or sel_room.get("mealPlan") or h.get("meal_plan") or "Room Only"
            stars = "★" * int(h.get("star_rating") or h.get("rating") or 4)
            num_rooms = sum((r.get("rooms", 1) for r in (proposal.get("room_data") or [])), 0) or 1
            address = h.get("address") or h.get("location") or ""
            phone = h.get("phone") or ""
            confirmation = h.get("confirmation_code") or "Pending"

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

    # Terms
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
    if terms and isinstance(terms, list):
        custom_terms = [(t.get("title") or t.get("name") or "", t.get("content") or t.get("description") or "") for t in terms if t]
        custom_terms = [t for t in custom_terms if t[0] and t[1]]
        if custom_terms:
            default_terms = custom_terms

    terms_html = "".join(f"""
    <div class="term-block">
        <div class="term-title">{title}</div>
        <div class="term-body">{body}</div>
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
.term-title {{ font-size: 12px; font-weight: 800; color: #002B5B; margin-bottom: 4px; }}
.term-body {{ font-size: 10.5px; color: #4B5563; line-height: 1.6; }}
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
    terms = await db.terms_policies.find({}, {"_id": 0}).to_list(50)
    return booking, proposal, user, terms


@router.get("/bookings/{booking_id}/invoice-pdf")
async def get_invoice_pdf(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking, proposal, user, _ = await _load_booking_context(booking_id, current_user)
    html_content = build_invoice_html(booking, proposal, user)
    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice PDF generation failed: {e}")
    ref = _short_ref(booking.get("id"))
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
    ref = _short_ref(booking.get("id"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{ref}_Voucher.pdf"'},
    )
