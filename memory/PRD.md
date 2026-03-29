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
    settings.py, flight_api.py, bookings.py

/app/frontend/src/
  App.js             (Routes, api instance, resolveImageUrl utility)
  components/
    ProposalView.jsx (~3000 lines - Inclusions tab, pricing sidebar, Detail modals)
    BookingConfirmation.jsx (NEW - Traveler forms, payment, attachments, consent)
    TransferEditForm.jsx (Rich tabbed form)
    TripBuilder.jsx  (Edit hydration, inter-city transfers)
    AdminDashboard.jsx, Dashboard.jsx, etc.
    TripBuilder/
      SaveProposalModal.jsx (Shadcn dual-month calendar)
      VersionHistoryPanel.jsx
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
- Transfer Image URL Fix
- PDF Generation Enhancement
- Day Card Image Priority Fix
- Database URL Migration (absolute -> relative paths)
- UI Left Sidebar (icons, expand on hover)
- Price Breakdown Interactive Features (markup/discount modal, eye toggle)
- Interactive Modals (Hold Booking, Book Now Terms)
- Dual-Month Calendar Date Picker
- Inclusions Section: Flat day-wise layout with chronological sorting
- **Booking Confirmation Page** (March 2026): Full traveler details form, attachment upload, special occasion selection, contact information, collapsible important info, payment options (partial/full), consent validation, timestamp recording, right sidebar with price summary/coupon/trip details, guaranteed security section. Backend API: POST/GET /api/bookings.

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## Key Technical Concepts
- **Data Mapping Rule**: Hotels/activities keyed as `{cityName}_{cityIndex}` (e.g., `Tbilisi_0`, `Gudauri_1`). Activity lookup uses `startsWith(cityName_)` for broader matching.
- **Image URLs**: Stored as relative paths (`/api/static/activities/xxx.jpg`), resolved via `resolveImageUrl()` in frontend
- **Breakfast Logic**: Arrival Day = Not Included. Middle/Departure Days = Included at hotel
- **Day Card Image Priority**: Activity > Transfer > Generic fallback (no hotel images in day cards)
- **Inclusions Rendering**: Two versions (inline + tab). Both merge transfers + activities and sort by day number chronologically.
- **State-based Routing**: App uses `currentView` state, not URL routing. Views: dashboard, form, customize, proposal-view, booking-confirmation, admin, etc.

## Upcoming Tasks
- P1: Google Sheets Sync (blocked on user credentials)
- P2: Payment integrations (Stripe & PayPal) - connect to Booking Confirmation page
- P2: AI-powered trip recommendations frontend
- P3: Real Flight API (Airlabs) - needs API key
- P3: Email notifications
- P3: Multi-currency support
- P3: Mobile optimization

## Refactoring Needed
- ProposalView.jsx (~3000 lines) - Extract PriceSidebar, LeftSidebarNav, Inclusions into sub-components under /components/Proposal/
- MyProposals.jsx - Fix HTML hydration warning (<tr> inside <span>)

## MOCKED APIs
- Google Sheets sync (/api/sheets/*)
- PayPal checkout (/api/payments/paypal/checkout)
- Aviationstack flight API (requires user API key)
- Payment processing in BookingConfirmation (currently shows alert)

## 3rd Party Integrations
- Gemini AI (Chatbot & Itineraries) - Emergent LLM Key
- Stripe (Payments) - test key available in pod
- Aviationstack (Flight data) - requires User API Key
- Google Sheets (Data Sync) - requires User OAuth
