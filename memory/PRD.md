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
    schemas.py       (All Pydantic models)
  routes/
    auth.py          (Login, signup, me)
    proposals.py     (CRUD + PDF generation)
    flights.py       (CRUD + mock search)
    hotels.py        (CRUD with recommended sorting)
    airports.py      (CRUD with pagination)
    cities.py        (CRUD with search)
    transfers.py     (CRUD + inter-city search)
    activities.py    (CRUD with partial update)
    terms.py         (Terms & policies CRUD)
    ai.py            (Chat, recommendations, itinerary)
    payments.py      (Stripe checkout + webhook)
    sheets.py        (Google Sheets - MOCKED)
    admin.py         (User management, stats)
    supplier.py      (Dashboard, bookings, earnings)
    uploads.py       (Image/video upload)
    settings.py      (Insurance pricing)
    flight_api.py    (Aviationstack integration)
```

## Completed Features
- Full authentication system (JWT)
- Proposals CRUD with PDF generation
- Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic pricing, vehicle-based pricing
- AI Itinerary Generator (Gemini) with auto-fill to Day Cards
- Multi-city hotel selection (keyed by cityIndex)
- Inter-city transfer support (excluding inter-hotel in modal)
- Country-based insurance pricing with fallback
- Country dropdowns for Admin forms
- Recommended hotels/rooms with badges
- Admin Dashboard, Supplier Dashboard
- Terms & Policies management
- Backend refactoring Phase 1: Models extracted to schemas.py
- Backend refactoring Phase 2: Routes extracted to modular files (server.py 3370 → 87 lines)
- P0 Bug Fix: Inter-city transfer search now excludes inter-hotel direction

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
