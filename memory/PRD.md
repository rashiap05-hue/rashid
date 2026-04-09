# Travo DMC - B2B Travel Platform

## Problem Statement
Migrate and enhance a B2B Travel Platform (Travo DMC) from an old TypeScript/Express/SQLite stack to React, FastAPI, and MongoDB.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, Shadcn UI
- **Backend**: FastAPI, PyMongo (Motor async), Pydantic v2
- **Database**: MongoDB
- **AI**: Gemini via `emergentintegrations` with Emergent LLM Key
- **Email**: Resend (real transactional emails)
- **PDF**: WeasyPrint (HTML-to-PDF generation)

## Architecture
```
/app/backend/
  server.py, db.py, seed.py, airports_data.py
  models/schemas.py
  routes/
    auth.py, proposals.py, flights.py, hotels.py, airports.py, cities.py,
    transfers.py, activities.py, terms.py, ai.py, payments.py, sheets.py,
    admin.py, supplier.py, uploads.py, settings.py, flight_api.py,
    bookings.py, passport_scan.py, experts.py, wallets.py,
    notifications.py, pdf_generator.py, email_service.py

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
- My Bookings Dashboard: filterable data table

### Session 3 (April 2026)
- **Booking Detail Page**: Full page from My Bookings row click
- **Booking Status Tracker**: 5-stage visual timeline (Hold → Payment Pending → Payment Received → Confirmed → Ticketed)
  - Full tracker on Booking Detail, mini tracker on My Bookings rows, Admin "Bookings" tab
  - Role-gated: Only Admin/Staff can advance status
- **In-app Notification System**: Bell with unread badge, dropdown, mark-all-read

### Session 4 (April 2026)
- **PDF Proposal Generation**: Professional branded PDF with cover page, day-wise itinerary, hotel/flight details, pricing summary, inclusions, and terms & policies. Generated via WeasyPrint on backend, downloaded from ProposalView.
- **Resend Email Integration**: Real transactional emails for:
  - Proposal sharing (Send Email modal on ProposalView)
  - Booking status change notifications (auto-triggered when admin advances status)
  - Booking confirmation summaries (auto-sent when status reaches "Confirmed")
- **View Quote Navigation Fix**: Booking Detail "View Quote" button now navigates to ProposalView

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Collections
wallets, wallet_transactions, payment_proofs, statements, held_bookings (with status_history), notifications, destination_experts, proposals, bookings, hotels, flights, activities, transfers, cities, airports, terms_policies, insurance_prices, users

## Key API Endpoints
- `GET /api/proposals/{id}/pdf` - Generate & download PDF
- `POST /api/email/send-proposal` - Send proposal email via Resend
- `PUT /api/bookings/{id}/status/advance` - Advance booking status (admin only)
- `GET /api/notifications` / `GET /api/notifications/unread-count`

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P2: AI-powered trip recommendations frontend
- P3: Real Flight API (Airlabs), Multi-currency, Mobile optimization

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Payment processing (Pay Now alert)
