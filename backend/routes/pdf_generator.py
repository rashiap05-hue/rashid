from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
from pathlib import Path
import re
from weasyprint import HTML

from db import db, get_current_user

router = APIRouter()

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"


# ---------------- helpers ----------------

def resolve_image(url: str) -> str:
    """Convert stale preview domain URLs pointing to /api/static/... or /uploads/... into
    local file:// URIs so WeasyPrint can embed them. External URLs (https) are returned as-is."""
    if not url:
        return ""
    m = re.search(r"/(?:api/static|uploads)/([^?#]+)", str(url))
    if m:
        local = UPLOADS_DIR / m.group(1)
        if local.exists():
            return f"file://{local}"
        return ""  # don't return broken stale URL
    return url


def fmt_date(d, with_weekday=False):
    if not d:
        return ""
    try:
        dt = datetime.fromisoformat(str(d).replace("Z", "+00:00")) if "T" in str(d) else datetime.strptime(str(d)[:10], "%Y-%m-%d")
        return dt.strftime("%a, %d %b %Y") if with_weekday else dt.strftime("%d %b %Y")
    except Exception:
        return str(d)


def add_days(date_str, days):
    try:
        dt = datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
        return (dt + timedelta(days=days)).strftime("%Y-%m-%d")
    except Exception:
        return date_str


def get_hotel(proposal, city_name, city_idx):
    sh = proposal.get("selected_hotels", {}) or {}
    return sh.get(f"{city_name}_{city_idx}") or sh.get(city_name) or {}


def hotel_image(hotel):
    if not hotel:
        return ""
    imgs = hotel.get("images") or []
    candidate = ""
    if imgs and isinstance(imgs, list):
        candidate = imgs[0]
    if not candidate:
        candidate = hotel.get("image") or ""
    return resolve_image(candidate)


def activity_image(activity):
    if not activity:
        return ""
    imgs = activity.get("images") or []
    candidate = ""
    if imgs and isinstance(imgs, list):
        candidate = imgs[0]
    if not candidate:
        candidate = activity.get("image") or ""
    return resolve_image(candidate)


def short_ref(pid):
    if not pid:
        return ""
    # Numeric-style reference like "8362858" (7 digits)
    digits = "".join(ch for ch in str(pid) if ch.isdigit())
    if len(digits) >= 7:
        return digits[:7]
    # fallback: hash-like 7 digits
    return str(abs(hash(str(pid))))[:7]


def cities_summary(cities):
    parts = []
    for c in cities:
        name = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        parts.append(f"{name} {nights}N")
    return ", ".join(parts)


# ---------------- itinerary builder ----------------

def build_day_plan(proposal):
    """Return a flat list of days, each with date + items (hotel/activities/transfers)."""
    cities = proposal.get("cities", []) or []
    leaving_on = proposal.get("leaving_on", "")
    selected_hotels = proposal.get("selected_hotels", {}) or {}
    selected_activities = proposal.get("selected_activities", {}) or {}
    inter_city = proposal.get("inter_city_transfers", {}) or {}
    arrival_transfer = proposal.get("arrival_transfer") or {}
    departure_transfer = proposal.get("departure_transfer") or {}

    days = []
    day_num = 0
    for ci, c in enumerate(cities):
        city_name = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        hotel = selected_hotels.get(f"{city_name}_{ci}") or {}

        for night in range(nights):
            day_num += 1
            day_date = add_days(leaving_on, day_num - 1)
            items = []

            # Arrival transfer on first day
            if ci == 0 and night == 0 and arrival_transfer:
                items.append({"type": "transfer", "data": arrival_transfer, "label": "Arrival Transfer"})

            # Inter-city transfer when entering a new city (after day 1)
            if night == 0 and ci > 0:
                t = inter_city.get(f"{ci-1}_{ci}") or {}
                if t:
                    items.append({"type": "transfer", "data": t, "label": "Inter-city Transfer"})

            # Hotel check-in card on first night
            if night == 0 and hotel:
                items.append({"type": "hotel", "data": hotel, "city": city_name, "nights": nights, "checkin": day_date,
                              "checkout": add_days(day_date, nights)})

            # Activities for the day (selected_activities key is `<City>_<dayNum>`)
            acts = selected_activities.get(f"{city_name}_{day_num}", [])
            if not isinstance(acts, list):
                acts = [acts] if acts else []
            for a in acts:
                if a:
                    items.append({"type": "activity", "data": a})

            # Departure transfer on the very last day
            is_last_day = (ci == len(cities) - 1) and (night == nights - 1)
            if is_last_day and departure_transfer:
                items.append({"type": "transfer", "data": departure_transfer, "label": "Departure Transfer"})

            days.append({
                "num": day_num,
                "date": day_date,
                "city": city_name,
                "items": items,
            })

    return days


# ---------------- HTML sections ----------------

def section_overview_table(days):
    rows = ""
    for d in days:
        for it in d["items"]:
            data = it["data"] or {}
            if it["type"] == "hotel":
                name = data.get("name", "")
                rating = data.get("star_rating", data.get("rating", ""))
                stars = "★" * int(rating) if rating and str(rating).isdigit() else ""
                desc = f"{stars} {name} • Check-in {fmt_date(it['checkin'])} • {it['nights']} night{'s' if it['nights']>1 else ''}"
                product = "Hotel"
                icon = "🏨"
            elif it["type"] == "activity":
                product = "Activity"
                icon = "📷"
                desc = data.get("name", "") or data.get("title", "")
                if data.get("duration"):
                    desc += f" • {data['duration']}"
            else:
                product = "Transfer"
                icon = "🚗"
                title = data.get("title") or data.get("name", "")
                desc = title
                if data.get("from_location") and data.get("to_location"):
                    desc = f"{data['from_location']} → {data['to_location']}"
            rows += f"""
            <tr>
                <td class="ov-date">{fmt_date(d['date'])}</td>
                <td class="ov-product"><span class="ov-icon">{icon}</span>{product}</td>
                <td class="ov-desc">{desc}</td>
            </tr>
            """
    return f"""
    <section class="overview-section page-break-before">
        <h2 class="section-title">Itinerary Overview</h2>
        <table class="overview-table">
            <thead>
                <tr><th>Date</th><th>Product</th><th>Description</th></tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    </section>
    """


def section_hotel_card(hotel, city, checkin, checkout, nights):
    if not hotel:
        return ""
    name = hotel.get("name", "")
    rating = hotel.get("star_rating", hotel.get("rating", ""))
    stars_html = ""
    if rating and str(rating).replace(".", "", 1).isdigit():
        stars_html = '<span class="hot-stars">' + ("★" * int(float(rating))) + '</span>'
    address = hotel.get("address", "") or hotel.get("location", "")
    img = hotel_image(hotel)
    desc = (hotel.get("description") or "").strip()[:600]
    sel_room = hotel.get("selected_room") or hotel.get("selectedRoom") or {}
    room_name = sel_room.get("name", "Standard Room")
    meal_plan = sel_room.get("meal_plan") or sel_room.get("mealPlan") or hotel.get("meal_plan", "Room Only")

    amenities = hotel.get("amenities") or []
    if isinstance(amenities, str):
        amenities = [a.strip() for a in re.split(r"[,•|;]", amenities) if a.strip()]
    elif isinstance(amenities, list):
        flat = []
        for a in amenities:
            if isinstance(a, str):
                parts = [p.strip() for p in re.split(r"[,•|;]", a) if p.strip()]
                flat.extend(parts if parts else [a])
            else:
                flat.append(a)
        # If we still have a single weird concatenated string of >4 words and no separators were found, fall back
        if len(flat) == 1 and isinstance(flat[0], str) and len(flat[0].split()) >= 4:
            flat = []
        amenities = flat
    if not amenities:
        amenities = [
            "Free Wi-Fi in all rooms",
            "24-hour front desk",
            "Air conditioning",
            "Daily housekeeping",
            "Restaurant on-site",
            "Concierge service",
        ]
    amen_left = amenities[: (len(amenities) + 1) // 2]
    amen_right = amenities[(len(amenities) + 1) // 2 :]

    img_html = f'<img src="{img}" alt="{name}" class="hot-img" />' if img else '<div class="hot-img-placeholder"></div>'

    return f"""
    <section class="hotel-section page-break-before">
        <div class="hotel-header">
            <div>
                <div class="hot-eyebrow">{city} • {nights} night{'s' if nights>1 else ''}</div>
                <h2 class="hot-name">{name} {stars_html}</h2>
                <div class="hot-address">{address}</div>
            </div>
            <div class="hot-dates">
                <div><span class="lbl">Check-in</span><span class="val">{fmt_date(checkin)}</span></div>
                <div><span class="lbl">Check-out</span><span class="val">{fmt_date(checkout)}</span></div>
            </div>
        </div>

        <div class="hotel-body">
            {img_html}
            <div class="hot-info">
                <div class="hot-info-title">What to know about this hotel</div>
                <div class="hot-amenities">
                    <ul>{''.join(f'<li>{a}</li>' for a in amen_left)}</ul>
                    <ul>{''.join(f'<li>{a}</li>' for a in amen_right)}</ul>
                </div>
                {f'<p class="hot-desc">{desc}</p>' if desc else ''}
            </div>
        </div>

        <div class="hot-room-card">
            <div class="hot-room-row">
                <div><span class="lbl">Room Type</span><span class="val">{room_name}</span></div>
                <div><span class="lbl">Meal Plan</span><span class="val">{meal_plan}</span></div>
                <div><span class="lbl">Confirmation</span><span class="val pending">Pending</span></div>
            </div>
        </div>
    </section>
    """


def render_item(it):
    data = it["data"] or {}
    if it["type"] == "hotel":
        name = data.get("name", "")
        rating = data.get("star_rating", data.get("rating", ""))
        stars = "★" * int(rating) if rating and str(rating).isdigit() else ""
        sel_room = data.get("selected_room") or data.get("selectedRoom") or {}
        room = sel_room.get("name", "Standard Room")
        meal = sel_room.get("meal_plan") or sel_room.get("mealPlan") or "Room Only"
        return f"""
        <div class="day-item">
            <div class="day-icon hotel-icon">🏨</div>
            <div class="day-content">
                <div class="day-item-title">{name} <span class="stars">{stars}</span></div>
                <div class="day-item-meta">{room} • {meal}</div>
                <div class="day-tags"><span class="tag tag-blue">Stay</span></div>
            </div>
        </div>
        """
    if it["type"] == "transfer":
        title = data.get("title") or data.get("name", "")
        ttype = data.get("transfer_type") or data.get("type") or "Private"
        duration = data.get("duration", "")
        from_loc = data.get("from_location", "")
        to_loc = data.get("to_location", "")
        route = f"{from_loc} → {to_loc}" if (from_loc and to_loc) else ""
        is_private = "private" in str(ttype).lower()
        tag_class = "tag-green" if is_private else "tag-amber"
        tag_label = "Private Transfer" if is_private else "Shared Transfer"
        return f"""
        <div class="day-item">
            <div class="day-icon transfer-icon">🚗</div>
            <div class="day-content">
                <div class="day-item-title">{title}</div>
                {f'<div class="day-item-meta">{route}</div>' if route else ''}
                {f'<div class="day-item-meta">Duration: {duration}</div>' if duration else ''}
                <div class="day-tags"><span class="tag {tag_class}">{tag_label}</span></div>
            </div>
        </div>
        """
    # activity
    name = data.get("name", "") or data.get("title", "")
    duration = data.get("duration", "")
    desc = (data.get("description") or "").strip()
    highlights = data.get("highlights") or []
    if isinstance(highlights, str):
        highlights = [h.strip() for h in highlights.split(",") if h.strip()]
    inclusions = data.get("inclusions") or []
    if isinstance(inclusions, str):
        inclusions = [i.strip() for i in inclusions.split(",") if i.strip()]
    meeting_point = data.get("meeting_point") or data.get("meetingPoint") or ""
    start_times = data.get("start_times") or []
    if isinstance(start_times, list):
        start_times = ", ".join(start_times)
    img_url = activity_image(data)

    has_meal = bool(data.get("meal_included") or data.get("includes_meal") or any("lunch" in str(i).lower() or "meal" in str(i).lower() or "breakfast" in str(i).lower() for i in inclusions))
    has_ticket = bool(data.get("ticket_included") or data.get("includes_ticket") or any("ticket" in str(i).lower() or "entrance" in str(i).lower() for i in inclusions))
    has_transfer = bool(any("transfer" in str(i).lower() or "transport" in str(i).lower() or "pickup" in str(i).lower() for i in inclusions))
    tags = ['<span class="tag tag-violet">Activity</span>']
    if has_transfer:
        tags.append('<span class="tag tag-green">Private Transfer</span>')
    if has_meal:
        tags.append('<span class="tag tag-amber">Meal Included</span>')
    if has_ticket:
        tags.append('<span class="tag tag-blue">Ticket</span>')

    img_html = f'<img src="{img_url}" alt="{name}" class="act-thumb" />' if img_url else ''

    highlights_html = ''
    if highlights:
        items = ''.join(f'<li>{h}</li>' for h in highlights[:6])
        highlights_html = f'<div class="act-extra"><div class="act-extra-title">Highlights</div><ul class="act-bullets">{items}</ul></div>'

    inclusions_html = ''
    if inclusions:
        items = ''.join(f'<li>{i}</li>' for i in inclusions[:6])
        inclusions_html = f'<div class="act-extra"><div class="act-extra-title">Inclusions</div><ul class="act-bullets">{items}</ul></div>'

    meta_lines = []
    if duration:
        meta_lines.append(f'<div class="day-item-meta"><strong>Duration:</strong> {duration}</div>')
    if start_times:
        meta_lines.append(f'<div class="day-item-meta"><strong>Start times:</strong> {start_times}</div>')
    if meeting_point:
        meta_lines.append(f'<div class="day-item-meta"><strong>Meeting point:</strong> {meeting_point}</div>')

    return f"""
    <div class="day-item activity-row">
        {img_html if img_html else '<div class="day-icon activity-icon">📷</div>'}
        <div class="day-content">
            <div class="day-item-title">{name}</div>
            {''.join(meta_lines)}
            {f'<div class="day-item-desc">{desc}</div>' if desc else ''}
            <div class="act-extras-row">
                {highlights_html}
                {inclusions_html}
            </div>
            <div class="day-tags">{''.join(tags)}</div>
        </div>
    </div>
    """


def section_day_wise(days):
    cards = ""
    for d in days:
        if not d["items"]:
            continue
        items_html = "".join(render_item(it) for it in d["items"])
        cards += f"""
        <div class="day-card">
            <div class="day-header">
                <div class="day-num">Day {d['num']}</div>
                <div class="day-meta">
                    <div class="day-date">{fmt_date(d['date'], with_weekday=True)}</div>
                    <div class="day-city">{d['city']}</div>
                </div>
            </div>
            <div class="day-body">{items_html}</div>
        </div>
        """
    return f"""
    <section class="day-wise-section page-break-before">
        <h2 class="section-title">Day-wise Itinerary</h2>
        {cards}
    </section>
    """


def section_pricing(proposal, total_pax):
    pricing = proposal.get("pricing_breakdown", {}) or {}
    total_price = pricing.get("total") or proposal.get("total_price", 0) or 0
    markup = float(proposal.get("markup_land", proposal.get("markup_value", 0)) or 0)
    discount = float(proposal.get("discount_amount", 0) or 0)
    insurance = float(proposal.get("travel_insurance_price", 0) or 0)
    grand_total = float(total_price) + markup - min(discount, markup) + insurance
    per_adult = grand_total / max(total_pax, 1)

    return f"""
    <section class="pricing-section page-break-before">
        <h2 class="section-title">Pricing Summary</h2>
        <table class="pricing-table">
            <tr>
                <td class="lbl">Price per adult</td>
                <td class="val">AED {per_adult:,.2f}</td>
            </tr>
            <tr class="total-row">
                <td class="lbl">Total Price</td>
                <td class="val">AED {grand_total:,.2f}</td>
            </tr>
        </table>
        <p class="price-note">All prices are inclusive of taxes. Pricing is calculated as on {datetime.now(timezone.utc).strftime('%d %b %Y')} and subject to availability at time of confirmation.</p>
    </section>
    """


def section_inclusions_exclusions(proposal):
    inclusions = []
    if proposal.get("arrival_transfer"):
        inclusions.append("Airport arrival transfer")
    if proposal.get("departure_transfer"):
        inclusions.append("Airport departure transfer")
    inter = proposal.get("inter_city_transfers", {}) or {}
    if inter:
        inclusions.append("Inter-city transfers as per itinerary")
    if proposal.get("selected_activities"):
        inclusions.append("Sightseeing & activities as per itinerary")
    if proposal.get("selected_hotels"):
        inclusions.append("Hotel accommodation as per itinerary")
    if proposal.get("travel_insurance"):
        inclusions.append("Travel insurance")
    inclusions.append("Daily breakfast (where mentioned)")
    inclusions.append("All applicable government taxes")

    exclusions = [
        "International airfare unless specifically mentioned",
        "Visa fees and travel insurance (unless specified)",
        "Meals not mentioned in the itinerary",
        "Personal expenses (laundry, telephone, mini-bar, etc.)",
        "Tips and gratuities to drivers and guides",
        "Anything not mentioned under inclusions",
        "Any additional optional tours or upgrades",
    ]

    inc_html = "".join(f"<li>{i}</li>" for i in inclusions)
    exc_html = "".join(f"<li>{e}</li>" for e in exclusions)
    return f"""
    <section class="inclusions-section page-break-before">
        <h2 class="section-title">Inclusions & Exclusions</h2>
        <div class="two-col">
            <div class="col">
                <h3 class="sub-title green">✓ Inclusions</h3>
                <ul class="bullet-list">{inc_html}</ul>
            </div>
            <div class="col">
                <h3 class="sub-title red">✗ Exclusions</h3>
                <ul class="bullet-list">{exc_html}</ul>
            </div>
        </div>
    </section>
    """


def section_terms(terms):
    if not terms:
        return ""
    blocks = ""
    for t in terms:
        if not isinstance(t, dict):
            continue
        title = t.get("title") or t.get("name") or ""
        content = t.get("content") or t.get("description") or ""
        if not content:
            continue
        blocks += f"""
        <div class="term-block">
            <h3 class="term-title">{title}</h3>
            <div class="term-body">{content}</div>
        </div>
        """
    return f"""
    <section class="terms-section page-break-before">
        <h2 class="section-title">Terms &amp; Conditions</h2>
        {blocks}
    </section>
    """


def section_prepared(customer_name, prepared_by, company, phone, email, cover_image):
    """Page 2: 'Specially prepared for / by' page with image strip on left."""
    img_style = f"background-image: url('{cover_image}');" if cover_image else "background: #002B5B;"
    phone_row = f"""
        <div class="contact-row">
            <span class="contact-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#002B5B"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            </span>
            <span class="contact-text">{phone}</span>
        </div>
    """ if phone else ""
    email_row = f"""
        <div class="contact-row">
            <span class="contact-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#002B5B"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </span>
            <span class="contact-text">{email}</span>
        </div>
    """ if email else ""

    return f"""
    <section class="prepared-page">
        <div class="prepared-strip" style="{img_style}"></div>
        <div class="prepared-content">
            <h2 class="prepared-heading">Specially prepared for</h2>
            <div class="prepared-name">{customer_name}</div>

            <h2 class="prepared-heading prepared-heading-by">Specially prepared by</h2>
            <div class="prepared-by">{prepared_by.upper()}</div>
            <div class="prepared-at">at <u>{company.upper()}</u></div>

            <div class="contacts">
                {phone_row}
                {email_row}
            </div>

            <div class="prepared-footer">
                <p>This itinerary is a preliminary proposal. Please review it carefully and inform us of any changes or discrepancies.</p>
                <p>Currently, no services are being held and all services and prices are subject to availability and potential currency fluctuations. A deposit for a booking constitutes Customer's acceptance of these Terms &amp; Conditions. Please review land deposit and air payment conditions. Please note that paying the deposit does not guarantee confirmation. Services remain On Request at the time of booking, and if the original services are unavailable, alternatives may be offered with potential price adjustments.</p>
            </div>
        </div>
    </section>
    """


# ---------------- main HTML builder ----------------

def build_pdf_html(proposal, terms, expert, user):
    customer_name = proposal.get("customer_name", "Valued Client")
    cities = proposal.get("cities", []) or []
    city_summary = cities_summary(cities)
    leaving_on = proposal.get("leaving_on", "")
    total_nights = sum((c.get("nights", 1) if isinstance(c, dict) else 1) for c in cities) or 1
    total_days = total_nights + 1
    proposal_name = proposal.get("proposal_name") or f"{customer_name}'s Trip to {(cities[0].get('name') if cities and isinstance(cities[0], dict) else cities[0]) if cities else ''}"
    adults = sum((r.get("adults", 0) for r in (proposal.get("room_data") or []))) or proposal.get("adults", 1) or 1
    rooms_count = len(proposal.get("room_data") or []) or proposal.get("rooms", 1) or 1
    prepared_by = (user or {}).get("full_name") or (user or {}).get("name") or "Travel Advisor"
    company = (user or {}).get("company_name") or "Travo Tours & Travels"

    # Cover image: prefer a destination/scenic photo of the FIRST city.
    # Priority: 1) first activity image of first city  2) first hotel image  3) Unsplash by city name
    cover_image = ""
    first_city_name = (cities[0].get("name") if isinstance(cities[0], dict) else cities[0]) if cities else ""

    # 1) Look for activity images in the first city
    sel_acts = proposal.get("selected_activities", {}) or {}
    for key, val in sel_acts.items():
        if not key.startswith(f"{first_city_name}_"):
            continue
        items = val if isinstance(val, list) else [val]
        for a in items:
            if a:
                img = activity_image(a)
                if img:
                    cover_image = img
                    break
        if cover_image:
            break

    # 2) Fall back to first hotel image
    if not cover_image:
        for ci, c in enumerate(cities):
            cname = c.get("name") if isinstance(c, dict) else c
            h = get_hotel(proposal, cname, ci)
            img = hotel_image(h)
            if img:
                cover_image = img
                break

    # 3) Fall back to a city-specific destination photo
    if not cover_image and first_city_name:
        cover_image = f"https://source.unsplash.com/1600x900/?{first_city_name.replace(' ', '+')},city,landmark"

    days = build_day_plan(proposal)

    overview_html = section_overview_table(days)
    day_wise_html = section_day_wise(days)
    pricing_html = section_pricing(proposal, adults)
    inclusions_html = section_inclusions_exclusions(proposal)
    terms_html = section_terms(terms)

    # Hotel detail sections (one per city)
    hotels_html = ""
    day_cursor = 0
    for ci, c in enumerate(cities):
        cname = c.get("name") if isinstance(c, dict) else c
        nights = c.get("nights", 1) if isinstance(c, dict) else 1
        hotel = get_hotel(proposal, cname, ci)
        if hotel:
            checkin = add_days(leaving_on, day_cursor)
            checkout = add_days(checkin, nights)
            hotels_html += section_hotel_card(hotel, cname, checkin, checkout, nights)
        day_cursor += nights

    # "Specially prepared for / by" page (page 2)
    advisor_phone = (user or {}).get("phone") or (expert or {}).get("phone") or ""
    advisor_email = (user or {}).get("email") or (expert or {}).get("email") or ""
    advisor_name = (expert or {}).get("name") or prepared_by
    prepared_html = section_prepared(customer_name, advisor_name, company, advisor_phone, advisor_email, cover_image)

    cover_bg = (
        f"background-image: linear-gradient(rgba(0,30,70,0.55), rgba(0,30,70,0.85)), url('{cover_image}');"
        if cover_image
        else "background: linear-gradient(135deg, #001E46 0%, #003A7D 60%, #0066CC 100%);"
    )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {{ size: A4; margin: 15mm; }}
  @page :first {{ margin: 0; }}

  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; line-height: 1.45; font-size: 11px; }}
  h1, h2, h3 {{ margin: 0; }}
  ul {{ margin: 0; padding-left: 16px; }}
  li {{ margin-bottom: 3px; }}

  .page-break-before {{ page-break-before: always; }}

  /* ---- Cover ---- */
  .cover {{
    {cover_bg}
    background-size: cover; background-position: center;
    color: #fff;
    width: 100%; min-height: 297mm; padding: 30mm 22mm 30mm 22mm; display: flex; flex-direction: column;
    page-break-after: always; position: relative;
  }}
  .cover h1 {{ font-family: Georgia, 'Times New Roman', serif; font-size: 60px; font-weight: 700; line-height: 1.05; max-width: 88%; text-shadow: 0 2px 12px rgba(0,0,0,0.35); }}
  .cover .ref-line-text {{ font-family: Georgia, serif; font-size: 22px; font-weight: 400; margin-top: 14mm; }}
  .cover .ref-line-text .ref-num {{ font-weight: 700; }}
  .cover .divider {{ border: none; border-top: 1px solid rgba(255,255,255,0.85); margin: 12mm 0 14mm 0; }}
  .cover .info-list {{ display: flex; flex-direction: column; gap: 10mm; }}
  .cover .info-row {{ display: flex; align-items: center; gap: 8mm; font-size: 24px; font-weight: 500; text-shadow: 0 1px 6px rgba(0,0,0,0.4); }}
  .cover .info-row svg {{ flex-shrink: 0; }}

  /* ---- Section header ---- */
  .section-title {{ color: #002B5B; font-size: 18px; font-weight: 800; padding-bottom: 8px; border-bottom: 2px solid #002B5B; margin-bottom: 14px; }}
  .sub-title {{ font-size: 13px; font-weight: 700; margin-bottom: 8px; }}
  .sub-title.green {{ color: #047857; }}
  .sub-title.red {{ color: #B91C1C; }}

  /* ---- Specially Prepared Page ---- */
  .prepared-page {{ display: flex; min-height: 250mm; width: 100%; page-break-before: always; margin: -15mm; }}
  .prepared-strip {{
    width: 30%;
    background-size: cover;
    background-position: center;
    background-color: #002B5B;
    position: relative;
  }}
  .prepared-strip::before {{
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,30,70,0.85) 0%, rgba(0,30,70,0.55) 35%, rgba(0,30,70,0.0) 70%);
  }}
  .prepared-content {{ width: 70%; padding: 30mm 18mm; display: flex; flex-direction: column; }}
  .prepared-heading {{ font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; color: #0E1B3D; margin-bottom: 8mm; }}
  .prepared-heading-by {{ margin-top: 14mm; }}
  .prepared-name {{ font-size: 18px; font-weight: 700; color: #111827; }}
  .prepared-by {{ font-size: 16px; font-weight: 800; color: #111827; letter-spacing: 0.5px; }}
  .prepared-at {{ font-size: 14px; color: #111827; margin-top: 4px; }}
  .prepared-at u {{ font-weight: 800; }}

  .contacts {{ margin-top: 8mm; display: flex; flex-direction: column; gap: 4mm; }}
  .contact-row {{ display: flex; align-items: center; gap: 10px; font-size: 13px; color: #111827; }}
  .contact-icon {{ width: 28px; height: 28px; border-radius: 50%; background: #DBE3EC; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }}
  .contact-text {{ font-weight: 600; }}

  .prepared-footer {{ margin-top: 30mm; font-size: 9.5px; color: #6B7280; line-height: 1.6; }}
  .prepared-footer p {{ margin: 0 0 6px 0; }}

  /* ---- Overview Table ---- */
  .overview-table {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
  .overview-table th {{ background: #002B5B; color: #fff; text-align: left; padding: 10px 12px; font-weight: 700; }}
  .overview-table td {{ padding: 10px 12px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }}
  .ov-date {{ width: 22%; font-weight: 600; color: #002B5B; white-space: nowrap; }}
  .ov-product {{ width: 16%; color: #4B5563; }}
  .ov-icon {{ margin-right: 6px; }}
  .ov-desc {{ color: #1f2937; }}

  /* ---- Hotel Section ---- */
  .hotel-header {{ display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid #E5E7EB; margin-bottom: 14px; }}
  .hot-eyebrow {{ font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #6B7280; margin-bottom: 4px; }}
  .hot-name {{ font-size: 22px; font-weight: 800; color: #111827; }}
  .hot-stars {{ color: #F59E0B; font-size: 16px; margin-left: 6px; letter-spacing: 1px; }}
  .hot-address {{ font-size: 11px; color: #6B7280; margin-top: 4px; }}
  .hot-dates {{ display: flex; gap: 14px; }}
  .hot-dates > div {{ background: #F3F4F6; border-radius: 6px; padding: 8px 12px; min-width: 100px; }}
  .hot-dates .lbl {{ display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; }}
  .hot-dates .val {{ display: block; font-size: 12px; font-weight: 700; color: #111827; margin-top: 2px; }}

  .hotel-body {{ display: flex; gap: 16px; margin-bottom: 14px; }}
  .hot-img {{ width: 45%; height: 180px; object-fit: cover; border-radius: 8px; }}
  .hot-img-placeholder {{ width: 45%; height: 180px; background: #E5E7EB; border-radius: 8px; }}
  .hot-info {{ flex: 1; }}
  .hot-info-title {{ font-size: 13px; font-weight: 700; color: #002B5B; margin-bottom: 8px; }}
  .hot-amenities {{ display: flex; gap: 18px; }}
  .hot-amenities ul {{ flex: 1; padding-left: 14px; font-size: 11px; }}
  .hot-amenities li {{ margin-bottom: 4px; }}
  .hot-desc {{ margin-top: 10px; font-size: 11px; color: #4B5563; line-height: 1.5; }}

  .hot-room-card {{ background: #F0F4F8; border: 1px solid #DBE3EC; border-radius: 8px; padding: 12px 16px; }}
  .hot-room-row {{ display: flex; justify-content: space-between; gap: 12px; }}
  .hot-room-row > div {{ flex: 1; }}
  .hot-room-row .lbl {{ display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; }}
  .hot-room-row .val {{ display: block; font-size: 12px; font-weight: 700; color: #111827; margin-top: 2px; }}
  .hot-room-row .val.pending {{ color: #B45309; }}

  /* ---- Day-wise ---- */
  .day-card {{ border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 14px; overflow: hidden; page-break-inside: avoid; }}
  .day-header {{ background: #002B5B; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }}
  .day-num {{ font-size: 14px; font-weight: 800; letter-spacing: 1px; }}
  .day-meta {{ text-align: right; }}
  .day-date {{ font-size: 11px; opacity: 0.9; }}
  .day-city {{ font-size: 13px; font-weight: 700; }}
  .day-body {{ padding: 4px 16px; }}
  .day-item {{ display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }}
  .day-item:last-child {{ border-bottom: none; }}
  .day-icon {{ width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }}
  .hotel-icon {{ background: #EEF2FF; color: #3730A3; }}
  .transfer-icon {{ background: #DBEAFE; color: #1E40AF; }}
  .activity-icon {{ background: #FCE7F3; color: #9D174D; }}
  .day-content {{ flex: 1; }}
  .day-item-title {{ font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px; }}
  .day-item-title .stars {{ color: #F59E0B; font-size: 12px; margin-left: 4px; }}
  .day-item-meta {{ font-size: 10px; color: #6B7280; margin-bottom: 2px; }}
  .day-item-meta strong {{ color: #374151; }}
  .day-item-desc {{ font-size: 10px; color: #4B5563; margin-top: 4px; line-height: 1.55; }}

  .activity-row {{ align-items: flex-start; }}
  .act-thumb {{ width: 130px; height: 110px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }}
  .act-extras-row {{ display: flex; gap: 18px; margin-top: 8px; }}
  .act-extra {{ flex: 1; background: #F9FAFB; border-left: 3px solid #002B5B; padding: 8px 10px; border-radius: 4px; }}
  .act-extra-title {{ font-size: 10px; font-weight: 700; color: #002B5B; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
  .act-bullets {{ font-size: 10px; color: #374151; padding-left: 14px; margin: 0; }}
  .act-bullets li {{ margin-bottom: 2px; }}

  .day-tags {{ margin-top: 6px; }}
  .tag {{ display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; margin-right: 4px; text-transform: uppercase; }}
  .tag-blue {{ background: #DBEAFE; color: #1E40AF; }}
  .tag-green {{ background: #D1FAE5; color: #065F46; }}
  .tag-amber {{ background: #FEF3C7; color: #92400E; }}
  .tag-violet {{ background: #EDE9FE; color: #5B21B6; }}

  /* ---- Pricing ---- */
  .pricing-table {{ width: 100%; border-collapse: collapse; margin-top: 8px; }}
  .pricing-table td {{ padding: 12px 16px; border-bottom: 1px solid #E5E7EB; }}
  .pricing-table .lbl {{ font-size: 13px; font-weight: 600; color: #4B5563; }}
  .pricing-table .val {{ text-align: right; font-size: 14px; font-weight: 700; color: #111827; white-space: nowrap; }}
  .pricing-table .total-row .lbl {{ color: #002B5B; font-size: 15px; font-weight: 800; }}
  .pricing-table .total-row .val {{ color: #002B5B; font-size: 18px; }}
  .price-note {{ margin-top: 10px; font-size: 10px; color: #6B7280; font-style: italic; }}

  /* ---- Inclusions ---- */
  .two-col {{ display: flex; gap: 24px; }}
  .col {{ flex: 1; }}
  .bullet-list {{ font-size: 11px; color: #374151; padding-left: 16px; }}
  .bullet-list li {{ margin-bottom: 5px; line-height: 1.5; }}

  /* ---- Terms ---- */
  .term-block {{ margin-bottom: 14px; page-break-inside: avoid; }}
  .term-title {{ font-size: 12px; font-weight: 700; color: #002B5B; margin-bottom: 4px; }}
  .term-body {{ font-size: 10px; color: #4B5563; line-height: 1.6; }}

  /* ---- Expert ---- */
  .expert-card {{ background: #F0F4F8; border-left: 4px solid #002B5B; border-radius: 4px; padding: 14px 16px; margin-bottom: 16px; }}
  .expert-eyebrow {{ font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #6B7280; }}
  .expert-name {{ font-size: 14px; font-weight: 700; color: #002B5B; margin-top: 4px; }}
  .expert-meta {{ font-size: 11px; color: #4B5563; margin-top: 2px; }}

  /* ---- Inner Header ---- */
  .inner-header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #E5E7EB; margin-bottom: 16px; }}
  .inner-header .left {{ font-size: 11px; color: #6B7280; }}
  .inner-header .right {{ font-size: 10px; color: #9CA3AF; }}

  .footer-line {{ margin-top: 30px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 9px; color: #9CA3AF; }}
</style>
</head>
<body>

<!-- ============== COVER PAGE ============== -->
<div class="cover">
  <h1>{proposal_name}</h1>
  <div class="ref-line-text">Reference Number: <span class="ref-num">{short_ref(proposal.get('id'))}</span></div>
  <hr class="divider" />
  <div class="info-list">
    <div class="info-row">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>{city_summary}</span>
    </div>
    <div class="info-row">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>{fmt_date(leaving_on)} - {total_nights} nights/{total_days} days</span>
    </div>
    <div class="info-row">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>{rooms_count} room{'s' if rooms_count!=1 else ''}, {adults} adult{'s' if adults!=1 else ''}</span>
    </div>
  </div>
</div>

<!-- ============== INNER PAGES ============== -->
{prepared_html}

<div class="inner-header">
  <div class="left">{proposal_name}</div>
  <div class="right">{short_ref(proposal.get('id'))} • {fmt_date(leaving_on)}</div>
</div>

{overview_html}

{hotels_html}

{day_wise_html}

{pricing_html}

{inclusions_html}

{terms_html}

<div class="footer-line">Generated on {datetime.now(timezone.utc).strftime('%d %b %Y')} • {company} • For queries contact your travel advisor</div>

</body>
</html>
"""


# ---------------- route ----------------

@router.get("/proposals/{proposal_id}/pdf")
async def generate_proposal_pdf(proposal_id: str, current_user: dict = Depends(get_current_user)):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # ---- Enrich selected_activities & selected_hotels with full DB records ----
    sel_acts = proposal.get("selected_activities", {}) or {}
    enriched_acts = {}
    for key, val in sel_acts.items():
        items = val if isinstance(val, list) else [val]
        new_items = []
        for a in items:
            if not a:
                continue
            full = None
            aid = a.get("id")
            if aid:
                full = await db.activities.find_one({"id": aid}, {"_id": 0})
            merged = {**(full or {}), **a}
            # If proposal copy has empty images but full record has them, take from full
            if not merged.get("images") and full and full.get("images"):
                merged["images"] = full["images"]
            new_items.append(merged)
        enriched_acts[key] = new_items if isinstance(val, list) else (new_items[0] if new_items else val)
    proposal["selected_activities"] = enriched_acts

    sel_hotels = proposal.get("selected_hotels", {}) or {}
    enriched_hotels = {}
    for key, h in sel_hotels.items():
        if not h:
            enriched_hotels[key] = h
            continue
        full = None
        hid = h.get("id")
        if hid:
            full = await db.hotels.find_one({"id": hid}, {"_id": 0})
        merged = {**(full or {}), **h}
        if not merged.get("images") and full and full.get("images"):
            merged["images"] = full["images"]
        # Carry selected room from proposal if present (proposal stores `selectedRoom`)
        if h.get("selectedRoom") and not merged.get("selected_room"):
            merged["selected_room"] = h["selectedRoom"]
        enriched_hotels[key] = merged
    proposal["selected_hotels"] = enriched_hotels

    terms = await db.terms_policies.find({}, {"_id": 0}).to_list(50)

    expert = None
    expert_id = proposal.get("assigned_expert_id")
    if expert_id:
        expert = await db.destination_experts.find_one({"id": expert_id}, {"_id": 0})

    user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0, "password": 0})

    html_content = build_pdf_html(proposal, terms, expert, user)

    try:
        pdf_bytes = HTML(string=html_content, base_url=str(UPLOADS_DIR)).write_pdf()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    customer = (proposal.get("customer_name") or "client").replace(" ", "_")
    cities_part = "_".join([c.get("name") if isinstance(c, dict) else c for c in proposal.get("cities", [])][:3]) or "Trip"
    filename = f"Travo_Proposal_{customer}_{cities_part}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
