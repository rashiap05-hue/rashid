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
  server.py, db.py, seed.py, airports_data.py
  models/schemas.py
  routes/
    auth.py, proposals.py, flights.py, hotels.py, airports.py, cities.py,
    transfers.py, activities.py, terms.py, ai.py, payments.py, sheets.py,
    admin.py, supplier.py, uploads.py, settings.py, flight_api.py,
    bookings.py, passport_scan.py, experts.py

/app/frontend/src/
  App.js
  components/
    ProposalView.jsx (~3300 lines - includes DestinationExpertCard, SendEmailModal, PriceSidebar, DetailViewModal)
    BookingConfirmation.jsx (Traveler forms, AI passport scan)
    PaymentPage.jsx (4 payment methods: Credit Card, Bank EMI, Wallet, Tabby)
    AdminDashboard.jsx (includes StaffExpertsTab with CRUD + assignment)
    TransferEditForm.jsx, TripBuilder.jsx, Dashboard.jsx
    TripBuilder/SaveProposalModal.jsx, VersionHistoryPanel.jsx
```

## Completed Features (All Sessions)
- Full authentication system (JWT)
- Proposals CRUD with PDF generation
- Hotels/Flights/Activities/Transfers/Cities/Airports CRUD
- Trip Builder with dynamic pricing, vehicle-based pricing
- AI Itinerary Generator (Gemini)
- Multi-city hotel selection, inter-city transfers
- Country-based insurance pricing
- Admin Dashboard, Supplier Dashboard
- Terms & Policies management
- Activity Extras with vehicle-based pricing
- Proposal Versioning (save/view/restore snapshots)
- ProposalView: 2-column day cards, Detail Modals, Inclusions tab
- Transfer Edit Form (rich tabbed UI)
- Breakfast/Meal Logic, Transfer Image URL Fix
- UI Left Sidebar, Price Breakdown (markup/discount modal, eye toggle)
- Interactive Modals (Hold Booking, Book Now Terms)
- Dual-Month Calendar Date Picker
- Booking Confirmation Page: Multi-traveler form, AI passport scanning (Gemini Vision), validations
- Payment Page: 4 methods (Credit Card, Bank EMI, Wallet, Tabby), wired from BookingConfirmation

### Latest Session (April 2026)
- **Payment Page Wired**: Full flow Proposal View → Booking → Payment with back navigation
- **Bank EMI Option**: 6 UAE banks + 3/6/9/12 month tenure selection
- **Accept Proposal**: Backend `/api/proposals/{id}/accept` holds proposal for 30 minutes, shows notification modal with hold expiry (Dubai timezone), replaces button with "Accepted on [date, time]" badge
- **Hold Booking Button Removed**: Per user request
- **Need Help Button**: Wired to navigate to "Request Changes" tab
- **Send Email Modal**: "MAIL" button opens full email composition modal with proposal name editing, template selection, body editing, and checkboxes for excluding price/link from email
- **Destination Expert / Staff Role**: 
  - New `destination_experts` collection with full CRUD API (`/api/experts`)
  - Expert assignment to proposals (`/api/experts/assign/{proposal_id}`)
  - Expert card displayed above Price Breakdown in ProposalView sidebar
  - Admin "Staff / Experts" tab with expert management + proposal assignment table
  - 3 seeded experts (Sumila/Bangalore, Ahmed/Dubai, Priya/Delhi)

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## Key Technical Concepts
- **Data Mapping**: Hotels/activities keyed as `{cityName}_{cityIndex}`
- **Image URLs**: Relative paths resolved via `resolveImageUrl()` in frontend
- **Breakfast Logic**: Arrival = Not Included, Middle/Departure = Hotel dependent
- **State-based Routing**: `currentView` state (dashboard, form, customize, proposal-view, booking-confirmation, payment, admin)
- **Dubai Timezone**: Accept proposal timestamps displayed in `Asia/Dubai` timezone

## DB Collections
- `proposals` (with `assigned_expert_id`, `accepted_at`, `hold_until`)
- `destination_experts` (id, name, email, phone, location, photo)
- `bookings`, `hotels`, `flights`, `activities`, `transfers`, `cities`, `airports`, `terms_policies`, `insurance_prices`, `users`

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P1: Google Sheets Sync (blocked on user credentials)
- P2: AI-powered trip recommendations frontend
- P2: PDF Proposal Generation

## Future/Backlog
- P3: Real Flight API (Airlabs) - needs API key
- P3: Email notifications (wire SendEmailModal to real email service)
- P3: Multi-currency support
- P3: Mobile optimization
- Refactoring: ProposalView.jsx (~3300 lines → sub-components)

## MOCKED APIs
- Google Sheets sync, PayPal checkout, Aviationstack flight API
- Payment processing (Pay Now shows alert), Send Email (simulated delay)

## 3rd Party Integrations
- Gemini AI (Chatbot, Itineraries, Passport Vision) - Emergent LLM Key
- Stripe (Payments) - test key available in pod
- Aviationstack (Flight data) - requires User API Key
- Google Sheets (Data Sync) - requires User OAuth
