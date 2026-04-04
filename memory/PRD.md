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
    bookings.py, passport_scan.py, experts.py, wallets.py

/app/frontend/src/
  App.js
  components/
    BookingDetail.jsx, ProposalView.jsx, BookingConfirmation.jsx, PaymentPage.jsx
    WalletPage.jsx, StaffDashboard.jsx, MyBookings.jsx
    AdminDashboard.jsx (StaffExpertsTab, AdminWalletTab)
    TransferEditForm.jsx, TripBuilder.jsx, Dashboard.jsx, Header.jsx
    TripBuilder/SaveProposalModal.jsx, VersionHistoryPanel.jsx
```

## Completed Features
### Core
- Full auth (JWT), Proposals CRUD + PDF, Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic/vehicle-based pricing, AI Itinerary Generator (Gemini)
- Multi-city hotels, inter-city transfers, country-based insurance
- Admin Dashboard, Supplier Dashboard, Terms & Policies
- Proposal Versioning, ProposalView: 2-col day cards, Detail Modals, Inclusions tab
- Booking Confirmation: Multi-traveler form, AI passport scan (Gemini Vision)

### Previous Session (April 2026)
- **Payment Page**: 4 methods (Credit Card, Bank EMI, Wallet, Tabby), wired from BookingConfirmation
- **Accept Proposal**: 30-min hold, notification modal, "Accepted on" badge (Dubai TZ)
- **Hold Booking**: Creates booking record, moves to "My Bookings", removes from "My Proposals", hidden if < 1 week
- **Send Email Modal**: Full email composition with templates
- **WhatsApp Share Modal**: Pre-filled message with proposal link
- **Destination Expert/Staff**: CRUD + assignment to proposals, card on ProposalView sidebar
- **Wallet & Account System**: Agent balance, transactions, CSV download, payment proof upload; Admin/Staff wallet management
- **My Bookings Dashboard**: Complex filterable data table with date range, status, column filters, sorting

### Current Session (April 2026)
- **Booking Detail Page** (DONE): Full page opened from My Bookings row click. Includes:
  - Trip reference header with "Please complete payment" title + status badge
  - View Quote button, Guest details (name, email, phone, travel date, guests, submission time)
  - Payment Details with hold warning, total price, payment table, outstanding amount, Click-to-pay
  - Attached Trips summary, Flight cards (airline, baggage, fare class/type, PNR, status)
  - Hotel cards (image, stars, address, check-in/out, room type, meals, nights, confirmation, voucher download)
  - Traveler Details form (title, name, DOB, passport, expiry, nationality, document upload)
  - 7 collapsible sections (Important Notes, Terms, Scope, Payment/Airline/Cancellation Policy, Amendments)
  - Right sidebar: Seller Details, Destination Expert, Booking Summary
  - Backend: GET /api/held-bookings/{id} (enriched), PUT /api/bookings/{id}/travelers
  - Full routing wired: App.js → Dashboard → MyBookings → BookingDetail

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Collections
- `wallets`, `wallet_transactions`, `payment_proofs`, `statements`
- `held_bookings`, `destination_experts`, `proposals`, `bookings`, `hotels`, `flights`, `activities`, `transfers`, `cities`, `airports`, `terms_policies`, `insurance_prices`, `users`

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P1: Wire SendEmailModal to real email service
- P2: PDF Proposal Generation, AI trip recommendations

## Future/Backlog
- P3: Real Flight API (Airlabs), Email notifications, Multi-currency, Mobile optimization
- Refactoring: ProposalView.jsx (~3,500 lines)

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Payment processing (Pay Now alert), Send Email (simulated)
