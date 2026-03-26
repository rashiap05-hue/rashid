# Travo DMC - B2B Travel Platform

## Problem Statement
Migrate and enhance a B2B Travel Platform (Travo DMC) from an old TypeScript/Express/SQLite stack to React, FastAPI, and MongoDB. Features include authentication, flight/hotel management, trip proposal creation, Admin/Supplier Dashboards, dynamic UI rendering, PDF generation, AI integrations, and complex vehicle-based pricing logic.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, Shadcn UI
- **Backend**: FastAPI, PyMongo (Motor async), Pydantic v2
- **Database**: MongoDB
- **AI**: Gemini via `emergentintegrations` with Emergent LLM Key

## Architecture
```
/app/backend/
  server.py          (~90 lines - thin orchestrator)
  db.py              (DB connection, auth helpers, JWT config)
  seed.py            (All seed data + migrations including transfer URL fix)
  airports_data.py   (Static airport data)
  models/
    schemas.py       (All Pydantic models incl. ActivityExtra)
  routes/
    auth.py, proposals.py (incl. PDF generation), flights.py, hotels.py,
    airports.py, cities.py, transfers.py, activities.py, terms.py, ai.py,
    payments.py, sheets.py, admin.py, supplier.py, uploads.py,
    settings.py, flight_api.py

/app/frontend/src/
  App.js             (Routes, api instance, resolveImageUrl utility)
  components/
    ProposalView.jsx (2-col layout, DetailViewModals, openTransferDetail with API fetch)
    TransferEditForm.jsx (Rich tabbed form, stores relative image paths)
    TripBuilder.jsx  (Edit hydration, inter-city transfers)
    AdminDashboard.jsx, Dashboard.jsx, etc.
```

## Completed Features
- Full authentication system (JWT)
- Proposals CRUD with PDF generation (multi-city support)
- Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic pricing, vehicle-based pricing
- AI Itinerary Generator (Gemini) with auto-fill to Day Cards
- Multi-city hotel selection (keyed by cityIndex)
- Inter-city transfer support
- Country-based insurance pricing
- Recommended hotels/rooms with badges
- Admin Dashboard, Supplier Dashboard
- Terms & Policies management
- Backend refactoring (server.py 3370 -> 90 lines)
- Activity Extras with vehicle-based pricing
- Proposal Edit Hydration fix
- Save Proposal Modal Enhancement
- Proposal Versioning (save/view/restore snapshots)
- ProposalView data display fix (cityName_cityIndex mapping)
- Detail View Modals for transfers/activities
- Day Card Two-Column Layout
- Transfer Edit Form (rich tabbed UI)
- Breakfast/Meal Logic fix
- **Transfer Image URL Fix (March 2026)**: Fixed double `/api/api/` paths and wrong domain in stored transfer image URLs. Added backend migration (`migrate_transfer_image_urls`) to normalize to relative paths. Added `resolveImageUrl()` frontend utility. DetailViewModal now fetches full transfer data via API for images/description.
- **PDF Generation Enhancement (March 2026)**: Fixed multi-city hotel/activity lookups in PDF to use `cityName_cityIndex` keys. Added inter-city transfer rendering. Fixed cumulative check-in/check-out date calculation. Departure day now shows correct breakfast logic.

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Name
- `test_database` (from .env DB_NAME)

## Key Technical Concepts
- **Data Mapping Rule**: Hotels/activities keyed as `{cityName}_{cityIndex}` (e.g., `Tbilisi_0`, `Gudauri_1`)
- **Image URLs**: Stored as relative paths (`/api/static/activities/xxx.jpg`), resolved via `resolveImageUrl()` in frontend
- **Breakfast Logic**: Arrival Day = Not Included. Middle/Departure Days = Included at hotel

## Upcoming Tasks
- P1: Google Sheets Sync (blocked on user credentials)
- P2: Payment integrations (Stripe & PayPal)
- P2: AI-powered trip recommendations frontend
- P3: Real Flight API (Airlabs) - needs API key
- P3: Email notifications
- P3: Multi-currency support
- P3: Mobile optimization

## Refactoring Needed
- ProposalView.jsx (~2400 lines) - Extract Day Cards, Detail Modals into sub-components
- MyProposals.jsx - Fix HTML hydration warning (`<tr>` inside `<span>`)

## MOCKED APIs
- Google Sheets sync (/api/sheets/*)
- PayPal checkout (/api/payments/paypal/checkout)
- Aviationstack flight API (requires user API key)

## 3rd Party Integrations
- Gemini AI (Chatbot & Itineraries) - Emergent LLM Key
- Stripe (Payments) - test key available in pod
- Aviationstack (Flight data) - requires User API Key
- Google Sheets (Data Sync) - requires User OAuth
