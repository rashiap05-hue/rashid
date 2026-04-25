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
- **Auto-Recommendation Engine**: On Create Proposal, automatically pre-selects:
  - Hotels: Top recommended hotel for each city (based on `recommended` flag, then rating)
  - Transfers: Cheapest arrival transfer for first city, cheapest departure for last city
  - Activities: 1-2 activities per day (max 10 hours), auto-assigns vehicle based on pax count
  - All auto-selections are fully changeable/removable by the user
  - Skipped when editing existing proposals (`data.isEditing`)

### Session 8
- **Hold Booking from BookingConfirmation Page (Feb 2026)**: Fixed "Hold Booking Until XX" button on BookingConfirmation page — previously it had no `onClick` handler and clicking did nothing.
  - Wired `handleHoldBooking` → `POST /api/proposals/{id}/hold` with loading/success/error states
  - Added inline success (amber) / error (red) feedback with Framer Motion
  - On success: 1.2s delay then redirects to Dashboard → My Bookings tab
  - Added `onHoldBooking` prop in App.js that clears savedProposal and navigates to held bookings
  - Button hides if proposal is already held or departure is within 28 days (matches ProposalView sidebar behaviour)
- **Hold Booking carries Traveler + Contact Info (Feb 2026)**: Previously, traveler details filled on BookingConfirmation were lost when clicking Hold. Now the hold API accepts `travelers`, `contact_info`, `special_occasion` and persists them on the held booking — so BookingDetail page pre-fills them correctly.
- **Traveler fallback seed (Feb 2026)**: If the user clicks Hold without filling travelers, backend seeds the first traveler with the proposal's `customer_name` so the Traveler Details section is never completely blank. Existing held bookings backfilled via one-time script.
- **Held bookings now visible in Supplier / Admin dashboards (Feb 2026)**: `/proposals/{id}/hold` now also writes the booking into `db.bookings` (in addition to `db.held_bookings`) with `status=held` and `supplier_status=pending`, so Supplier Dashboard (`/api/supplier/bookings`) and Admin supplier booking management (`/api/supplier/bookings/all`) route them correctly based on matched services.
- **Supplier Dashboard stats consistent with bookings list (Feb 2026)**: Refactored `/api/supplier/bookings` + `/api/supplier/dashboard` to share a single `_get_supplier_relevant_bookings` helper. Admins see all bookings (can confirm/reject on behalf of suppliers); suppliers see only bookings with their matched services. Fixes the "stats show 2, list shows 0" inconsistency.
- **Paid bookings flow into My Bookings + "Under Process" status (Feb 2026)**:
  - `POST /api/bookings` now upserts into both `db.bookings` and `db.held_bookings` (reusing the held booking's id when present), so paid bookings always show up in My Bookings.
  - Booking `status` flips from `held` → `payment_received` after payment; `supplier_status` stays `pending` until the supplier confirms/rejects.
  - MyBookings UI now derives a display label: `payment_received + supplier=pending` → "Under Process" (indigo badge); `+ supplier=confirmed` → "Confirmed"; `+ supplier=rejected` → "Rejected by Supplier".
  - PaymentPage auto-navigates to Dashboard → My Bookings tab 1.5s after a successful wallet payment via new `onPaymentSuccess` callback.
- **Proposal PDF redesigned to match reference style (Feb 2026)**: Replaced legacy FPDF generator (~500 lines) in `routes/proposals.py` with a clean WeasyPrint/HTML-CSS implementation in `routes/pdf_generator.py`. New layout includes:
  - Full-bleed cover page with destination image overlay, route summary (e.g., "Tbilisi 2N, Gudauri 1N"), travel date, occupancy, ORN reference, prepared-by block.
  - Itinerary Overview table (Date | Product | Description) listing every hotel/transfer/activity at a glance.
  - Hotel detail pages with image, address, "What to know about this hotel" two-column bullets, and a Room Type / Meal Plan / Confirmation footer.
  - Day-wise itinerary cards with day-number header, weekday date, city, and per-item rows with colored icons and tags (Private Transfer, Stay, Activity, Meal Included, Ticket).
  - Cleaner Pricing Summary, Inclusions/Exclusions in two columns, and Terms & Conditions sections.
- **PDF activity images + rich day-wise details (Feb 2026)**:
  - Activity entries in Day-wise Itinerary now show a thumbnail image (left) plus full description, duration, start times, meeting point, Highlights and Inclusions cards.
  - Backend enriches `selected_activities` and `selected_hotels` with the latest full DB record (description, images, amenities, highlights, inclusions) before rendering.
  - Stale preview-domain image URLs (`/api/static/...`, `/uploads/...`) are auto-resolved to local `file://` paths under `/app/backend/uploads/` so images embed correctly into the PDF regardless of pod URL changes.
  - Hotel amenities parser cleaned up — falls back to a sensible default list when stored as a single concatenated string.
- **PDF cover redesigned to match Bangkok reference (Feb 2026)**: Serif title, "Reference Number: XXXXXXX" line, divider, then 3 SVG-icon-prefixed info rows (📍 cities, 📅 date+nights/days, 👤 occupancy). Cover hero uses first city's activity photo (e.g., Tbilisi sunset cityscape) with priority over hotel/Unsplash fallback.
- **PDF Page 2 "Specially prepared for/by" added (Feb 2026)**: Two-column layout with destination photo strip on the left and dark blue serif headings on the right (customer name, advisor name uppercase, company underlined, phone/email contact rows with circular icons, disclaimer paragraphs at the bottom).
- **Removed PDF blank 3rd page (Feb 2026)**: Stacked `page-break-after` + `page-break-before` was inserting a blank page between "Specially prepared" and "Itinerary Overview" — fixed by removing one.
- **Auto-advance booking status when supplier confirms/rejects (Feb 2026)**:
  - `POST /api/supplier/bookings/{id}/confirm`: when current status is `payment_received`, also flips main `status` to `confirmed` and stamps `confirmed_at`.
  - `POST /api/supplier/bookings/{id}/reject`: when current status is `payment_received`, flips main `status` to `cancelled` and stamps `cancelled_at`.
  - Both endpoints now mirror updates into `db.held_bookings` so MyBookings + BookingDetail stay in sync.
  - Held bookings (not yet paid) keep `status=held`; only `supplier_status` changes — so the agent can still pay and complete the booking flow.
- **AI Trip Recommendations frontend wired (Feb 2026)**: New `AIRecommendationsModal.jsx` mounted on the Home dashboard via a "AI Trip Recommendations" Quick Link card (violet/sparkle icon).
  - Form: free-text preferences, optional budget, duration, travelers count.
  - Calls `/api/ai/recommendations` (Gemini via Emergent LLM Key) and renders parsed destinations as cards with name, description, highlights chips, best time, estimated budget. Shows travel tips below.
  - Loading / error states + "Refine search" back button.
- **Cleaned up React hydration warnings on MyBookings & MyProposals (Feb 2026)**: Visual editor was wrapping inline `{condition ? a : b}` JSX expressions inside `<tbody>` with a tracking `<span>`, producing `<span> tbody` and `<tr> span` HTML hydration warnings. Refactored both tables to:
  - Compute the rows array (`bookingRows`, `proposalRows`) outside the JSX as plain const expressions.
  - Use `<tbody>{rows}</tbody>` directly so no inline conditional sits inside the table.
  - Lifted the `loading` ternary above the bordered wrapper div for cleaner conditional rendering.
  - Verified across multiple tab cycles → 0 console errors.

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P2: AI-powered trip recommendations frontend
- P2: Verify Resend domain for production email delivery

## Future/Backlog
- P3: Real Flight API (Airlabs), Google Sheets Sync (needs OAuth)
- Refactoring: ~~ProposalView.jsx (~3,500 lines) component extraction~~ DONE (2,320 lines, 10 sub-components)
- Refactoring: ~~TripBuilder.jsx (~2,300 lines) component extraction~~ DONE (1,934 lines, 14 sub-components)

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Credit Card/EMI/Tabby payments (wallet payment is LIVE)

## Credentials
- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123
- Supplier: supplier@georgiancars.ge / password123 (company: Travo Georgia)
