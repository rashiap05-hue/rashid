"""
Test suite for Enhanced Hotels Management Features
- Tests city filtering API
- Tests new hotel fields (address, check-in/out times, board types, etc.)
- Tests hotel rooms array structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHotelsCityFilter:
    """Test hotel API city filtering functionality"""
    
    def test_get_all_hotels_returns_5_hotels(self):
        """GET /api/hotels should return 5 seeded hotels"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        hotels = data.get('hotels', [])
        assert len(hotels) == 5, f"Expected 5 hotels, got {len(hotels)}"
    
    def test_filter_hotels_by_dubai_returns_3_hotels(self):
        """GET /api/hotels?city=Dubai should return 3 Dubai hotels"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Dubai")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        hotels = data.get('hotels', [])
        assert len(hotels) == 3, f"Expected 3 Dubai hotels, got {len(hotels)}"
        
        # Verify all returned hotels are Dubai hotels
        for hotel in hotels:
            assert 'Dubai' in hotel.get('city', ''), f"Hotel {hotel.get('name')} is not in Dubai"
    
    def test_filter_hotels_by_tbilisi_returns_1_hotel(self):
        """GET /api/hotels?city=Tbilisi should return 1 Tbilisi hotel"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Tbilisi")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        hotels = data.get('hotels', [])
        assert len(hotels) == 1, f"Expected 1 Tbilisi hotel, got {len(hotels)}"
        assert 'Iveria' in hotels[0].get('name', ''), "Expected Iveria Inn Hotel"
    
    def test_filter_hotels_by_baku_returns_1_hotel(self):
        """GET /api/hotels?city=Baku should return 1 Baku hotel"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Baku")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        hotels = data.get('hotels', [])
        assert len(hotels) == 1, f"Expected 1 Baku hotel, got {len(hotels)}"
        assert 'Courtyard' in hotels[0].get('name', ''), "Expected Courtyard by Marriott Baku"
    
    def test_filter_hotels_by_nonexistent_city_returns_empty(self):
        """GET /api/hotels?city=NonExistent should return empty list"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=NonExistent")
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        hotels = data.get('hotels', [])
        assert len(hotels) == 0, f"Expected 0 hotels for nonexistent city, got {len(hotels)}"
    
    def test_city_filter_case_insensitive(self):
        """City filter should be case-insensitive"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=DUBAI")
        assert response.status_code == 200
        data = response.json()
        hotels = data.get('hotels', [])
        assert len(hotels) == 3, f"Case-insensitive filter failed. Expected 3, got {len(hotels)}"


class TestHotelNewFields:
    """Test new hotel fields from PDF analysis"""
    
    def test_hotel_has_address_field(self):
        """Hotels should have address field"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'address' in hotel, f"Hotel {hotel.get('name')} missing address field"
            # All seeded hotels have addresses
            assert hotel['address'], f"Hotel {hotel.get('name')} has empty address"
    
    def test_hotel_has_check_in_out_times(self):
        """Hotels should have check_in_time and check_out_time fields"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'check_in_time' in hotel, f"Hotel {hotel.get('name')} missing check_in_time"
            assert 'check_out_time' in hotel, f"Hotel {hotel.get('name')} missing check_out_time"
            # Verify format HH:MM
            assert ':' in str(hotel.get('check_in_time', '')), "Invalid check_in_time format"
            assert ':' in str(hotel.get('check_out_time', '')), "Invalid check_out_time format"
    
    def test_hotel_has_total_rooms(self):
        """Hotels should have total_rooms field"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'total_rooms' in hotel, f"Hotel {hotel.get('name')} missing total_rooms"
            # Total rooms should be a positive number
            if hotel['total_rooms'] is not None:
                assert hotel['total_rooms'] > 0, f"Hotel {hotel.get('name')} has invalid total_rooms"
    
    def test_hotel_has_board_types(self):
        """Hotels should have board_types array with valid values"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        valid_board_types = {'RO', 'BB', 'HB', 'FB'}
        
        for hotel in hotels:
            assert 'board_types' in hotel, f"Hotel {hotel.get('name')} missing board_types"
            board_types = hotel.get('board_types', [])
            assert isinstance(board_types, list), "board_types should be a list"
            assert len(board_types) > 0, f"Hotel {hotel.get('name')} has no board types"
            
            # Verify all board types are valid
            for bt in board_types:
                assert bt in valid_board_types, f"Invalid board type {bt} in {hotel.get('name')}"
    
    def test_hotel_has_highlights(self):
        """Hotels should have highlights array"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'highlights' in hotel, f"Hotel {hotel.get('name')} missing highlights"
            highlights = hotel.get('highlights', [])
            assert isinstance(highlights, list), "highlights should be a list"
    
    def test_hotel_has_cancellation_policy(self):
        """Hotels should have cancellation_policy field"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'cancellation_policy' in hotel, f"Hotel {hotel.get('name')} missing cancellation_policy"
            assert hotel['cancellation_policy'], f"Hotel {hotel.get('name')} has empty cancellation_policy"
    
    def test_hotel_has_supplier_info(self):
        """Hotels should have supplier_name and supplier_cost_per_night fields"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'supplier_name' in hotel, f"Hotel {hotel.get('name')} missing supplier_name"
            assert 'supplier_cost_per_night' in hotel, f"Hotel {hotel.get('name')} missing supplier_cost_per_night"
            # Verify supplier cost is positive
            if hotel.get('supplier_cost_per_night'):
                assert hotel['supplier_cost_per_night'] > 0, "supplier_cost_per_night should be positive"


class TestHotelRooms:
    """Test hotel rooms array structure"""
    
    def test_hotels_have_rooms_array(self):
        """Hotels should have rooms array"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            assert 'rooms' in hotel, f"Hotel {hotel.get('name')} missing rooms array"
            rooms = hotel.get('rooms', [])
            assert isinstance(rooms, list), "rooms should be a list"
    
    def test_hotel_rooms_have_required_fields(self):
        """Each room should have required fields"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        required_room_fields = ['id', 'name', 'type', 'price']
        
        for hotel in hotels:
            rooms = hotel.get('rooms', [])
            for room in rooms:
                for field in required_room_fields:
                    assert field in room, f"Room in {hotel.get('name')} missing {field}"
    
    def test_hotel_rooms_have_pricing(self):
        """Room should have price and original_price"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            rooms = hotel.get('rooms', [])
            for room in rooms:
                assert 'price' in room, f"Room {room.get('name')} missing price"
                assert room['price'] > 0, f"Room {room.get('name')} has invalid price"
                
                if 'original_price' in room:
                    assert room['original_price'] >= room['price'], "original_price should be >= price"
    
    def test_hotel_rooms_have_amenities(self):
        """Room should have amenities array"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        for hotel in hotels:
            rooms = hotel.get('rooms', [])
            for room in rooms:
                assert 'amenities' in room, f"Room {room.get('name')} missing amenities"
                assert isinstance(room['amenities'], list), "room amenities should be a list"


class TestDubaiHotelsDetails:
    """Verify specific Dubai hotels seeded data"""
    
    def test_burj_al_arab_details(self):
        """Verify Burj Al Arab has correct details"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Dubai")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        burj = next((h for h in hotels if 'Burj Al Arab' in h.get('name', '')), None)
        assert burj is not None, "Burj Al Arab Jumeirah not found"
        
        # Verify specific details
        assert burj.get('star_rating') == 7, "Burj Al Arab should be 7-star"
        assert 'FB' in burj.get('board_types', []), "Burj Al Arab should offer Full Board"
        assert burj.get('supplier_name') == 'Jumeirah Hotels'
        assert len(burj.get('rooms', [])) >= 2, "Burj Al Arab should have at least 2 room types"
    
    def test_atlantis_palm_details(self):
        """Verify Atlantis The Palm has correct details"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Dubai")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        atlantis = next((h for h in hotels if 'Atlantis' in h.get('name', '')), None)
        assert atlantis is not None, "Atlantis The Palm not found"
        
        # Verify specific details
        assert atlantis.get('star_rating') == 5, "Atlantis should be 5-star"
        assert 'Aquaventure' in str(atlantis.get('amenities', [])), "Atlantis should have Aquaventure"
        assert atlantis.get('supplier_name') == 'Atlantis Resorts'
        assert len(atlantis.get('rooms', [])) >= 2, "Atlantis should have at least 2 room types"
    
    def test_jw_marriott_marquis_details(self):
        """Verify JW Marriott Marquis has correct details"""
        response = requests.get(f"{BASE_URL}/api/hotels?city=Dubai")
        assert response.status_code == 200
        hotels = response.json().get('hotels', [])
        
        jw = next((h for h in hotels if 'JW Marriott' in h.get('name', '')), None)
        assert jw is not None, "JW Marriott Marquis Dubai not found"
        
        # Verify specific details
        assert jw.get('star_rating') == 5, "JW Marriott should be 5-star"
        assert jw.get('total_rooms') == 1608, "JW Marriott should have 1608 rooms"
        assert jw.get('supplier_name') == 'Marriott Hotels'
