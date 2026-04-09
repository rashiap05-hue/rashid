from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from datetime import datetime, timezone
from weasyprint import HTML

from db import db, get_current_user

router = APIRouter()


def format_date(d):
    if not d:
        return "—"
    try:
        dt = datetime.fromisoformat(str(d).replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except:
        return str(d)


def build_day_cards_html(proposal):
    cities = proposal.get("cities", [])
    leaving_on = proposal.get("leaving_on", "")
    selected_hotels = proposal.get("selected_hotels", {})
    selected_activities = proposal.get("selected_activities", {})
    inter_city = proposal.get("inter_city_transfers", {})

    html = ""
    day_num = 0
    for city_idx, city in enumerate(cities):
        city_name = city.get("name", city) if isinstance(city, dict) else city
        nights = city.get("nights", 1) if isinstance(city, dict) else 1
        city_key = f"{city_name}_{city_idx}"
        hotel = selected_hotels.get(city_key, {})
        hotel_name = hotel.get("name", hotel.get("hotel_name", "")) if hotel else ""
        room = hotel.get("selected_room", {}) or {}
        room_name = room.get("name", "Standard Room")
        meal_plan = room.get("meal_plan", "Room Only")

        for night in range(nights):
            day_num += 1
            is_arrival = (city_idx == 0 and night == 0)
            is_departure = (city_idx == len(cities) - 1 and night == nights - 1)
            is_first_night_in_city = (night == 0 and city_idx > 0)

            try:
                from datetime import timedelta
                dt = datetime.fromisoformat(leaving_on)
                day_date = (dt + timedelta(days=day_num - 1)).strftime("%d %b %Y, %A")
            except:
                day_date = f"Day {day_num}"

            # Meal logic
            if is_arrival:
                breakfast = "Not Included (Arrival Day)"
            elif is_departure:
                breakfast = f"Included at {hotel_name}" if hotel_name else "Included"
            else:
                breakfast = f"At {hotel_name}" if hotel_name else "Included"

            # Activities
            act_key = f"{city_name}_{day_num}"
            activities_for_day = selected_activities.get(act_key, [])
            if not isinstance(activities_for_day, list):
                activities_for_day = [activities_for_day] if activities_for_day else []

            # Inter-city transfer
            transfer_html = ""
            if is_first_night_in_city:
                prev_key = f"{city_idx - 1}_{city_idx}"
                t = inter_city.get(prev_key, {})
                if t and isinstance(t, dict):
                    t_name = t.get("name", t.get("transfer_name", ""))
                    if t_name:
                        transfer_html = f'<div style="background:#e8f4fd;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-size:11px;color:#0066CC;">Transfer: {t_name}</div>'

            activity_html = ""
            for act in activities_for_day:
                if isinstance(act, dict):
                    a_name = act.get("name", act.get("activity_name", ""))
                    if a_name:
                        activity_html += f'<div style="background:#f0fdf4;border-radius:6px;padding:8px 12px;margin-bottom:4px;font-size:11px;color:#166534;">Activity: {a_name}</div>'

            day_label = "Arrival Day" if is_arrival else ("Departure Day" if is_departure else f"Day {day_num}")

            html += f'''
            <div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:12px;overflow:hidden;">
                <div style="background:#002B5B;color:white;padding:10px 16px;display:flex;justify-content:space-between;">
                    <span style="font-weight:800;font-size:13px;">{day_label} — {city_name}</span>
                    <span style="font-size:11px;opacity:0.7;">{day_date}</span>
                </div>
                <div style="padding:14px 16px;">
                    {transfer_html}
                    {f'<div style="font-size:12px;margin-bottom:6px;"><strong>Hotel:</strong> {hotel_name} — {room_name}</div>' if hotel_name else ''}
                    <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">Breakfast: {breakfast} | Meal Plan: {meal_plan}</div>
                    {activity_html}
                </div>
            </div>
            '''

    return html, day_num


def build_pdf_html(proposal, terms, expert, user):
    customer_name = proposal.get("customer_name", "Valued Client")
    customer_email = proposal.get("customer_email", "")
    cities = proposal.get("cities", [])
    city_names = ", ".join([c.get("name", c) if isinstance(c, dict) else c for c in cities])
    total_price = proposal.get("total_price", 0)
    leaving_on = proposal.get("leaving_on", "")
    total_nights = proposal.get("total_nights", sum(c.get("nights", 1) if isinstance(c, dict) else 1 for c in cities))
    proposal_name = proposal.get("proposal_name", f"Trip to {city_names}")
    room_data = proposal.get("room_data", {})
    adults = room_data.get("adults", proposal.get("adults", 1)) if isinstance(room_data, dict) else 1
    rooms = room_data.get("rooms", proposal.get("rooms", 1)) if isinstance(room_data, dict) else 1
    vehicle_label = proposal.get("vehicle_label", "")

    # Pricing
    pricing = proposal.get("pricing_breakdown", {}) or {}
    markup_type = proposal.get("markup_type", "")
    markup_value = proposal.get("markup_value", 0)
    discount = proposal.get("discount_amount", 0)
    insurance = proposal.get("travel_insurance_price", 0)

    day_cards_html, total_days = build_day_cards_html(proposal)

    # Flights
    flights_html = ""
    arrival = proposal.get("arrival_flight_info", {}) or {}
    departure = proposal.get("departure_flight_info", {}) or {}
    if arrival or departure:
        flights_html = '<h2 style="color:#002B5B;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #002B5B;padding-bottom:6px;">Flight Details</h2>'
        for label, f in [("Departure Flight", arrival), ("Return Flight", departure)]:
            if f and isinstance(f, dict) and f.get("airline"):
                flights_html += f'''
                <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
                    <div style="font-weight:700;font-size:13px;color:#002B5B;margin-bottom:6px;">{label}</div>
                    <div style="font-size:12px;color:#374151;">{f.get("airline","")} — {f.get("departure_time","")} to {f.get("arrival_time","")}</div>
                    <div style="font-size:11px;color:#6b7280;">Baggage: {f.get("baggage","30 Kg")} | Class: {f.get("fare_class","Economy")}</div>
                </div>'''

    # Inclusions
    inclusions = []
    if proposal.get("arrival_transfer"):
        inclusions.append("Airport arrival transfer")
    if proposal.get("departure_transfer"):
        inclusions.append("Airport departure transfer")
    inter_city = proposal.get("inter_city_transfers", {})
    for key, t in (inter_city or {}).items():
        if isinstance(t, dict) and t.get("name"):
            inclusions.append(f"Inter-city transfer: {t['name']}")
    if proposal.get("travel_insurance"):
        inclusions.append("Travel Insurance")

    inclusions_html = ""
    if inclusions:
        inclusions_html = '<h2 style="color:#002B5B;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #002B5B;padding-bottom:6px;">Inclusions</h2><ul style="font-size:12px;color:#374151;padding-left:20px;">'
        for inc in inclusions:
            inclusions_html += f"<li style='margin-bottom:4px;'>{inc}</li>"
        inclusions_html += "</ul>"

    # Terms
    terms_html = ""
    if terms:
        terms_html = '<div style="page-break-before:always;"></div><h2 style="color:#002B5B;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #002B5B;padding-bottom:6px;">Terms & Policies</h2>'
        for t in terms:
            if isinstance(t, dict):
                terms_html += f'<div style="margin-bottom:10px;"><h3 style="font-size:13px;color:#1f2937;margin-bottom:4px;">{t.get("title","")}</h3><p style="font-size:11px;color:#6b7280;line-height:1.5;">{t.get("content","")}</p></div>'

    # Expert
    expert_html = ""
    if expert and isinstance(expert, dict):
        expert_html = f'''
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-top:16px;">
            <h3 style="font-size:13px;color:#002B5B;margin-bottom:6px;">Your Destination Expert</h3>
            <div style="font-size:12px;color:#374151;">{expert.get("name","")}</div>
            <div style="font-size:11px;color:#6b7280;">{expert.get("email","")} | {expert.get("phone","")}</div>
        </div>'''

    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{ margin: 20mm 15mm; size: A4; }}
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.4; margin: 0; }}
            .cover {{ text-align: center; padding: 80px 40px; background: linear-gradient(135deg, #002B5B 0%, #00508F 100%); color: white; page-break-after: always; border-radius: 0; min-height: 700px; display: flex; flex-direction: column; justify-content: center; }}
            .cover h1 {{ font-size: 36px; font-weight: 900; margin-bottom: 10px; letter-spacing: -0.5px; }}
            .cover .subtitle {{ font-size: 18px; opacity: 0.8; margin-bottom: 40px; }}
            .cover .meta {{ font-size: 13px; opacity: 0.7; margin-top: 8px; }}
            .cover .divider {{ width: 60px; height: 3px; background: rgba(255,255,255,0.5); margin: 30px auto; }}
            .header {{ display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #002B5B; margin-bottom: 20px; }}
            .header h2 {{ color: #002B5B; font-size: 18px; margin: 0; }}
            .header .brand {{ font-size: 11px; color: #6b7280; }}
        </style>
    </head>
    <body>
        <!-- Cover Page -->
        <div class="cover">
            <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;opacity:0.6;margin-bottom:20px;">Travo Tours & Travels</div>
            <h1>{proposal_name}</h1>
            <div class="subtitle">{city_names}</div>
            <div class="divider"></div>
            <div class="meta">Prepared for: <strong>{customer_name}</strong></div>
            <div class="meta">{total_nights} Nights / {total_days} Days | {format_date(leaving_on)}</div>
            <div class="meta">{adults} Adult{"s" if adults != 1 else ""} | {rooms} Room{"s" if rooms != 1 else ""}{f" | {vehicle_label}" if vehicle_label else ""}</div>
            <div style="margin-top:50px;font-size:12px;opacity:0.5;">Generated on {datetime.now(timezone.utc).strftime("%d %b %Y")}</div>
        </div>

        <!-- Content -->
        <div class="header">
            <h2>Trip Itinerary</h2>
            <div class="brand">Travo Tours & Travels</div>
        </div>

        <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;display:flex;justify-content:space-between;font-size:12px;">
            <div><strong>Guest:</strong> {customer_name}</div>
            <div><strong>Travel Date:</strong> {format_date(leaving_on)}</div>
            <div><strong>Reference:</strong> ORN{(proposal.get("id",""))[:8].upper()}</div>
        </div>

        {day_cards_html}

        {flights_html}

        {inclusions_html}

        {expert_html}

        <!-- Pricing Summary -->
        <div style="page-break-before:always;"></div>
        <h2 style="color:#002B5B;font-size:16px;margin:20px 0 10px;border-bottom:2px solid #002B5B;padding-bottom:6px;">Pricing Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="background:#f8fafc;">
                <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:700;">Total Package Price</td>
                <td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:right;font-weight:800;font-size:16px;color:#002B5B;">AED {total_price:,.0f}</td>
            </tr>
            {f'<tr><td style="padding:8px 14px;border:1px solid #e5e7eb;color:#6b7280;">Markup ({markup_type})</td><td style="padding:8px 14px;border:1px solid #e5e7eb;text-align:right;">{markup_value}</td></tr>' if markup_value else ''}
            {f'<tr><td style="padding:8px 14px;border:1px solid #e5e7eb;color:#6b7280;">Discount</td><td style="padding:8px 14px;border:1px solid #e5e7eb;text-align:right;color:#dc2626;">-AED {discount:,.0f}</td></tr>' if discount else ''}
            {f'<tr><td style="padding:8px 14px;border:1px solid #e5e7eb;color:#6b7280;">Travel Insurance</td><td style="padding:8px 14px;border:1px solid #e5e7eb;text-align:right;">AED {insurance:,.0f}</td></tr>' if insurance else ''}
        </table>

        {terms_html}

        <div style="text-align:center;margin-top:40px;padding:20px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;">
            This proposal was generated by Travo Tours & Travels. For questions, contact us at info@travotours.ae
        </div>
    </body>
    </html>
    '''


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

    customer = proposal.get("customer_name", "client").replace(" ", "_")
    cities = "_".join([c.get("name", c) if isinstance(c, dict) else c for c in proposal.get("cities", [])])
    filename = f"Travo_Proposal_{customer}_{cities}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
