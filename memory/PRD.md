# Travo DMC - B2B Travel Platform

## Problem Statement
Migrate and enhance a B2B Travel Platform (Travo DMC) from an old TypeScript/Express/SQLite stack to React, FastAPI, and MongoDB.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, Shadcn UI
- **Backend**: FastAPI, PyMongo (Motor async), Pydantic v2
- **Database**: MongoDB
- **AI**: Gemini via `emergentintegrations` with Emergent LLM Key

## Architecture
```
/app/backend/
  server.py, db.py, seed.py, airports_data.py
  models/schemas.py
  routes/
    auth.py, proposals.py, flights.py, hotels.py, airports.py, cities.py,
    transfers.py, activities.py, terms.py, ai.py, payments.py, sheets.py,
    admin.py, supplier.py, uploads.py, settings.py, flight_api.py,
    bookings.py, passport_scan.py, experts.py, wallets.py, notifications.py

/app/frontend/src/
  App.js
  components/
    BookingDetail.jsx, BookingStatusTracker.jsx, ProposalView.jsx,
    BookingConfirmation.jsx, PaymentPage.jsx, WalletPage.jsx,
    StaffDashboard.jsx, MyBookings.jsx, AdminDashboard.jsx,
    TransferEditForm.jsx, TripBuilder.jsx, Dashboard.jsx, Header.jsx
    TripBuilder/SaveProposalModal.jsx, VersionHistoryPanel.jsx
```

## Completed Features
### Core
- Full auth (JWT), Proposals CRUD, Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic/vehicle-based pricing, AI Itinerary Generator (Gemini)
- Multi-city hotels, inter-city transfers, country-based insurance
- Admin Dashboard, Supplier Dashboard, Terms & Policies
- Proposal Versioning, ProposalView: 2-col day cards, Detail Modals, Inclusions tab
- Booking Confirmation: Multi-traveler form, AI passport scan (Gemini Vision)

### Session 2 (April 2026)
- Payment Page, Accept Proposal logic (30-min hold, Dubai TZ), Hold Booking workflow
- Destination Expert/Staff CRUD + assignment, Send Email & WhatsApp Share Modals
- Wallet & Account Statement system (Agent, Admin, Staff)
- My Bookings Dashboard: filterable data table with date range, status, sorting

### Session 3 (April 2026)
- **Booking Detail Page**: Full page from My Bookings row click. Trip reference header, payment details, flight/hotel cards, traveler forms, 7 collapsible policy sections, right sidebar
- **Real-time Booking Status Tracker**: 5-stage visual timeline (Hold → Payment Pending → Payment Received → Confirmed → Ticketed)
  - Full tracker on Booking Detail page with timestamps and Activity Log audit trail
  - Mini tracker dots on My Bookings table rows
  - Admin Dashboard "Bookings" tab with status management and advance modal
  - Role-gated: Only Admin/Staff can advance status; agents see read-only tracker
- **In-app Notification System**: Bell icon with unread count badge, dropdown with notification list, mark all read. Notifications auto-created on status changes.
- Backend: `routes/notifications.py` (CRUD), `routes/bookings.py` (status advance, admin list)

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Collections
- `wallets`, `wallet_transactions`, `payment_proofs`, `statements`
- `held_bookings` (with `status_history` array for audit trail), `notifications`
- `destination_experts`, `proposals`, `bookings`, `hotels`, `flights`, `activities`, `transfers`, `cities`, `airports`, `terms_policies`, `insurance_prices`, `users`

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P1: Wire email notifications to real email service (currently in-app only)
- P2: PDF Proposal Generation
- P2: AI-powered trip recommendations

## Future/Backlog
- P3: Real Flight API (Airlabs), Multi-currency, Mobile optimization
- P3: Google Sheets Sync (needs OAuth credentials)
- Refactoring: ProposalView.jsx (~3,500 lines)

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Payment processing (Pay Now alert), Send Email (simulated), Email notifications (in-app only)
