from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
from weasyprint import HTML

from db import db, get_current_user

router = APIRouter()


# ---------------- helpers ----------------

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
    if imgs and isinstance(imgs, list):
        return imgs[0]
    return hotel.get("image") or ""


def short_ref(pid):
    if not pid:
        return ""
    return "ORN" + str(pid).replace("-", "")[:8].upper()


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
    sel_room = hotel.get("selected_room") or {}
    room_name = sel_room.get("name", "Standard Room")
    meal_plan = sel_room.get("meal_plan") or hotel.get("meal_plan", "Room Only")

    amenities = hotel.get("amenities") or []
    if isinstance(amenities, str):
        amenities = [a.strip() for a in amenities.split(",") if a.strip()]
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
        room = (data.get("selected_room") or {}).get("name", "Standard Room")
        meal = (data.get("selected_room") or {}).get("meal_plan", "Room Only")
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
    if len(desc) > 200:
        desc = desc[:200] + "…"
    has_meal = bool(data.get("meal_included") or data.get("includes_meal"))
    has_ticket = bool(data.get("ticket_included") or data.get("includes_ticket"))
    tags = ['<span class="tag tag-violet">Activity</span>']
    if has_meal:
        tags.append('<span class="tag tag-green">Meal Included</span>')
    if has_ticket:
        tags.append('<span class="tag tag-blue">Ticket</span>')
    return f"""
    <div class="day-item">
        <div class="day-icon activity-icon">📷</div>
        <div class="day-content">
            <div class="day-item-title">{name}</div>
            {f'<div class="day-item-meta">Duration: {duration}</div>' if duration else ''}
            {f'<div class="day-item-desc">{desc}</div>' if desc else ''}
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

    # Cover image: first hotel image or destination fallback
    cover_image = ""
    for ci, c in enumerate(cities):
        cname = c.get("name") if isinstance(c, dict) else c
        h = get_hotel(proposal, cname, ci)
        img = hotel_image(h)
        if img:
            cover_image = img
            break

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

    expert_html = ""
    if expert and isinstance(expert, dict):
        expert_html = f"""
        <div class="expert-card">
            <div class="expert-eyebrow">Your Destination Expert</div>
            <div class="expert-name">{expert.get('name', '')}</div>
            <div class="expert-meta">{expert.get('email', '')} {('• ' + expert.get('phone', '')) if expert.get('phone') else ''}</div>
        </div>
        """

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
    width: 100%; min-height: 297mm; padding: 30mm 20mm; display: flex; flex-direction: column;
    page-break-after: always; position: relative;
  }}
  .cover-brand {{ font-size: 10px; letter-spacing: 6px; text-transform: uppercase; opacity: 0.85; }}
  .cover h1 {{ font-size: 38px; font-weight: 800; margin-top: 10mm; line-height: 1.1; max-width: 80%; }}
  .cover .ref-line {{ height: 2px; width: 60px; background: rgba(255,255,255,0.6); margin: 6mm 0; }}
  .cover .summary {{ font-size: 14px; opacity: 0.92; }}
  .cover .summary .sep {{ opacity: 0.5; padding: 0 8px; }}
  .cover .footer-block {{ margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }}
  .cover .field-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm 14mm; max-width: 60%; margin-top: 8mm; }}
  .cover .f-lbl {{ font-size: 9px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.65; }}
  .cover .f-val {{ font-size: 13px; font-weight: 600; margin-top: 2px; }}
  .cover .ref-tag {{ background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; backdrop-filter: blur(6px); }}
  .cover .prepared {{ font-size: 11px; opacity: 0.9; text-align: right; }}

  /* ---- Section header ---- */
  .section-title {{ color: #002B5B; font-size: 18px; font-weight: 800; padding-bottom: 8px; border-bottom: 2px solid #002B5B; margin-bottom: 14px; }}
  .sub-title {{ font-size: 13px; font-weight: 700; margin-bottom: 8px; }}
  .sub-title.green {{ color: #047857; }}
  .sub-title.red {{ color: #B91C1C; }}

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
  .day-item-desc {{ font-size: 10px; color: #4B5563; margin-top: 4px; line-height: 1.5; }}
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
  <div class="cover-brand">{company}</div>
  <h1>{proposal_name}</h1>
  <div class="ref-line"></div>
  <div class="summary">{city_summary}<span class="sep">|</span>{total_nights} Nights / {total_days} Days</div>

  <div class="field-grid">
    <div>
      <div class="f-lbl">Travel Date</div>
      <div class="f-val">{fmt_date(leaving_on)}</div>
    </div>
    <div>
      <div class="f-lbl">Occupancy</div>
      <div class="f-val">{rooms_count} room{'s' if rooms_count!=1 else ''}, {adults} adult{'s' if adults!=1 else ''}</div>
    </div>
    <div>
      <div class="f-lbl">Reference</div>
      <div class="f-val">{short_ref(proposal.get('id'))}</div>
    </div>
    <div>
      <div class="f-lbl">Prepared For</div>
      <div class="f-val">{customer_name}</div>
    </div>
  </div>

  <div class="footer-block">
    <div class="ref-tag">{short_ref(proposal.get('id'))}</div>
    <div class="prepared">
      <div style="opacity:0.65;font-size:9px;letter-spacing:2px;text-transform:uppercase;">Prepared By</div>
      <div style="font-weight:700;margin-top:2px;">{prepared_by}</div>
      <div style="font-size:10px;opacity:0.85;">{company}</div>
    </div>
  </div>
</div>

<!-- ============== INNER PAGES ============== -->
<div class="inner-header">
  <div class="left">{proposal_name}</div>
  <div class="right">{short_ref(proposal.get('id'))} • {fmt_date(leaving_on)}</div>
</div>

{expert_html}

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

    terms = await db.terms_policies.find({}, {"_id": 0}).to_list(50)

    expert = None
    expert_id = proposal.get("assigned_expert_id")
    if expert_id:
        expert = await db.destination_experts.find_one({"id": expert_id}, {"_id": 0})

    user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0, "password": 0})

    html_content = build_pdf_html(proposal, terms, expert, user)

    try:
        pdf_bytes = HTML(string=html_content).write_pdf()
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
