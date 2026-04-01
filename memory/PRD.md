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
    ProposalView.jsx, BookingConfirmation.jsx, PaymentPage.jsx
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

### Latest Session (April 2026)
- **Payment Page**: 4 methods (Credit Card, Bank EMI, Wallet, Tabby), wired from BookingConfirmation
- **Accept Proposal**: 30-min hold, notification modal, "Accepted on" badge (Dubai TZ)
- **Hold Booking**: Creates booking record, moves to "My Bookings", removes from "My Proposals", hidden if < 1 week
- **Send Email Modal**: Full email composition with templates
- **WhatsApp Share Modal**: Pre-filled message with proposal link
- **Destination Expert/Staff**: CRUD + assignment to proposals, card on ProposalView sidebar
- **Wallet & Account System** (NEW):
  - Agent: Balance cards, transactions table, download CSV statement, upload payment proof
  - Admin: Wallets tab (all agents, top-up, pending approvals)
  - Staff: Agent wallets, top-up/refund, approve/reject proofs, bank statement upload
  - Transaction types: Credit, Debit, Refund
  - Auto-credit on payment proof approval
  - All amounts in AED

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## DB Collections
- `wallets` (user_id, balance, currency)
- `wallet_transactions` (wallet_user_id, type, amount, note, performed_by)
- `payment_proofs` (user_id, amount, reference, file_url, status)
- `statements` (file_url, note, uploaded_by)
- `held_bookings`, `destination_experts`, `proposals`, `bookings`, `hotels`, `flights`, `activities`, `transfers`, `cities`, `airports`, `terms_policies`, `insurance_prices`, `users`

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P1: Wire SendEmailModal to real email service
- P2: PDF Proposal Generation, AI trip recommendations

## Future/Backlog
- P3: Real Flight API (Airlabs), Email notifications, Multi-currency, Mobile optimization
- Refactoring: ProposalView.jsx (~3400 lines)

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Payment processing (Pay Now alert), Send Email (simulated)
