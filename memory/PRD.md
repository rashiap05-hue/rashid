# Travo DMC - B2B Travel Platform

## Problem Statement
Migrate and enhance a B2B Travel Platform (Travo DMC) from an old TypeScript/Express/SQLite stack to React, FastAPI, and MongoDB. Features include authentication, flight/hotel management, trip proposal creation, Admin/Supplier Dashboards, dynamic UI rendering, PDF generation, AI integrations, and complex vehicle-based pricing logic.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, Shadcn UI
- **Backend**: FastAPI, PyMongo (Motor async), Pydantic v2
- **Database**: MongoDB
- **AI**: Gemini via `emergentintegrations` with Emergent LLM Key

## Architecture (Post-Refactoring)
```
/app/backend/
  server.py          (~87 lines - thin orchestrator)
  db.py              (DB connection, auth helpers, JWT config)
  seed.py            (All seed data + migrations)
  airports_data.py   (Static airport data)
  models/
    schemas.py       (All Pydantic models incl. ActivityExtra)
  routes/
    auth.py, proposals.py, flights.py, hotels.py, airports.py,
    cities.py, transfers.py, activities.py, terms.py, ai.py,
    payments.py, sheets.py, admin.py, supplier.py, uploads.py,
    settings.py, flight_api.py
```

## Completed Features
- Full authentication system (JWT)
- Proposals CRUD with PDF generation
- Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic pricing, vehicle-based pricing
- AI Itinerary Generator (Gemini) with auto-fill to Day Cards
- Multi-city hotel selection (keyed by cityIndex)
- Inter-city transfer support (inter-hotel only in modal)
- Country-based insurance pricing with fallback
- Country dropdowns for Admin forms
- Recommended hotels/rooms with badges
- Admin Dashboard, Supplier Dashboard
- Terms & Policies management
- Backend refactoring Phase 1: Models extracted to schemas.py
- Backend refactoring Phase 2: Routes extracted to modular files (server.py 3370 -> 87 lines)
- P0 Bug Fix: Inter-city transfer search filters to inter-hotel direction only
- **Activity Extras**: Purchasable add-ons per activity with name, description, price, optional vehicle-based pricing. Admin form has "Extras" tab. Trip Builder DayCard shows extras as checkboxes. Selected extras add to trip total.
- **P0 Fix: Proposal Edit Hydration (March 2026)**: Fixed critical bug where editing a saved proposal would not populate previously selected hotels, activities, extras, and transfers in the TripBuilder. Root cause: `selected_extras` and `inter_city_transfers` were missing from Pydantic schemas and backend save document. Also enhanced TripBuilder useEffect to restore activityVehicles, transferVehicles, and interCityTransfers state maps.
- **Save Proposal Modal Enhancement (March 2026)**: When editing a saved proposal, the Save Proposal modal now pre-fills all previously saved customer details (name, email, phone), proposal name, markup, discount, booking date, and flights booked status. Customer info displays in a read-only card with "change customer" option. Added "Save as a New Proposal" checkbox. Added hotel star rating inconsistency warning. Update flow uses PUT instead of POST for existing proposals.
- **Proposal Versioning (March 2026)**: Manual version snapshots with optional notes. Version history sidebar in TripBuilder (when editing). "Restore as New Proposal" creates a copy from any past version. Backend: `POST /api/proposals/{id}/versions`, `GET /api/proposals/{id}/versions`, `POST /api/proposals/{id}/versions/{version_id}/restore`.
- **ProposalView Data Display Fix (March 2026)**: Fixed critical bug where ProposalView showed "No hotel selected" and missing activities/transfers despite data being saved. Root cause: hotel keys saved as `CityName_cityIndex` (e.g., `Tbilisi_0`) but viewed by plain city name. Added `getDayCityInfo()` helper for multi-city day-to-city mapping. Fixed cumulative check-in date calculation for multi-city trips.
- **Detail View Modals (March 2026)**: VIEW buttons on transfers and activities in ProposalView now open a detail modal showing full information — title, vehicle type, route (from/to), description, highlights, inclusions, start times, and photos.
- **Day Card Two-Column Layout (March 2026)**: Restructured ProposalView day cards with large image on left, content on right (warning → description with "...more" → notes → transfer → activity → hotel → meals). Applied to all day types.
- **Transfer Edit Form (March 2026)**: Created rich tabbed TransferEditForm matching ActivityEditForm — tabs: Basic Info, Photos & Video, Timing & Schedule, Route Details, Vehicle Pricing, Supplier. Added images, highlights, inclusions, exclusions, notes fields to Transfer schema.

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Name
- `test_database` (from .env DB_NAME)

## Upcoming Tasks
- P1: Google Sheets Sync (blocked on user credentials)
- P2: Payment integrations (Stripe & PayPal)
- P2: AI-powered trip recommendations frontend
- P3: Real Flight API (Airlabs) - needs API key
- P3: Email notifications
- P3: Multi-currency support
- P3: Mobile optimization

## MOCKED APIs
- Google Sheets sync (/api/sheets/*)
- PayPal checkout (/api/payments/paypal/checkout)
- Aviationstack flight API (requires user API key)

## 3rd Party Integrations
- Gemini AI (Chatbot & Itineraries) - Emergent LLM Key
- Stripe (Payments) - test key available in pod
- Aviationstack (Flight data) - requires User API Key
- Google Sheets (Data Sync) - requires User OAuth
