# Travo DMC - B2B Travel Platform

## Problem Statement
Migrate and enhance a B2B Travel Platform (Travo DMC) from an old TypeScript/Express/SQLite stack to React, FastAPI, and MongoDB.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Framer Motion, Axios, Shadcn UI
- **Backend**: FastAPI, PyMongo (Motor async), Pydantic v2, WeasyPrint, Resend
- **Database**: MongoDB
- **AI**: Gemini via `emergentintegrations` with Emergent LLM Key
- **Email**: Resend (real transactional emails)
- **PDF**: WeasyPrint (HTML-to-PDF generation)
- **Exchange Rates**: open.er-api.com (live rates, 1hr cache)

## Architecture
```
/app/backend/routes/
  auth.py, proposals.py, flights.py, hotels.py, airports.py, cities.py,
  transfers.py, activities.py, terms.py, ai.py, payments.py, sheets.py,
  admin.py, supplier.py, uploads.py, settings.py, flight_api.py,
  bookings.py, passport_scan.py, experts.py, wallets.py,
  notifications.py, pdf_generator.py, email_service.py, currency.py

/app/frontend/src/
  App.js, CurrencyContext.jsx
  components/
    Header.jsx (responsive hamburger + currency selector)
    BookingDetail.jsx, BookingStatusTracker.jsx, ProposalView.jsx,
    BookingConfirmation.jsx, PaymentPage.jsx, WalletPage.jsx,
    StaffDashboard.jsx, MyBookings.jsx, AdminDashboard.jsx,
    TransferEditForm.jsx, TripBuilder.jsx, Dashboard.jsx
    TripBuilder/SaveProposalModal.jsx, VersionHistoryPanel.jsx
```

## Completed Features

### Core (Sessions 1-2)
- Full auth (JWT), Proposals CRUD, Hotels/Flights/Activities/Transfers CRUD
- Trip Builder, AI Itinerary Generator, Proposal Versioning, Booking Confirmation
- Payment Page, Accept/Hold logic, Destination Experts, Send Email & WhatsApp modals
- Wallet & Account Statement system, My Bookings Dashboard

### Session 3
- Booking Detail Page, Booking Status Tracker (5-stage), In-app Notifications

### Session 4
- PDF Proposal Generation (WeasyPrint, professional branded PDF)
- Resend Email Integration (proposal sharing, status notifications, confirmations)

### Session 5 (Current)
- **Multi-Currency Support**: AED (default) + USD, EUR, GBP, INR
  - Live exchange rates via open.er-api.com with 1hr server-side caching + fallback rates
  - Global currency selector in header (persists via localStorage)
  - CurrencyContext provides format()/convert() hooks used across all pages
  - Applied to: MyBookings, BookingDetail, AdminDashboard (bookings tab)
- **Full Mobile Responsive Optimization**:
  - Header: Hamburger slide menu on mobile (< 1024px) with expandable submenus
  - Dashboard: Responsive banner (200px mobile), 2-col quick links, stacked stats
  - MyBookings: Responsive filter bar, horizontally scrollable table
  - BookingDetail: Stacked sidebar, 2-col guest info grid, responsive forms
  - Footer: 2-col → 4-col grid

## Test Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123

## Key API Endpoints
- `GET /api/currency/rates` - Live exchange rates (public, no auth)
- `GET /api/proposals/{id}/pdf` - Download PDF
- `POST /api/email/send-proposal` - Send proposal email
- `PUT /api/bookings/{id}/status/advance` - Advance status (admin only)
- `GET /api/notifications` / `GET /api/notifications/unread-count`

### Session 6
- **Transfer Selection Modal Redesign**: Overhauled the transfer modal in TripBuilder.jsx
  - Categories sidebar (All Options, Private, etc.) for filtering by transfer_type
  - Time filters (All, Morning, Afternoon, Evening) filtering by pickup_times
  - Search bar filtering by title and description
  - Rich descriptive transfer cards with price, duration, pickup times
  - Fixed `leavingOn is not defined` runtime error (→ `data?.leaving_on`)
- **Transfer Card Remove Button**: Added remove/trash button to arrival and departure transfer cards in DayCard.jsx
  - Appears alongside Change button when a transfer is selected
  - Clears the selected transfer and resets price in Trip Summary
- **Activity Modal Redesign**: Completely rebuilt ActivitiesModal.jsx to match Transfer Modal pattern
  - Clean white header with "Add Activity in {city} (Day X: {date})" format
  - Categories sidebar (All Options + dynamic categories from DB)
  - Time filters: All, Morning, Afternoon, Full Day
  - Rich vertical card layout with title, starts/duration, description with ...more, transfer info, Private Transfers badge, price, Select button
  - Search bar filtering by name and description
- **Visa Management**: Full CRUD backend + Admin Dashboard tab + Trip Builder integration
  - `/api/visas` CRUD endpoints (GET, POST, PUT, PATCH, DELETE)
  - Admin Dashboard "Visas" tab with table view and Add/Edit/Delete modal
  - Visa card on Customize Your Trip page with ADD/REMOVE toggle
  - `/api/settings/visa` endpoint reads from visas collection with country defaults fallback
  - Seeded: Georgia, Turkey, Thailand visa entries
- **SIM Card Management**: Full CRUD backend + Admin Dashboard tab + Trip Builder integration
  - `/api/sim-cards` CRUD endpoints (GET, POST, PUT, PATCH, DELETE)
  - Admin Dashboard "SIM Cards" tab with table view and Add/Edit/Delete modal
  - SIM card section on Customize Your Trip page with ADD/REMOVE toggle, pulls country-specific data
  - Seeded: Georgia (Magti 10GB), Turkey (Turkcell 20GB), Thailand (AIS 15GB)

### Session 7
- **Live Hotel Search in Modal**: Added in-modal API search dropdown to HotelOptionsModal.jsx
  - Typing in "Looking for a particular hotel" input now searches `/api/hotels?search=&city=` in real-time
  - 300ms debounce, shows matching hotels with star rating and city label
  - Clicking a result directly selects the hotel and closes the modal
  - Wired `onSelectHotel` prop from TripBuilder.jsx parent
- **No Stay Card Redesign**: Redesigned the "No Stay" hotel card in Trip Builder to match reference design
  - "No Stay Included" bold heading with building icon + X badge
  - Check-in / Check-out dates with labels and vertical divider
  - Gray info box: "STAY INFORMATION BOOKED SEPARATELY" + "update stay details" link
  - Dark maroon "Change Hotel" button
  - Amber warning banner about SIC transfers and pickup location costs
  - "Update stay details" link opens "Stay details booked separately" modal with:
    - Stay Type dropdown (Hotel - Own Arrangement, Airbnb, Friends/Family, Other)
    - Hotel search field with live API search
    - "Not able to find the hotel?" checkbox with manual name input
    - SAVE button persists stay details to state
  - After saving: gray info box shows hotel name with star rating (e.g., "Courtyard by Marriott Baku (4 star)")
  - Trip Summary sidebar shows red "Stay in {city} - Please provide stay information" alert when no stay details provided
  - Alert and warning banner disappear once stay details are saved with a hotel

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P2: AI-powered trip recommendations frontend
- P2: Verify Resend domain for production email delivery

## Future/Backlog
- P3: Real Flight API (Airlabs), Google Sheets Sync (needs OAuth)
- Refactoring: ProposalView.jsx (~3,500 lines) component extraction
- Refactoring: TripBuilder.jsx (~2,300 lines) component extraction

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Payment processing (Pay Now alert)
