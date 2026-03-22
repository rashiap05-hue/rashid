from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from db import db, get_current_user, get_optional_user
from models.schemas import ProposalCreate, ProposalResponse
from typing import List
from datetime import datetime, timezone, timedelta
import uuid

proposals_router = APIRouter(prefix="/proposals", tags=["Proposals"])


@proposals_router.post("", response_model=ProposalResponse)
async def create_proposal(proposal: ProposalCreate, user: dict = Depends(get_optional_user)):
    proposal_id = str(uuid.uuid4())

    if proposal.total_price:
        total_price = proposal.total_price
    else:
        total_nights = sum(c.nights for c in proposal.cities)
        base_price = 500 * total_nights
        room_count = len(proposal.room_data)
        total_price = base_price * room_count

    doc = {
        "id": proposal_id,
        "user_id": user["id"] if user else None,
        "leaving_from": proposal.leaving_from,
        "leaving_from_code": proposal.leaving_from_code,
        "nationality": proposal.nationality,
        "leaving_on": proposal.leaving_on,
        "star_rating": proposal.star_rating,
        "add_transfers": proposal.add_transfers,
        "room_data": [r.model_dump() for r in proposal.room_data],
        "cities": [c.model_dump() for c in proposal.cities],
        "status": proposal.status or "pending",
        "total_price": total_price,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "selected_flight": proposal.selected_flight,
        "arrival_flight_info": proposal.arrival_flight_info,
        "departure_flight_info": proposal.departure_flight_info,
        "selected_hotels": proposal.selected_hotels,
        "selected_activities": proposal.selected_activities,
        "selected_extras": proposal.selected_extras,
        "inter_city_transfers": proposal.inter_city_transfers,
        "arrival_transfer": proposal.arrival_transfer,
        "departure_transfer": proposal.departure_transfer,
        "pricing_breakdown": proposal.pricing_breakdown,
        "vehicle_type": proposal.vehicle_type,
        "vehicle_label": proposal.vehicle_label,
        "total_pax": proposal.total_pax,
        "itinerary": proposal.itinerary,
        "total_nights": proposal.total_nights,
        "start_date": proposal.start_date,
        "customer_name": proposal.customer_name,
        "customer_email": proposal.customer_email,
        "customer_phone": proposal.customer_phone,
        "proposal_name": proposal.proposal_name,
        "expected_booking_date": proposal.expected_booking_date,
        "flights_booked": proposal.flights_booked,
        "markup_value": proposal.markup_value,
        "markup_type": proposal.markup_type,
        "discount_amount": proposal.discount_amount,
        "travel_insurance": proposal.travel_insurance,
        "travel_insurance_price": proposal.travel_insurance_price
    }
    await db.proposals.insert_one(doc)
    return ProposalResponse(**doc)


@proposals_router.get("", response_model=List[ProposalResponse])
async def get_proposals(user: dict = Depends(get_optional_user)):
    query = {} if not user else {"user_id": user["id"]}
    proposals = await db.proposals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ProposalResponse(**p) for p in proposals]


@proposals_router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: str):
    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return ProposalResponse(**proposal)


@proposals_router.put("/{proposal_id}")
async def update_proposal(proposal_id: str, proposal: ProposalCreate):
    update_data = proposal.model_dump(exclude_unset=True)
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}


@proposals_router.patch("/{proposal_id}")
async def partial_update_proposal(proposal_id: str, update_data: dict = Body(...)):
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update_data.items() if v is not None}

    result = await db.proposals.update_one({"id": proposal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")

    updated = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    return {"success": True, "proposal": updated}


@proposals_router.put("/{proposal_id}/status")
async def update_proposal_status(proposal_id: str, status: str):
    result = await db.proposals.update_one({"id": proposal_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}


@proposals_router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, user: dict = Depends(get_current_user)):
    result = await db.proposals.delete_one({"id": proposal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return {"success": True}


@proposals_router.get("/{proposal_id}/pdf")
async def generate_proposal_pdf(proposal_id: str):
    """Generate a professional PDF for a proposal"""
    from fpdf import FPDF
    import io
    import textwrap

    proposal = await db.proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Fetch terms & policies
    main_city = proposal.get("cities", [{}])[0].get("name", "") if proposal.get("cities") else ""
    terms_list = []
    try:
        city_doc = await db.cities.find_one({"name": {"$regex": f"^{main_city}$", "$options": "i"}}, {"_id": 0})
        country = city_doc.get("country", "") if city_doc else ""
        query = {"is_active": True, "$or": [{"applies_to": "all"}]}
        if main_city:
            query["$or"].append({"applies_to": "city", "city": {"$regex": f"^{main_city}$", "$options": "i"}})
        if country:
            query["$or"].append({"applies_to": "country", "country": {"$regex": f"^{country}$", "$options": "i"}})
        terms_list = await db.terms_policies.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    except Exception:
        pass

    cities = proposal.get("cities", [])
    nights_count = sum(c.get("nights", 0) for c in cities)
    days_count = nights_count + 1
    room_data = proposal.get("room_data", [])
    adults = sum(r.get("adults", 0) for r in room_data) or 2
    children = sum(len(r.get("children", [])) for r in room_data)
    rooms = len(room_data) or 1
    total_price = proposal.get("total_price", 0) or 0
    proposal_number = proposal.get("id", "")[-7:].upper()
    proposal_name = proposal.get("proposal_name", f"Trip to {main_city}")

    def fmt_date(date_str, fmt="short"):
        if not date_str:
            return ""
        try:
            d = datetime.fromisoformat(date_str.replace("Z", "+00:00")) if "T" in str(date_str) else datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
            if fmt == "short":
                return d.strftime("%a, %d %b")
            elif fmt == "day":
                return d.strftime("%d %b %Y")
            elif fmt == "full":
                return d.strftime("%a, %d %b %Y")
            return d.strftime("%d %b %Y")
        except Exception:
            return str(date_str)[:10]

    def add_days_to(date_str, n):
        try:
            d = datetime.fromisoformat(date_str.replace("Z", "+00:00")) if "T" in str(date_str) else datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
            return d + timedelta(days=n)
        except Exception:
            return datetime.now()

    class ProposalPDF(FPDF):
        def __init__(self):
            super().__init__()
            self.set_auto_page_break(auto=True, margin=20)

        def header(self):
            self.set_fill_color(0, 43, 91)
            self.rect(0, 0, 210, 18, 'F')
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(255, 255, 255)
            self.set_xy(10, 4)
            self.cell(0, 10, "TRAVO DMC", ln=False)
            self.set_font("Helvetica", "", 8)
            self.set_xy(55, 6)
            self.cell(0, 7, "Tours & Travels", ln=False)
            self.set_font("Helvetica", "", 8)
            self.set_xy(140, 6)
            self.cell(60, 7, f"Proposal No: {proposal_number}", ln=False, align="R")
            self.set_text_color(0, 0, 0)
            self.ln(18)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(150, 150, 150)
            self.cell(0, 10, f"Travo DMC - B2B Travel Platform  |  Page {self.page_no()}/{{nb}}", align="C")

        def section_title(self, title, r=0, g=43, b=91):
            self.set_font("Helvetica", "B", 12)
            self.set_text_color(r, g, b)
            self.cell(0, 8, title, ln=True)
            self.set_draw_color(r, g, b)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(3)
            self.set_text_color(0, 0, 0)

        def sub_section(self, title):
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(60, 60, 60)
            self.cell(0, 7, title, ln=True)
            self.set_text_color(0, 0, 0)

        def info_row(self, label, value, bold_value=False):
            self.set_font("Helvetica", "", 9)
            self.set_text_color(120, 120, 120)
            self.cell(55, 6, label, ln=False)
            self.set_text_color(40, 40, 40)
            self.set_font("Helvetica", "B" if bold_value else "", 9)
            self.cell(0, 6, str(value), ln=True)

        def para(self, text, size=9):
            self.set_font("Helvetica", "", size)
            self.set_text_color(80, 80, 80)
            self.multi_cell(0, 5, text)
            self.set_text_color(0, 0, 0)
            self.ln(1)

    pdf = ProposalPDF()
    pdf.alias_nb_pages()
    pdf.add_page()

    # PROPOSAL TITLE SECTION
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(0, 43, 91)
    pdf.cell(0, 12, proposal_name, ln=True)
    pdf.set_text_color(0, 0, 0)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 100, 100)
    summary_parts = []
    if main_city:
        summary_parts.append(f"{main_city} {nights_count} nights")
    summary_parts.append(f"{fmt_date(proposal.get('leaving_on'), 'day')} - {nights_count} nights / {days_count} days")
    summary_parts.append(f"{rooms} room, {adults} adults" + (f", {children} children" if children else ""))
    pdf.cell(0, 6, "  |  ".join(summary_parts), ln=True)
    pdf.ln(2)

    if proposal.get("customer_name"):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(100, 100, 100)
        cust_info = f"Customer: {proposal.get('customer_name', '')}"
        if proposal.get("customer_email"):
            cust_info += f"  |  {proposal['customer_email']}"
        if proposal.get("customer_phone"):
            cust_info += f"  |  {proposal['customer_phone']}"
        pdf.cell(0, 6, cust_info, ln=True)
    pdf.ln(4)

    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # FLIGHTS SECTION
    pdf.section_title("FLIGHTS")
    arr_info = proposal.get("arrival_flight_info", {}) or {}
    dep_info = proposal.get("departure_flight_info", {}) or {}

    pdf.sub_section(f"Outbound: {proposal.get('leaving_from', 'Origin').split('(')[0].strip()} to {main_city}")
    pdf.info_row("Airline", arr_info.get("airline", "AirIndiaExpress") + " " + arr_info.get("flightNumber", "IX-343"))
    pdf.info_row("Departure", f"{arr_info.get('flightTime', '02:10 PM')} on {fmt_date(proposal.get('leaving_on'), 'full')}")
    pdf.info_row("Arrival", f"{arr_info.get('arrivalTime', '05:05 PM')} at {main_city} Intl Airport")
    pdf.info_row("Duration", arr_info.get("duration", "4h 25m"))
    pdf.info_row("Class", "Economy  |  Baggage: 30Kg")
    pdf.ln(3)

    return_date = add_days_to(proposal.get("leaving_on", ""), nights_count)
    pdf.sub_section(f"Return: {main_city} to {proposal.get('leaving_from', 'Origin').split('(')[0].strip()}")
    pdf.info_row("Airline", dep_info.get("airline", "AirIndiaExpress") + " " + dep_info.get("flightNumber", "IX-344"))
    pdf.info_row("Departure", f"{dep_info.get('flightTime', '06:40 PM')} on {return_date.strftime('%a, %d %b %Y')}")
    pdf.info_row("Arrival", f"{dep_info.get('arrivalTime', '12:05 AM')} at {proposal.get('leaving_from_code', 'Origin')}")
    pdf.info_row("Duration", dep_info.get("duration", "3h 55m"))
    pdf.info_row("Class", "Economy  |  Baggage: 30Kg")
    pdf.ln(6)

    # HOTELS SECTION
    pdf.section_title("HOTELS")
    selected_hotels = proposal.get("selected_hotels", {}) or {}
    for city in cities:
        city_name = city.get("name", "")
        city_nights = city.get("nights", 1)
        hotel = selected_hotels.get(city_name, {})
        hotel_name = hotel.get("name", "Hotel") if hotel else "Hotel"

        pdf.sub_section(f"{city_name} - {city_nights} nights")
        pdf.info_row("Hotel", hotel_name, bold_value=True)

        if hotel:
            star = hotel.get("star_rating", 3)
            pdf.info_row("Rating", f"{'*' * star} ({hotel.get('rating_score', 'N/A')}/10 - {hotel.get('rating_text', 'Good')})")
            if hotel.get("address"):
                pdf.info_row("Address", hotel["address"])
            room_name = hotel.get("selectedRoom", {}).get("name", "Double Room") if hotel.get("selectedRoom") else "Double Room"
            pdf.info_row("Room", f"1 x {room_name}")

            check_in = add_days_to(proposal.get("leaving_on", ""), 0)
            check_out = add_days_to(proposal.get("leaving_on", ""), city_nights)
            pdf.info_row("Check-in", f"02:00 PM, {check_in.strftime('%d %b %Y')}")
            pdf.info_row("Check-out", f"12:00 PM, {check_out.strftime('%d %b %Y')}")

            if hotel.get("amenities"):
                amenities = hotel["amenities"]
                if isinstance(amenities, list):
                    pdf.info_row("Amenities", ", ".join(amenities[:6]))
        pdf.ln(4)

    # DAY-WISE ITINERARY
    pdf.section_title("DAY-WISE ITINERARY")
    selected_activities = proposal.get("selected_activities", {}) or {}

    for day_idx in range(days_count):
        day_num = day_idx + 1
        is_arrival = day_num == 1
        is_departure = day_num == days_count
        day_date = add_days_to(proposal.get("leaving_on", ""), day_idx)
        day_acts = selected_activities.get(f"{main_city}_{day_num}", [])

        if is_arrival:
            day_title = f"Arrival into {main_city}"
        elif is_departure:
            day_title = f"Departure from {main_city}"
        elif day_acts:
            day_title = " - ".join([a.get("name", "").split(" - ")[0] for a in day_acts[:2]])
        else:
            day_title = f"Day at leisure in {main_city}"

        pdf.set_fill_color(245, 245, 250)
        pdf.set_font("Helvetica", "B", 10)
        r_color = (234, 88, 12) if is_arrival else (219, 39, 119) if is_departure else (13, 148, 136)
        pdf.set_text_color(*r_color)
        pdf.cell(12, 7, f"Day {day_num}", ln=False, fill=True)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(0, 7, f"  {day_title}  -  {day_date.strftime('%a, %d %b %Y')}", ln=True, fill=True)
        pdf.ln(2)

        if is_arrival:
            pdf.para("You will be met by our representative at the Airport Arrival Terminal with a signage card bearing your name.")
            flight_num = arr_info.get("flightNumber", "IX-343")
            pdf.info_row("Flight", f"{flight_num} arriving at {arr_info.get('arrivalTime', '05:05 PM')} - {main_city} Intl Airport")
            pdf.info_row("Transfer", f"Private transfer from Airport to {main_city} Hotel (4 Bags)")
            first_hotel = selected_hotels.get(main_city, {})
            h_name = first_hotel.get("name", "Hotel") if first_hotel else "Hotel"
            pdf.info_row("Overnight", f"Stay at {h_name}")
            pdf.info_row("Meals", "Breakfast: Not Included  |  Lunch: Not Included  |  Dinner: Not Included")
        elif is_departure:
            pdf.para("Please be available at the hotel lobby 15 minutes before the confirmed pick-up time for your airport transfer.")
            pdf.info_row("Transfer", f"Private transfer from {main_city} Hotel to Airport (4 Bags)")
            flight_num = dep_info.get("flightNumber", "IX-344")
            pdf.info_row("Flight", f"{flight_num} departing at {dep_info.get('flightTime', '06:40 PM')} - {main_city} Intl Airport")
            pdf.info_row("Meals", "Breakfast: Not Included  |  Lunch: Not Included")
        else:
            if day_acts:
                for act in day_acts:
                    act_name = act.get("name", "Activity")
                    act_duration = act.get("duration", "4 hrs")
                    act_transfer = act.get("transfer_type", "Private")
                    start_times = act.get("start_times", [])
                    starts = ", ".join(start_times[:3]) if start_times else "Flexible"
                    pdf.info_row("Activity", act_name, bold_value=True)
                    pdf.info_row("Timing", f"Starts at {starts} (Duration: {act_duration})")
                    pdf.info_row("Transfer", f"{act_transfer} Transfers")
                    inclusions = act.get("inclusions", [])
                    if inclusions:
                        pdf.info_row("Includes", ", ".join(inclusions[:4]))
                    pdf.ln(1)
            else:
                pdf.para(f"Free day to explore {main_city} at your leisure.")

            first_hotel = selected_hotels.get(main_city, {})
            h_name = first_hotel.get("name", "Hotel") if first_hotel else "Hotel"
            pdf.info_row("Overnight", f"Stay at {h_name}")
            pdf.info_row("Meals", "Breakfast: Not Included  |  Lunch: Not Included  |  Dinner: Not Included")

        pdf.ln(3)

    # INCLUSIONS SECTION
    pdf.add_page()
    pdf.section_title("INCLUSIONS")

    for city in cities:
        city_name = city.get("name", "")
        city_nights = city.get("nights", 1)
        hotel = selected_hotels.get(city_name, {})
        hotel_name = hotel.get("name", "Hotel") if hotel else "Hotel"

        pdf.sub_section(f"{city_name} - {city_nights} nights")
        pdf.info_row("Accommodation", f"Stay for {city_nights} nights at {hotel_name}")
        if hotel and hotel.get("selectedRoom"):
            pdf.info_row("Room", f"1 x {hotel['selectedRoom'].get('name', 'Double Room')}")

        city_acts = []
        for key, acts in selected_activities.items():
            if key.startswith(f"{city_name}_") and isinstance(acts, list):
                city_acts.extend(acts)
        if city_acts:
            for act in city_acts:
                pdf.info_row("Activity", f"{act.get('name', '')} ({act.get('duration', '')})")
        pdf.ln(2)

    pdf.sub_section("Transfers")
    pdf.info_row("Arrival", f"Private transfer from Airport to {main_city} Hotel")
    pdf.info_row("Departure", f"Private transfer from {main_city} Hotel to Airport")
    pdf.ln(2)

    pdf.sub_section("Travel Insurance")
    pdf.set_font("Helvetica", "", 9)
    if proposal.get("travel_insurance"):
        pdf.set_text_color(0, 128, 100)
        pdf.cell(0, 6, "Included - Travel Insurance with min $50,000 coverage (Age Below 60 Yrs)", ln=True)
    else:
        pdf.set_text_color(180, 40, 40)
        pdf.cell(0, 6, "Not Included (min $50,000 coverage recommended, Age Below 60 Yrs)", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)

    pdf.sub_section("Exclusions")
    exclusions = [
        "Passport fees, immunization costs, city taxes at the hotel",
        "Optional enhancements like room or flight upgrades",
        "Additional sightseeing and activities outside of the itinerary",
        "Early check-in or late check-out from hotels",
        "Meals not specified in the itinerary"
    ]
    for exc in exclusions:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(5, 5, "-", ln=False)
        pdf.cell(0, 5, f"  {exc}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    # TERMS & POLICIES
    pdf.section_title("TERMS AND POLICIES")

    if terms_list:
        for term in terms_list:
            title = term.get("title", "")
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(60, 60, 60)
            pdf.cell(0, 6, title, ln=True)
            pdf.set_text_color(0, 0, 0)

            content = term.get("content", [])
            if content:
                for item in content:
                    pdf.set_font("Helvetica", "", 8)
                    pdf.set_text_color(100, 100, 100)
                    lines = textwrap.wrap(str(item), width=100)
                    for i, line in enumerate(lines):
                        if i == 0:
                            pdf.cell(5, 4.5, "-", ln=False)
                            pdf.cell(0, 4.5, f"  {line}", ln=True)
                        else:
                            pdf.cell(5, 4.5, "", ln=False)
                            pdf.cell(0, 4.5, f"  {line}", ln=True)

            sub_sections = term.get("sub_sections", [])
            for sub in sub_sections:
                pdf.set_font("Helvetica", "BI", 8)
                pdf.set_text_color(80, 80, 80)
                pdf.cell(0, 5, f"  {sub.get('title', '')}", ln=True)
                for item in sub.get("items", []):
                    pdf.set_font("Helvetica", "", 8)
                    pdf.set_text_color(100, 100, 100)
                    lines = textwrap.wrap(str(item), width=95)
                    for i, line in enumerate(lines):
                        if i == 0:
                            pdf.cell(8, 4.5, "", ln=False)
                            pdf.cell(0, 4.5, f"- {line}", ln=True)
                        else:
                            pdf.cell(8, 4.5, "", ln=False)
                            pdf.cell(0, 4.5, f"  {line}", ln=True)

            pdf.set_text_color(0, 0, 0)
            pdf.ln(3)
    else:
        fallback_terms = [
            ("Important Notes", ["Tickets to attractions are not included unless mentioned.", "Passport must be valid for 6 months from travel date."]),
            ("Terms and Conditions", ["Airline seats and hotel rooms subject to availability.", "No refund for unused nights or early check-out."]),
            ("Hotel Cancellation Policy", ["Hotel cancellation as per hotel policy.", "5% service charge on cancellations."]),
            ("Payment Policies", ["Full payment required at time of booking.", "Always pay via official website or company bank account."])
        ]
        for title, items in fallback_terms:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(0, 6, title, ln=True)
            for item in items:
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(100, 100, 100)
                pdf.cell(5, 4.5, "-", ln=False)
                pdf.cell(0, 4.5, f"  {item}", ln=True)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

    pdf.ln(4)

    # PRICING SECTION
    pdf.section_title("PRICING BREAKDOWN")
    pricing = proposal.get("pricing_breakdown", {}) or {}

    pdf.info_row("Rooms", f"{rooms} room, {adults} adults" + (f", {children} children" if children else ""))
    pdf.info_row("Nationality", proposal.get("nationality", "N/A"))
    pdf.info_row("Departure City", proposal.get("leaving_from", "N/A").split("(")[0].strip())

    if pricing.get("hotels"):
        pdf.info_row("Hotels", f"AED {pricing['hotels']:,.0f}")
    if pricing.get("flights"):
        pdf.info_row("Flights", f"AED {pricing['flights']:,.0f}")
    if pricing.get("transfers"):
        pdf.info_row("Transfers", f"AED {pricing['transfers']:,.0f}")
    if pricing.get("activities"):
        pdf.info_row("Activities", f"AED {pricing['activities']:,.0f}")

    pdf.ln(2)
    pdf.set_draw_color(0, 43, 91)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    price_per_adult = total_price / adults if adults else total_price
    pdf.info_row("Price per adult", f"AED {price_per_adult:,.0f}")

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(0, 43, 91)
    pdf.cell(55, 10, "TOTAL PRICE", ln=False)
    pdf.cell(0, 10, f"AED {total_price:,.0f}", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(55, 4, "", ln=False)
    pdf.cell(0, 4, "INCLUDING ALL TAXES", ln=True)
    pdf.set_text_color(0, 0, 0)

    pdf_output = pdf.output()
    buffer = io.BytesIO(pdf_output)
    buffer.seek(0)

    safe_name = proposal_name.replace(" ", "_").replace("/", "-")
    filename = f"Travo_DMC_{safe_name}_{proposal_number}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
