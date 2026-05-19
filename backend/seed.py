from db import db, logger, client, hash_password
from airports_data import AIRPORTS_DATA
from datetime import datetime, timezone
import uuid


async def seed_initial_data():
    """Seed initial airports, cities, and hotels"""

    # Seed admin user if no users exist
    users_count = await db.users.count_documents({})
    if users_count == 0:
        logger.info("Seeding default admin user...")
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "testadmin@example.com",
            "password": hash_password("password123"),
            "full_name": "Test Admin",
            "company_name": "Travo DMC",
            "mobile": "+971501234567",
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Seeded default admin user: testadmin@example.com")

    airports_count = await db.airports.count_documents({})
    expected_airports = len(AIRPORTS_DATA)

    if airports_count < expected_airports - 50:
        logger.info(f"Found {airports_count} airports, expected {expected_airports}. Reseeding airport database...")
        await db.airports.delete_many({})
        airports_to_insert = []
        for airport in AIRPORTS_DATA:
            airport_doc = {
                "id": str(uuid.uuid4()),
                "code": airport["code"],
                "name": airport["name"],
                "city": airport["city"],
                "country": airport["country"]
            }
            airports_to_insert.append(airport_doc)
        if airports_to_insert:
            await db.airports.insert_many(airports_to_insert)
            logger.info(f"Seeded {len(airports_to_insert)} airports successfully")
    else:
        logger.info(f"Airports database has {airports_count} entries (expected: {expected_airports})")

    cities_count = await db.cities.count_documents({})
    if cities_count == 0:
        logger.info("Seeding cities...")
        cities = [
            {"name": "Dubai", "country": "United Arab Emirates"},
            {"name": "Abu Dhabi", "country": "United Arab Emirates"},
            {"name": "Tbilisi", "country": "Georgia"},
            {"name": "Batumi", "country": "Georgia"},
            {"name": "London", "country": "United Kingdom"},
            {"name": "Paris", "country": "France"},
            {"name": "New York", "country": "USA"},
            {"name": "Tokyo", "country": "Japan"},
            {"name": "Singapore", "country": "Singapore"},
            {"name": "Istanbul", "country": "Turkey"},
            {"name": "Mumbai", "country": "India"},
            {"name": "Delhi", "country": "India"},
            {"name": "Bangkok", "country": "Thailand"},
            {"name": "Bali", "country": "Indonesia"},
        ]
        for city in cities:
            city["id"] = str(uuid.uuid4())
        await db.cities.insert_many(cities)
        logger.info(f"Seeded {len(cities)} cities")

    hotels_count = await db.hotels.count_documents({})
    if hotels_count == 0:
        logger.info("Seeding hotels...")
        hotels = [
            {
                "id": str(uuid.uuid4()),
                "name": "Courtyard by Marriott Baku",
                "city": "Baku",
                "country": "Azerbaijan",
                "address": "300-303 Quarter, Nasimi District, Baku",
                "description": "A stay at Courtyard by Marriott Baku places you in the heart of Baku, within a 15-minute walk of Heydar Aliyev Palace and 28 Mall. This upscale hotel is 1.6 mi from Sabir Park.",
                "star_rating": 4,
                "rating_score": 9.2,
                "rating_text": "Wonderful",
                "review_count": 107,
                "images": ["https://picsum.photos/seed/baku1/1200/800"],
                "amenities": ["Free WiFi", "Fitness Center", "Business Center", "Concierge", "Laundry", "Free Parking", "Restaurant"],
                "detailed_ratings": {"cleanliness": 4.7, "service": 4.6, "comfort": 4.7, "condition": 4.7, "amenities": 4.6},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 2015,
                "total_rooms": 365,
                "highlights": ["Walking distance to 28 May metro station", "Free self parking", "24-hour fitness center", "11 meeting rooms"],
                "board_types": ["RO", "BB"],
                "cancellation_policy": "Free cancellation until 2 days before check-in",
                "supplier_name": "Marriott Hotels",
                "supplier_cost_per_night": 120,
                "rooms": [
                    {"id": "R001", "name": "Superior Room - City View", "type": "Superior", "bed_type": "1 King", "view": "City View", "size": "30 sqm", "price": 465, "original_price": 480, "currency": "AED", "amenities": ["Free WiFi", "LED TV", "Minibar", "Work Desk", "Hair Dryer"], "refundable": True, "refundable_until": "2 days before", "meals": "Room Only", "images": []},
                    {"id": "R002", "name": "Superior Room - Garden View", "type": "Superior", "bed_type": "2 Twin", "view": "Garden View", "size": "30 sqm", "price": 495, "original_price": 510, "currency": "AED", "amenities": ["Free WiFi", "LED TV", "Minibar", "Work Desk"], "refundable": True, "refundable_until": "2 days before", "meals": "Breakfast Included", "images": []},
                    {"id": "R003", "name": "Junior Suite - Garden View", "type": "Suite", "bed_type": "1 King + Sofa", "view": "Garden View", "size": "52 sqm", "price": 750, "original_price": 800, "currency": "AED", "amenities": ["Free WiFi", "LED TV", "Minibar", "Living Area", "Bathrobes"], "refundable": True, "refundable_until": "3 days before", "meals": "Breakfast Included", "images": []}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Burj Al Arab Jumeirah",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Jumeirah Beach Road, Dubai",
                "description": "The distinctive sail-shaped silhouette of Burj Al Arab Jumeirah is more than just a stunning hotel, it is a symbol of modern Dubai.",
                "star_rating": 7,
                "rating_score": 9.8,
                "rating_text": "Exceptional",
                "review_count": 2540,
                "images": ["https://picsum.photos/seed/burj1/1200/800"],
                "amenities": ["Private Beach", "9 Restaurants", "Spa", "Pool", "Butler Service", "Helipad", "Rolls-Royce Fleet"],
                "detailed_ratings": {"cleanliness": 5.0, "service": 5.0, "comfort": 4.9, "location": 4.9, "amenities": 5.0},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 1999,
                "total_rooms": 202,
                "highlights": ["Private beach", "Personal butler", "Rolls-Royce transfer available", "Located on private island"],
                "board_types": ["RO", "BB", "HB", "FB"],
                "cancellation_policy": "Non-refundable - contact hotel for special requests",
                "supplier_name": "Jumeirah Hotels",
                "supplier_cost_per_night": 4500,
                "rooms": [
                    {"id": "R004", "name": "Deluxe One Bedroom Suite", "type": "Suite", "bed_type": "1 King", "view": "Arabian Gulf View", "size": "170 sqm", "price": 5500, "original_price": 6000, "currency": "AED", "amenities": ["Butler Service", "Hermes Amenities", "Jacuzzi", "Private Cinema"], "refundable": False, "meals": "Breakfast Included", "images": []},
                    {"id": "R005", "name": "Panoramic Suite", "type": "Suite", "bed_type": "1 King", "view": "Panoramic Arabian Gulf", "size": "330 sqm", "price": 12000, "original_price": 13500, "currency": "AED", "amenities": ["2 Floors", "Butler Service", "In-suite Dining", "Private Bar"], "refundable": False, "meals": "Full Board", "images": []}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "JW Marriott Marquis Dubai",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Business Bay, Sheikh Zayed Road, Dubai",
                "description": "JW Marriott Marquis Hotel Dubai is one of the world's tallest hotels, featuring 1,608 spacious rooms.",
                "star_rating": 5,
                "rating_score": 9.1,
                "rating_text": "Wonderful",
                "review_count": 4250,
                "images": ["https://picsum.photos/seed/jwmarriott/1200/800"],
                "amenities": ["Pool", "Spa", "Fitness Center", "14 Restaurants", "Free WiFi", "Business Center"],
                "detailed_ratings": {"cleanliness": 4.8, "service": 4.7, "comfort": 4.8, "location": 4.6, "amenities": 4.8},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "12:00",
                "year_built": 2012,
                "total_rooms": 1608,
                "highlights": ["World's tallest hotel", "Direct metro access", "14 dining venues", "Saray Spa"],
                "board_types": ["RO", "BB", "HB"],
                "cancellation_policy": "Free cancellation until 24 hours before check-in",
                "supplier_name": "Marriott Hotels",
                "supplier_cost_per_night": 350,
                "rooms": [
                    {"id": "R006", "name": "Deluxe Room - City View", "type": "Deluxe", "bed_type": "1 King or 2 Twin", "view": "City View", "size": "42 sqm", "price": 650, "original_price": 720, "currency": "AED", "amenities": ["Free WiFi", "Nespresso Machine", "Rain Shower", "Marble Bathroom"], "refundable": True, "refundable_until": "24 hours before", "meals": "Room Only", "images": []},
                    {"id": "R007", "name": "Executive Room - Gulf View", "type": "Executive", "bed_type": "1 King", "view": "Arabian Gulf", "size": "42 sqm", "price": 850, "original_price": 950, "currency": "AED", "amenities": ["Lounge Access", "Free WiFi", "Complimentary Breakfast", "Evening Cocktails"], "refundable": True, "refundable_until": "24 hours before", "meals": "Breakfast Included", "images": []}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Atlantis The Palm",
                "city": "Dubai",
                "country": "United Arab Emirates",
                "address": "Crescent Road, The Palm, Dubai",
                "description": "Atlantis, The Palm is a majestic 5-star resort located at the apex of the Palm Jumeirah.",
                "star_rating": 5,
                "rating_score": 9.0,
                "rating_text": "Superb",
                "review_count": 8750,
                "images": ["https://picsum.photos/seed/atlantis/1200/800"],
                "amenities": ["Aquaventure Waterpark", "Lost Chambers Aquarium", "23 Restaurants", "Private Beach", "Spa", "Dolphin Bay"],
                "detailed_ratings": {"cleanliness": 4.7, "service": 4.6, "comfort": 4.8, "location": 4.9, "amenities": 4.9},
                "what_to_know": [],
                "check_in_time": "15:00",
                "check_out_time": "11:00",
                "year_built": 2008,
                "total_rooms": 1548,
                "highlights": ["Free Aquaventure access", "Lost Chambers Aquarium", "Celebrity chef restaurants", "Private beach"],
                "board_types": ["RO", "BB", "HB", "FB"],
                "cancellation_policy": "Free cancellation until 3 days before check-in",
                "supplier_name": "Atlantis Resorts",
                "supplier_cost_per_night": 800,
                "rooms": [
                    {"id": "R008", "name": "Palm King Room", "type": "Deluxe", "bed_type": "1 King", "view": "Palm View", "size": "45 sqm", "price": 1200, "original_price": 1400, "currency": "AED", "amenities": ["Free Aquaventure", "Free WiFi", "Minibar", "Balcony"], "refundable": True, "refundable_until": "3 days before", "meals": "Room Only", "images": []},
                    {"id": "R009", "name": "Ocean King Room", "type": "Deluxe", "bed_type": "1 King", "view": "Ocean View", "size": "45 sqm", "price": 1500, "original_price": 1700, "currency": "AED", "amenities": ["Free Aquaventure", "Free WiFi", "Ocean View Balcony"], "refundable": True, "refundable_until": "3 days before", "meals": "Breakfast Included", "images": []},
                    {"id": "R010", "name": "Underwater Suite", "type": "Suite", "bed_type": "1 King", "view": "Ambassador Lagoon", "size": "165 sqm", "price": 8500, "original_price": 9500, "currency": "AED", "amenities": ["Floor-to-ceiling aquarium", "Butler Service", "Private Beach Cabana"], "refundable": False, "meals": "Full Board", "images": []}
                ]
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Iveria Inn Hotel",
                "city": "Tbilisi",
                "country": "Georgia",
                "address": "Rose Revolution Square, Tbilisi",
                "description": "Iveria Inn Hotel is located in the heart of Tbilisi, offering comfortable accommodations with views of the historic old town.",
                "star_rating": 4,
                "rating_score": 8.5,
                "rating_text": "Very Good",
                "review_count": 320,
                "images": ["https://picsum.photos/seed/iveria/1200/800"],
                "amenities": ["Free WiFi", "Restaurant", "Bar", "Fitness Center", "Concierge"],
                "detailed_ratings": {"cleanliness": 4.4, "service": 4.5, "comfort": 4.3, "location": 4.8, "amenities": 4.2},
                "what_to_know": [],
                "check_in_time": "14:00",
                "check_out_time": "12:00",
                "year_built": 2010,
                "total_rooms": 120,
                "highlights": ["City center location", "Walking distance to old town", "Rooftop bar", "River views"],
                "board_types": ["RO", "BB"],
                "cancellation_policy": "Free cancellation until 2 days before check-in",
                "supplier_name": "Georgian Hotels Group",
                "supplier_cost_per_night": 80,
                "rooms": [
                    {"id": "R011", "name": "Standard Room - City View", "type": "Standard", "bed_type": "1 Queen", "view": "City View", "size": "25 sqm", "price": 180, "original_price": 200, "currency": "AED", "amenities": ["Free WiFi", "TV", "Minibar", "Safe"], "refundable": True, "refundable_until": "2 days before", "meals": "Room Only", "images": []},
                    {"id": "R012", "name": "Deluxe Room - River View", "type": "Deluxe", "bed_type": "1 King", "view": "River View", "size": "32 sqm", "price": 250, "original_price": 280, "currency": "AED", "amenities": ["Free WiFi", "TV", "Minibar", "Bathrobe", "Slippers"], "refundable": True, "refundable_until": "2 days before", "meals": "Breakfast Included", "images": []}
                ]
            }
        ]
        await db.hotels.insert_many(hotels)
        logger.info(f"Seeded {len(hotels)} hotels")

    transfers_count = await db.transfers.count_documents({})
    if transfers_count == 0:
        logger.info("Seeding transfers...")
        transfers = [
            {"id": str(uuid.uuid4()), "title": "Private from Dubai International Airport", "from_location": "Dubai International Airport (DXB)", "to_location": "Admiral Plaza Hotel, Dubai", "price": 88, "description": "You will be met by our representative at the Airport Arrival Terminal.", "duration": "1 hrs", "confirmation_time": "4 hrs", "transfer_type": "Private", "city": "Dubai", "vehicle_type": "Sedan", "pickup_times": ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"], "max_bags": 3, "supplier_name": "Emirates Transfers LLC", "supplier_cost": 65, "extras": [{"name": "Half Day English Speaking Guide (4 hours)", "price": 330, "duration": "4 hrs"}, {"name": "Full Day English Speaking Guide (8 hours)", "price": 550, "duration": "8 hrs"}], "is_available": True},
            {"id": str(uuid.uuid4()), "title": "Private from Tbilisi International Airport", "from_location": "Tbilisi International Airport (TBS)", "to_location": "Iveria Inn Hotel, Tbilisi", "price": 45, "description": "Meet and greet service at Tbilisi Airport.", "duration": "45 mins", "confirmation_time": "4 hrs", "transfer_type": "Private", "city": "Tbilisi", "vehicle_type": "Sedan", "pickup_times": ["08:00", "12:00", "16:00", "20:00"], "max_bags": 2, "supplier_name": "Georgia Tours Co.", "supplier_cost": 30, "extras": [{"name": "English Speaking Guide (4 hours)", "price": 120, "duration": "4 hrs"}], "is_available": True},
            {"id": str(uuid.uuid4()), "title": "Luxury Transfer from Dubai Airport", "from_location": "Dubai International Airport (DXB)", "to_location": "Burj Al Arab Hotel, Dubai", "price": 250, "description": "Premium luxury transfer service with a Mercedes S-Class or similar.", "duration": "1 hrs", "confirmation_time": "2 hrs", "transfer_type": "Luxury", "city": "Dubai", "vehicle_type": "Luxury Car", "pickup_times": ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"], "max_bags": 4, "supplier_name": "VIP Cars Dubai", "supplier_cost": 180, "extras": [{"name": "VIP Meet & Greet with Porter", "price": 75, "duration": "30 mins"}, {"name": "Full Day Chauffeur Service", "price": 800, "duration": "8 hrs"}], "is_available": True},
            {"id": str(uuid.uuid4()), "title": "Shared Airport Transfer - Dubai", "from_location": "Dubai International Airport (DXB)", "to_location": "Downtown Dubai Hotels", "price": 35, "description": "Economical shared shuttle service from Dubai Airport.", "duration": "1.5 hrs", "confirmation_time": "6 hrs", "transfer_type": "Shared", "city": "Dubai", "vehicle_type": "Minibus", "pickup_times": ["07:00", "10:00", "13:00", "16:00", "19:00", "22:00"], "max_bags": 2, "supplier_name": "Budget Shuttles LLC", "supplier_cost": 20, "extras": [], "is_available": True},
            {"id": str(uuid.uuid4()), "title": "Private Transfer to Abu Dhabi", "from_location": "Dubai City Hotels", "to_location": "Abu Dhabi City Hotels", "price": 180, "description": "Comfortable inter-city transfer from Dubai to Abu Dhabi.", "duration": "1.5 hrs", "confirmation_time": "4 hrs", "transfer_type": "Private", "city": "Dubai", "vehicle_type": "SUV", "pickup_times": ["06:00", "08:00", "10:00", "14:00", "18:00"], "max_bags": 5, "supplier_name": "Emirates Transfers LLC", "supplier_cost": 130, "extras": [{"name": "Abu Dhabi City Tour Add-on", "price": 150, "duration": "3 hrs"}], "is_available": True}
        ]
        await db.transfers.insert_many(transfers)
        logger.info(f"Seeded {len(transfers)} transfers")

    activities_count = await db.activities.count_documents({})
    if activities_count == 0:
        logger.info("Seeding activities...")
        activities = [
            {"id": str(uuid.uuid4()), "name": "Desert Safari with BBQ Dinner", "description": "Experience the thrilling desert safari with dune bashing, camel riding, sandboarding, and a delicious BBQ dinner.", "city": "Dubai", "country": "United Arab Emirates", "category": "Adventure", "duration": "6 hours", "price": 250, "currency": "AED", "images": ["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800"], "highlights": ["Dune Bashing", "Camel Riding", "BBQ Dinner", "Live Entertainment", "Henna Painting"], "inclusions": ["Hotel pickup and drop-off", "4x4 Land Cruiser", "BBQ dinner", "Soft drinks", "Sandboarding"], "exclusions": ["Alcoholic beverages", "Quad biking", "Photography"], "meeting_point": "Hotel Lobby", "start_times": ["14:30", "15:00"], "languages": ["English", "Arabic"], "min_participants": 2, "max_participants": 6, "age_restriction": "All ages", "cancellation_policy": "Free cancellation up to 24 hours before", "supplier_name": "Desert Adventures LLC", "supplier_cost": 150, "available": True, "rating": 4.8, "review_count": 1250},
            {"id": str(uuid.uuid4()), "name": "Burj Khalifa At The Top", "description": "Visit the observation deck of the world's tallest building.", "city": "Dubai", "country": "United Arab Emirates", "category": "Sightseeing", "duration": "2 hours", "price": 180, "currency": "AED", "images": ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"], "highlights": ["124th & 125th Floor Access", "360 Views", "Multimedia Presentation", "Photo Opportunities"], "inclusions": ["Skip-the-line tickets", "Access to observation decks", "Multimedia presentation"], "exclusions": ["Hotel transfers", "Food and beverages"], "meeting_point": "Burj Khalifa Ticket Counter, Dubai Mall", "start_times": ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"], "languages": ["English", "Arabic", "Chinese"], "min_participants": 1, "max_participants": 20, "age_restriction": "All ages", "cancellation_policy": "Non-refundable", "supplier_name": "Emaar Entertainment", "supplier_cost": 140, "available": True, "rating": 4.7, "review_count": 3420},
            {"id": str(uuid.uuid4()), "name": "Dubai City Tour", "description": "Discover the old and new Dubai on this comprehensive city tour.", "city": "Dubai", "country": "United Arab Emirates", "category": "Sightseeing", "duration": "4 hours", "price": 120, "currency": "AED", "images": ["https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800"], "highlights": ["Dubai Museum", "Gold Souk", "Spice Souk", "Jumeirah Mosque", "Photo Stop at Burj Al Arab"], "inclusions": ["Air-conditioned vehicle", "Professional guide", "Hotel pickup and drop-off", "Water bottle"], "exclusions": ["Entry tickets to attractions", "Lunch", "Gratuities"], "meeting_point": "Hotel Lobby", "start_times": ["08:30", "14:00"], "languages": ["English", "Arabic", "Russian"], "min_participants": 2, "max_participants": 12, "age_restriction": "All ages", "cancellation_policy": "Free cancellation up to 24 hours before", "supplier_name": "Arabian Adventures", "supplier_cost": 80, "available": True, "rating": 4.5, "review_count": 890},
            {"id": str(uuid.uuid4()), "name": "Tbilisi Walking Tour", "description": "Explore the charming streets of Tbilisi's Old Town with a local guide.", "city": "Tbilisi", "country": "Georgia", "category": "Cultural", "duration": "3 hours", "price": 45, "currency": "USD", "images": ["https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800"], "highlights": ["Narikala Fortress Views", "Sulfur Baths District", "Sioni Cathedral", "Wine Tasting"], "inclusions": ["Local guide", "Wine tasting", "Traditional snacks"], "exclusions": ["Hotel transfers", "Additional food and drinks", "Entry fees"], "meeting_point": "Freedom Square", "start_times": ["10:00", "15:00"], "languages": ["English", "Georgian", "Russian"], "min_participants": 2, "max_participants": 10, "age_restriction": "All ages", "cancellation_policy": "Free cancellation up to 12 hours before", "supplier_name": "Tbilisi Free Walking Tours", "supplier_cost": 25, "available": True, "rating": 4.9, "review_count": 567},
            {"id": str(uuid.uuid4()), "name": "Georgian Wine Tour - Kakheti", "description": "Full day tour to Georgia's premier wine region.", "city": "Tbilisi", "country": "Georgia", "category": "Food & Drink", "duration": "Full Day", "price": 85, "currency": "USD", "images": ["https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800"], "highlights": ["3 Winery Visits", "Qvevri Wine Tasting", "Traditional Lunch", "Sighnaghi Town Visit"], "inclusions": ["Transportation", "Professional guide", "Lunch", "Wine tastings at 3 wineries", "Entrance fees"], "exclusions": ["Additional wine purchases", "Gratuities"], "meeting_point": "Hotel Lobby or Freedom Square", "start_times": ["09:00"], "languages": ["English", "Russian"], "min_participants": 2, "max_participants": 8, "age_restriction": "18+", "cancellation_policy": "Free cancellation up to 48 hours before", "supplier_name": "Georgia Wine Tours", "supplier_cost": 55, "available": True, "rating": 4.8, "review_count": 423},
            {"id": str(uuid.uuid4()), "name": "Baku Old City Walking Tour", "description": "Discover the UNESCO World Heritage Old City (Icherisheher) of Baku.", "city": "Baku", "country": "Azerbaijan", "category": "Cultural", "duration": "3 hours", "price": 35, "currency": "USD", "images": ["https://images.unsplash.com/photo-1603027937430-8f873c92e5f0?w=800"], "highlights": ["Maiden Tower", "Palace of the Shirvanshahs", "Carpet Museum", "Local Tea House"], "inclusions": ["Professional guide", "Traditional tea", "Entry to Maiden Tower"], "exclusions": ["Hotel transfers", "Lunch", "Other entry fees"], "meeting_point": "Fountain Square", "start_times": ["10:00", "16:00"], "languages": ["English", "Azerbaijani", "Russian"], "min_participants": 2, "max_participants": 12, "age_restriction": "All ages", "cancellation_policy": "Free cancellation up to 24 hours before", "supplier_name": "Baku Tours", "supplier_cost": 20, "available": True, "rating": 4.6, "review_count": 312}
        ]
        await db.activities.insert_many(activities)
        logger.info(f"Seeded {len(activities)} activities")

    insurance_count = await db.insurance_prices.count_documents({})
    if insurance_count == 0:
        insurance_entries = [
            {"id": str(uuid.uuid4()), "country": "Default", "price_per_person": 50, "currency": "AED", "min_coverage": 50000, "max_age": 60, "description": "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "country": "United Arab Emirates", "price_per_person": 75, "currency": "AED", "min_coverage": 100000, "max_age": 65, "description": "UAE Travel Insurance with min $100,000 coverage - Only for Age Below 65 Yrs", "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "country": "Georgia", "price_per_person": 40, "currency": "AED", "min_coverage": 50000, "max_age": 60, "description": "Georgia Travel Insurance with min $50,000 coverage", "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.insurance_prices.insert_many(insurance_entries)
        logger.info(f"Seeded {len(insurance_entries)} insurance price entries")

    logger.info("Data seeding check complete")


async def seed_terms_policies():
    """Seed default terms and policies"""
    terms_collection = db.terms_policies
    existing = await terms_collection.count_documents({})
    if existing > 0:
        logger.info("Terms and policies already seeded")
        return

    default_terms = [
        {"id": str(uuid.uuid4()), "title": "Any Other Commitments", "category": "Commitments", "content": ["If any other service or commitments have been made apart from the inclusions in the proposal, then please make sure they are mentioned in this section."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 1, "is_expanded_default": False, "is_active": True, "icon": "check", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Important Notes", "category": "General", "content": [], "sub_sections": [{"title": "General", "items": ["Any ticket to attractions, museums, train, cable car, ferries, rides, safari, etc. are not included unless explicitly mentioned as an inclusion.", "For queries regarding cancellations and refunds, please refer to our Cancellation Policy.", "We reserve the right to issue a full refund in case we believe we are unable to fulfil the services for any technical reasons.", "Please make sure that the passport of all guests travelling is valid for at least 6 months from the date of travel.", "We can only facilitate the visa application for the travelling passengers. Granting of visa is solely at the discretion of Embassy."]}, {"title": "Hotel", "items": ["At the time of check-in to your hotel, hotel may ask you to make an advance/security deposit (amount depends upon hotel policy). This amount is refunded at the time of check-out, minus the cost of any items taken from the mini-bar or other charges."]}, {"title": "Tours and Transfers", "items": ["The cost and ticket issued for various attractions with regards to any children travelling are based on the age provided at the time of creating the package quote."]}], "country": None, "city": None, "applies_to": "all", "order": 2, "is_expanded_default": True, "is_active": True, "icon": "info", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Important Notes - Europe", "category": "Regional", "content": [], "sub_sections": [{"title": "Europe", "items": ["Please make sure to download the telegram app before your travel starts, where driver details for all tours and transfers shall be shared.", "The driver details for private airport transfers or train station transfers or tours shall be shared within 24 hours of scheduled time only on the telegram app.", "On arrival in case you cannot locate your driver please call the service provider and give your complete name and confirmation number for them to guide you.", "Any changes in pickup times in Europe for airport or train station transfers (private only) can be done only 24 hours before the scheduled pickup time.", "Most tours on sharing basis in Europe start from a common point in the city. Please make sure you reach the shared common point mentioned in the activity voucher at least 15 mins before the scheduled time.", "In case you are delayed in reaching the common point, and the bus leaves for the tour, the tour is considered a no show and no refund shall be provided.", "For tours and activities booked on private basis, the drivers arrive at specified time only and the maximum waiting time is only 10-15 mins.", "Please note that we are not responsible for any delays (if any) in the vehicle for pick-ups or drops due to any un-avoidable conditions, like traffic, accidents, vehicle breakdown etc.", "Please note that any trains confirmed as part of journeys exclude seat reservations and seat reservation charges.", "In Europe you are required to manage and handle your luggage on your own. No porterage services are provided by us."]}], "country": "Europe", "city": None, "applies_to": "country", "order": 3, "is_expanded_default": False, "is_active": True, "icon": "info", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Terms and Conditions", "category": "Legal", "content": ["Airline seats and hotel rooms are subject to availability at the time of confirmation.", "In case of unavailability in the listed hotels, arrangement for an alternate accommodation will be made in a hotel of similar standard.", "There will be no refund for unused nights or early check-out (in case of Medical condition it completely depends on hotel policy).", "There will be no refund for any unutilized services (meals, entrance fees, optional tours, hotels, transport and sightseeing etc) for any reason whatsoever.", "Check-in and check-out times at hotels would be as per Hotel policies. Early check-in or late check-out is subject to availability and may be chargeable by the hotel.", "The price does not include expenses of personal nature, such as laundry, telephone calls, room service, alcoholic beverages, mini bar charges, tips, portage, camera fees etc.", "We reserves the right to modify the itinerary at any point, due to reasons including but not limited to: Force Majeure events, strikes, fairs, festivals, weather conditions, traffic problems, overbooking of hotels / flights, cancellation / re-routing of flights, closure of / entry restrictions at a place of visit, etc.", "In case a flight gets cancelled, we will not be liable to provide any alternate flights within the same cost, any additional cost incurred for the same shall be borne by the traveler.", "If your stay falls on special dates (like 24th December, 31st December, 14th February, etc.) when hotel organize gala dinner, then there may be mandatory Gala Dinner Charges additional that you need to pay at the hotel directly.", "Country guidelines may change without notice, hence do check travel rules and your eligibility for travel on the regulatory website of the respective country/state, before booking your travel."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 4, "is_expanded_default": False, "is_active": True, "icon": "shield", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Our Scope of Services", "category": "Legal", "content": ["We are holiday organizers only. We inspect and select the services to be provided to you. However, we do not own, operate or control any airline, shipping company, coach or coach company, hotel, transport, restaurant, kitchen caravan or any other facility or provider etc.", "You will need to adhere to the conditions, rules and regulations of each service provider.", "If you cause any injury or damage affecting the service provider, then you may be liable to the service provider and if the service provider recovers any monies from us for such injury or damages, we shall separately charge you for the same.", "We cannot be held responsible / liable for any delay, deficiency, injury, death, loss or damage etc. occasioned due to act or default of such service providers, their employees or agents."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 5, "is_expanded_default": False, "is_active": True, "icon": "briefcase", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Hotel Cancellation Policy", "category": "Cancellation", "content": ["Hotel cancellation will be as per the hotel cancellation policy. If the hotels are non-refundable, you will not get any refund for hotels in the event of cancellation.", "Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date, unless otherwise specified during the quotation stage.", "Entrance tickets of any kind are non-refundable from the moment of booking, unless specified otherwise.", "There will also a service charge of 5% on total value in case of cancellation of Land and 5% on total value for any amendments.", "Hotel room allocation will be subject to availability and will be on a first come first serve basis.", "Any transfers or activities included in the trip will be non-refundable if cancelled within 3 days of the travel start date."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 6, "is_expanded_default": False, "is_active": True, "icon": "hotel", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Payment Policies", "category": "Payment", "content": ["There might be an increase in total package cost offered at the time of bookings in case the payments are not received by us as per the terms mentioned and the extra cost need to be borne by the guest.", "We will never ask you to pay in a personal account. Please always pay using our website or in our company bank account."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 7, "is_expanded_default": False, "is_active": True, "icon": "creditCard", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "title": "Amendment of Booking by Guest", "category": "Booking", "content": ["If you wish to amend or change your booking, you have to communicate your request to us in writing. Such requests for change or amendment will be accepted subject to availability.", "Please note that the amended or changed booking will be regarded as a new booking. In case the amendment is carried out within the cancellation period, then a cancellation charge shall apply as if a cancellation was made on the date the request for amendment or change is made."], "sub_sections": [], "country": None, "city": None, "applies_to": "all", "order": 8, "is_expanded_default": False, "is_active": True, "icon": "edit", "created_at": datetime.now(timezone.utc).isoformat()}
    ]

    await terms_collection.insert_many(default_terms)
    logger.info(f"Seeded {len(default_terms)} default terms and policies")


async def migrate_image_urls():
    """Migrate old /uploads/ URLs to /api/static/ URLs"""
    hotels_collection = db.hotels
    hotels = await hotels_collection.find({}).to_list(length=1000)
    for hotel in hotels:
        updated = False
        new_images = []
        for img in hotel.get('images', []):
            if '/uploads/' in img and '/api/static/' not in img:
                new_img = img.replace('/uploads/', '/api/static/')
                new_images.append(new_img)
                updated = True
            else:
                new_images.append(img)
        if updated:
            await hotels_collection.update_one(
                {"_id": hotel["_id"]},
                {"$set": {"images": new_images}}
            )
            logger.info(f"Migrated image URLs for hotel: {hotel.get('name', 'unknown')}")


async def migrate_transfer_image_urls():
    """Fix broken transfer image URLs (double /api/api/ paths or old domains)"""
    import re
    transfers_collection = db.transfers
    transfers = await transfers_collection.find({}).to_list(length=1000)
    fixed_count = 0
    for transfer in transfers:
        new_images = []
        for img in transfer.get('images', []):
            # Extract relative path from absolute URLs with broken patterns
            match = re.search(r'(/api/static/\S+)', img)
            if match and img.startswith('http'):
                relative = match.group(1)
                # Fix double /api/api/static/ -> /api/static/
                relative = re.sub(r'/api/api/static/', '/api/static/', relative)
                new_images.append(relative)
            else:
                new_images.append(img)
        video = transfer.get('video')
        new_video = video
        if video and isinstance(video, str) and video.startswith('http'):
            vmatch = re.search(r'(/api/static/\S+)', video)
            if vmatch:
                new_video = vmatch.group(1)
                new_video = re.sub(r'/api/api/static/', '/api/static/', new_video)
        updates = {}
        if new_images != transfer.get('images', []):
            updates['images'] = new_images
        if new_video != video:
            updates['video'] = new_video
        if updates:
            await transfers_collection.update_one(
                {"_id": transfer["_id"]},
                {"$set": updates}
            )
            fixed_count += 1
            logger.info(f"Fixed image URLs for transfer: {transfer.get('title', 'unknown')}")
    if fixed_count > 0:
        logger.info(f"Fixed image URLs for {fixed_count} transfers total")


async def migrate_activities_fields():
    """Add new fields to existing activities"""
    activities_collection = db.activities
    default_fields = {
        "useful_information": [],
        "transfer_type": "Private",
        "operating_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "closed_days": []
    }
    activities = await activities_collection.find({}).to_list(length=1000)
    for activity in activities:
        updates = {}
        for field, default_value in default_fields.items():
            if field not in activity:
                updates[field] = default_value
        if updates:
            await activities_collection.update_one(
                {"_id": activity["_id"]},
                {"$set": updates}
            )
            logger.info(f"Migrated activity fields for: {activity.get('name', 'unknown')}")



async def seed_destination_experts():
    """Seed sample destination experts"""
    count = await db.destination_experts.count_documents({})
    if count > 0:
        logger.info("Destination experts already seeded")
        return
    logger.info("Seeding destination experts...")
    experts = [
        {
            "id": str(uuid.uuid4()),
            "name": "Sumila R/B2B/BKK/BLR/Reeba",
            "email": "sumila.r@nexusdmc.travel",
            "phone": "6364933662",
            "location": "Bangalore",
            "photo": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Ahmed K/B2B/DXB/Sales",
            "email": "ahmed.k@travotours.ae",
            "phone": "+971501234567",
            "location": "Dubai",
            "photo": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Priya S/B2B/DEL/Operations",
            "email": "priya.s@travotours.ae",
            "phone": "+919876543210",
            "location": "Delhi",
            "photo": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    ]
    await db.destination_experts.insert_many(experts)
    logger.info(f"Seeded {len(experts)} destination experts")
