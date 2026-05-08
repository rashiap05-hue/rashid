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

### Session 9 (Apr 2026)
- **Invoice & Voucher PDF Generation (Apr 2026)**: New `routes/invoice_voucher.py` registered in server.py.
  - `GET /api/bookings/{id}/invoice-pdf` — Proforma Invoice PDF (header, Issued To, Transaction Details with booking ref/dates, Guest Names, service Description blocks, Notes, Totals with Balance Due) — modeled on user reference.
  - `GET /api/bookings/{id}/voucher-pdf` — Travel Voucher PDF (Trip Reference, Itinerary, Guest Details, Hotel block per city with check-in/out, Inclusions, Cancellation Policy, full Terms & Conditions on page 2).
  - `POST /api/bookings/{id}/send-invoice` & `POST /api/bookings/{id}/send-voucher` — Email PDF as attachment via Resend (base64 attachment), stamps `last_invoice_sent_at` / `last_voucher_sent_at` on booking.
  - Frontend `BookingDetail.jsx` `handleDocAction` rewired to hit the new endpoints for Download / Print / Email.
  - Verified via curl: invoice PDF (16KB) and voucher PDF (22KB) generate with valid `%PDF-1.7` headers and correct sections (analyzed via Gemini Vision).
- **Trip Change Request Modal (Apr 2026)**: "Add Trip Change Request" button on `BookingDetail.jsx` Seller Details card now opens a modal popup matching user reference.
  - `routes/change_requests.py` registered in server.py with `POST/GET /api/bookings/{id}/change-requests`, `GET/PATCH /api/change-requests/{id}` (status update by anyone authenticated), `POST /api/change-requests/{id}/replies` (conversation thread).
  - New `BookingDetail/TripChangeRequestModal.jsx` with: Important Information bullets, AED 100 service charge banner, For dropdown (Complete Trip, Hotels, Transfers, Activities, Flights), Type dropdown (Date Change, Hotel Change, etc.), Description textarea, SAVE button.
  - Stores in `db.trip_change_requests` with status=open, also writes an admin notification.
- **Trip Tasks Sidebar + Conversation Thread (Apr 2026)**: New `BookingDetail/TripTasksCard.jsx` listed below "Add Trip Change Request" button on the right sidebar of BookingDetail.
  - Each task row shows: type/scope, description preview, replies count, relative time, colored status badge (Open=amber, Under Process=orange, Closed=emerald, Rejected=red), "Details" link.
  - New `BookingDetail/TripTaskDetailsModal.jsx` opens conversation thread modal: original request card, alternating reply bubbles (mine = dark blue right-aligned, theirs = gray left-aligned), reply composer with ⌘/Ctrl+Enter shortcut, status dropdown (any authenticated user can change status).
  - Backend stores `replies[]` array on each request with sender_role/name/email/text/created_at.
  - Verified end-to-end via Playwright: create → reply → status change → list refresh all working.
- **Trip Change Request Notifications to Advisors (Apr 2026)**: Bidirectional in-app notifications via `db.notifications` (read by Header bell `/api/notifications`).
  - **Agent creates request** → all admin users (except the requester) + the assigned destination expert (if linked to a user account by email) receive a `change_request_new` notification.
  - **Advisor replies** → original requester gets a `change_request_reply` notification with sender name + message snippet.
  - **Advisor changes status** → original requester gets a `change_request_status` notification with the new status label (Open / Under Process / Closed / Rejected).
  - Verified: rashid creates request → 7 other admins all get unread notifications; testadmin replies + closes → rashid sees 2 new notifications (reply + status) in the notification bell with timestamp + title + message.
- **Operational Dashboard renamed + service-typed tabs (Apr 2026)**: Renamed all user-facing "Supplier Dashboard"/"Supplier Portal"/"Supplier Bookings" labels to "Operational Dashboard"/"Operational Bookings" (Header button, page heading, AdminDashboard tab, footer link).
  - Replaced single Bookings/Services tab structure with 8 service-type tabs: **Bookings | Hotels | Transfers | Activities | Flights | Insurance | Visa | SIM Cards**.
  - New helpers: `SupplierDashboard/serviceExtractors.js` flattens each booking into per-service rows; `SupplierDashboard/ServiceItemsTable.jsx` is a generic columnar table component.
  - Each service tab shows a relevant data table (Hotels: hotel + stars, guest, check-in/out, rooms, meal plan, confirmation; Transfers: kind pill, service, vehicle, passenger, date; Activities: name + city, guest, date, start, duration, vehicle; Flights: direction, airline, route, departure, cabin, PNR; Insurance/Visa/SIM: customer, pax, plan, destination, travel date) plus Status badge + View action.
  - Each tab has its own search box (filters across all columns) + status filter pills (All / Pending / Confirmed / Rejected) + count indicator.
  - Verified via Playwright with Travo Georgia supplier login: Bookings, Hotels, Transfers, Activities tabs all render correctly with real data.
- **Hotel View Modal — Confirmation Number required + Trip Change Requests inline (Apr 2026)**: New `SupplierDashboard/HotelViewModal.jsx` opens when the hotel team clicks View on any Hotels-tab row.
  - **Hotel-only sections**: Check-in / Check-out / Nights / Rooms × Room type / Meal Plan / Confirmation # / Order Ref + Guests. (Transfers, Activities, Travelers' passport details, Payment info intentionally hidden.)
  - **Trip Change Requests** for the booking surfaced inline with colored status badges; clicking one opens the conversation thread inside the same modal — hotel team can read original request, reply (Enter to send), and change task status (Open / Under Process / Closed / Rejected).
  - **Status update with required Confirmation Number**: Backend `/api/supplier/bookings/{id}/confirm` now rejects the request with HTTP 400 if `confirmation_number` is missing. On success, the confirmation # is stamped on `bookings.supplier_confirmation_number` AND on every hotel inside `proposals.selected_hotels[*].confirmation_code` so it appears on the Hotels-tab row.
  - The Bookings-tab Confirm/Reject modal also now requires Confirmation Number when confirming.
  - Verified end-to-end via curl (400 without number, 200 with number) and Playwright (modal → Confirm → number entered → submit → row + modal show CONFIRMED + the entered number).
- **Generic ServiceViewModal across all 4 service tabs (Apr 2026)**: Refactored hotel-only view into a generic `SupplierDashboard/ServiceViewModal.jsx` that powers Hotels / Transfers / Activities / Flights tabs identically.
  - Per-tab config built via `serviceViewConfig(kind, row)`: Hotels → Check-in/out/Nights/Rooms/Meal Plan + 4-star rating; Transfers → Direction/Vehicle/Date/Route; Activities → Date/Start Time/Duration/Vehicle; Flights → Direction/Departure/Arrival/Cabin/PNR.
  - All four reuse the same Trip Change Requests conversation thread, required-confirmation-number action footer, and Reject reason flow.
  - Verified end-to-end via Playwright (Activity Confirm flow: View → Confirm → "ACT-PNR-99" entered → submit → status flips to CONFIRMED, sidebar count Pending: 2→1).
  - Old `HotelViewModal.jsx` deleted (replaced by the generic component).
- **Notification click-through to Trip Task modal (Apr 2026)**: Each notification entry in the Header bell is now a clickable button.
  - Backend writes `change_request_id` onto every `change_request_*` notification (via the extended `create_notification(...)` helper).
  - Header `handleNotifClick(n)` marks the notification read, closes the bell, and calls `onOpenBookingTask(booking_id, change_request_id)` passed from App.js.
  - App.js sets `selectedBookingId` + `openTaskId` and switches to `booking-detail` view; BookingDetail picks up `initialTaskId` and auto-opens the Trip Task Details modal once tasks load.
  - Verified end-to-end via Playwright: testadmin clicks "New Trip Change Request — Late Checkout" → BookingDetail loads → "Trip Special Request: Late Checkout (Open)" modal pre-opened with original request + reply composer.
- **CSV Export per service tab (Apr 2026)**: New `SupplierDashboard/csvExport.js` (`rowsToCsv`, `downloadCsv`, `todayStamp`).
  - Each service tab now has a green "Export CSV" button next to the search/filter row that downloads `<tab>-YYYY-MM-DD.csv` of the currently filtered rows with UTF-8 BOM (Excel-friendly), proper field escaping for commas/quotes/newlines, and includes a final Status + Booking Ref column.
  - Each column can specify a `csv: (row) => ...` callback so JSX-rich cells (badges, hotel + stars composite) export as plain text.
  - Verified by downloading `hotels-2026-04-28.csv` (835 chars, 5 rows) showing proper escaping and all visible columns.
- **Pending count badges on each service tab (Apr 2026)**: Each tab in the Operational Dashboard now shows a small numeric pill next to the label (e.g., "Hotels (1)", "Transfers (2)", "Activities (3)") so the operations team can spot which service line has outstanding work at a glance.
  - Counts computed via memoised `pendingCounts` using the same extractors as the tab content (so they always agree).
  - Tabs with zero pending items intentionally hide the badge to reduce noise.
  - Active-tab badge inverts (white pill on dark background) for contrast; inactive shows amber-on-white.
- **Add Activity on inter-city transfer days (Apr 2026)**: Removed the `!isCheckInDay` guard on the "Add Activity in {city}" button inside `TripBuilder/DayCard.jsx`. Agents can now manually add activities to days that are also inter-city transfer days (e.g., Day 2 with the Bangkok → Pattaya transfer). Auto-recommendation already covered these days; this just closes the manual-entry gap.
- **PDF Polish — Meal Counts + Bullet-Formatted Terms (Apr 2026)**: Three fixes to `routes/pdf_generator.py`:
  1. **Meal counts**: The bottom strip on the Inclusions page now shows the *total number* of breakfasts / lunches / dinners across the trip (e.g., "3 Included" instead of just "Included"). Hotel meal plans (BB / HB / FB / AI / Bed and Breakfast / Half Board / Full Board / All Inclusive / Room Only) all parse correctly — each night contributes one meal of each applicable type. Activity inclusions add their own meal count.
  2. **Terms & Conditions formatting**: Each policy section's `content` (which is stored as a `List[str]` of bullet points) and any `sub_sections` (each with their own `title` + `items` list) are now rendered as proper `<ul>` bullet lists with sub-section headings — instead of the previous broken Python-list-as-string output (`['text1', 'text2']`).
  3. **Important Information & Guidelines fix**: Country-specific guidelines (Thailand, UAE, Georgia, etc.) used a `sub_sections` schema where the `content` field only carried the country name and the actual bullets lived under each sub-section's `items`. The PDF was only printing the country label; now all sub-sections (General, Tours and Transfers, Visa, Hotel, etc.) render with their headings + bullets.
  - Verified end-to-end: regenerated the same proposal PDF (HTTP 200, 71KB) and visually confirmed via pdftoppm + AI vision: bottom meal strip shows "Breakfast/Lunch/Dinner" with status; Important Notes pages render with proper bulleted sub-sections (General, Hotel, Tours and Transfers, Visa and Immigration Details).
- **Activity Meals Included Toggle (Apr 2026)**: Added a new "Meals Included" section in the **Edit Activity** modal under the Tour Details tab — three toggle pills (Breakfast / Lunch / Dinner) styled with emerald borders when ticked. Backend `ActivityCreate` schema now persists `meals_included: {breakfast, lunch, dinner}`. The Trip Builder day card's Meals Section now dynamically rolls up from hotel meal plan + each day's activities' `meals_included` (so e.g. a half-board hotel + a lunch-included tour shows all three meals as Included). The PDF generator's meal-count strip also picks up the structured field — verified end-to-end by setting `meals_included.lunch=True` on two activities + `dinner=True` on one and confirming the PDF correctly showed "Lunch: 3 Included, Dinner: 1 Included".
- **Country-Specific Terms in PDF (Apr 2026)**: PDF generation (`routes/pdf_generator.py`) now dynamically filters the Terms & Policies section based on the trip's destination countries. Logic:
  1. Resolves trip countries by reading any `country` field on each `proposal.cities[]` entry, then falls back to a case-insensitive lookup against the `cities` collection (so `"Dubai"` matches the seeded `"DUBAI" → "United Arab Emirates"`).
  2. Pulls active terms (`is_active != False`) and keeps only entries where `applies_to == "all"` / `country` is empty (generic), OR `country` matches one of the resolved trip countries (case-insensitive).
  3. Sorts by `order` field for stable ordering.
  - Verified end-to-end with three real proposals: Georgia (Tbilisi) PDF shows only Europe-specific sub-section + generic terms; Thailand (Bangkok/Pattaya) PDF shows only Thailand-specific (TDAC, Visa on Arrival) + generic terms; UAE (Dubai) PDF shows only UAE-specific (AED 50,000, Dirham Fee, Abu Dhabi Grand Mosque) + generic terms. Generic policies (Terms and Conditions, Hotel Cancellation, Payment Policies, Any Other Commitments) appear for all destinations.
- **Saved Proposal page meal counts (Apr 2026)**: ProposalView.jsx Inclusions tab now displays counts for **all three meals** (Breakfast / Lunch / Dinner) — previously only Breakfast was counted. Added two new helpers `hotelIncludesLunch()` (FB/AI) and `hotelIncludesDinner()` (HB/FB/AI), and refactored the meal strip to a single `renderMeal()` helper that sums counts from per-night hotel meal plans + per-activity `meals_included` (with legacy `inclusions` text fallback). Output format: "Included on 4 days" (matches existing breakfast UX).
  - **Stale-snapshot fix**: `routes/proposals.py GET /{proposal_id}` now refreshes each saved activity's `meals_included` flag from the master `activities` collection in one batch query, **AND** ProposalView.jsx auto-re-fetches on mount so the Inclusions tab always renders enriched data even when the parent My Leads list serves a frozen snapshot. Verified end-to-end: Bangkok/Pattaya proposal `cb694674` correctly shows Lunch=2 (Coral Island + Enroute Safari toggled) and Dinner=1 (Dinner Cruise toggled).
- **TBM Sequential Booking Reference + Voucher Hotel Confirmations (Apr 2026)**: Two related booking-display fixes:
  1. Replaced `ORN<random-from-uuid>` references with sequential **`TBM-000123`** format. Added `/app/backend/booking_number.py` helper that uses an atomic `counters` collection (`findOneAndUpdate` with `$inc` + `ReturnDocument.AFTER`) to assign monotonic numbers. Both booking-creation paths (`routes/proposals.py` hold + `routes/bookings.py` create) now allocate and persist `booking_number` (int) + `booking_ref` (string). Migrated 3 existing bookings to TBM-000001/002/003 in created_at order; counter set to 3 so future bookings continue from TBM-000004. Updated 4 frontend display sites (MyBookings, BookingDetail, AdminDashboard) and the invoice/voucher PDF generator to use the new format. PaymentPage's `orderId` left untouched since it's a payment transaction id, not a booking ref.
  2. **Voucher hotel "Confirmation No." was always "Pending"** — bug. The voucher rendered `selected_hotels[key].confirmation_code` which is never populated; the actual confirmation numbers live under `booking.service_confirmations["hotel:<city>_<idx>"].confirmation_number` (set by Operational Dashboard). Fix: voucher now reads from `service_confirmations` first, falls back to snapshot, then "Pending". Verified by regenerating booking `052e8faf...` voucher: all 3 hotels now show real codes (467232326 / RR144011 / 467232495) and trip ref displays as **TBM-000003**.
- **Voucher Terms — same polish as Proposal PDF (Apr 2026)**: The voucher PDF was using a single-string `term-body` div which dumped Python lists as `['text1', 'text2']`, AND it also dumped ALL terms regardless of country (so a Bangkok booking showed UAE + Georgia terms). Fixes:
  - Voucher's `build_voucher_html` now uses the same structured renderer as the proposal PDF (imports `_render_term_bullets` from `pdf_generator`) — bullet-pointed `content` lists, sub-sections rendered with their own headings + indented border, fallback to plain `<p>` for legacy string content.
  - Voucher's `_load_booking_context` now applies the same country-filter logic as the proposal PDF: resolves trip countries from `proposal.cities[]` (with case-insensitive `cities` collection lookup for "Dubai" → "United Arab Emirates"), then keeps only generic terms (`applies_to=="all"` / no country) + terms whose country matches the trip.
  - Verified by regenerating Bangkok/Pattaya booking `052e8faf...` voucher: Terms now show as bullets, Important Information & Guidelines shows General + Tours and Transfers + Visa sub-sections with all bullets, and the page contains only Thailand-specific terms (TDAC, Visa on Arrival, 10,000 THB) — UAE and Georgia content correctly excluded.
- **Trip Itinerary page — full booking details (Apr 2026)**: Extended `TripItineraryView` from a basic day-card layout into a **comprehensive itinerary view** showing all available booking details. Each card now displays:
  - **Transfer**: route (from → to), vehicle type, duration, pickup time, supplier name + clickable phone, PRIVATE/SIC badge, **Confirmation number + Operations note** (e.g., driver name + plate from `service_confirmations.op_note`)
  - **Hotel**: full address (with map pin icon), clickable phone, room type + bed type + meal plan, refundable/non-refundable badge with deadline, amenities chips, check-in/out + nights, and **Confirmation number + Operations note**
  - **Activity**: pickup time, meeting point, full description, all inclusions list, supplier + phone, meal-included pills, and confirmation block
  - **Flight**: airline + flight number + date, route (DEP → ARR with times), terminal, and confirmation
  - All four card types use a shared `ConfirmationLine` component that shows "Awaiting confirmation" (amber) when pending, or the confirmation number + ops note (emerald) once Operations has confirmed.
  - Component now also fetches the booking record (`/api/bookings/{id}`) alongside the proposal so it can read `booking.service_confirmations` keyed by `<service_type>:<service_key>` (e.g., `hotel:Bangkok_0`, `transfer:arrival`, `transfer:inter:0_1`, `activity:Pattaya_3#0`, `flight:arrival`).
  - Verified end-to-end against booking `TBM-000003`: Hotel cards show real confirmations 467232326 / RR144011 / 467232495 from the Ops Dashboard with full addresses + amenities; transfer cards show route + vehicle + private badge; Day 5 shows the departure transfer card. Driver / vehicle plate info will populate the moment Operations updates the per-service `op_note`.
- **Trip Itinerary page — Nexus DMC layout redesign (Apr 2026)**: Full rewrite of `TripItineraryView` to mirror the Nexus DMC reference layout the user shared:
  - **Left rail**: One large city card per stay (not per-night) — round hotel thumbnail beside "Day N" header + date, green "CHECK IN TO" pill, big "3N Phuket"-style heading, hotel hero image, hotel name with star rating, ROOM block, and CHECK-IN/CHECK-OUT grid with 02:00 PM / 12:00 PM times.
  - **Right rail**: Per-day sections with small "Day N" tag + big bold "Arrive in / Day in / Transfer to / Departure from <city>" heading. Flights render as a compact one-liner ("EK-378 - Flight arriving on 02 Feb 2024 at 12:05 PM"). Transfers get a black time-pill above + structured PICKUP INFORMATION / PICKUP TIME grid + dedicated DRIVER / DRIVER CONTACT NO / VEHICLE block (with avatar placeholder when ops haven't confirmed yet).
  - **Driver parser**: Added `parseDriverNote()` which extracts `Driver: ... | Phone: ... | Plate: ...` from the operations note (or treats short freeform text as the driver name). Drivers' phones are rendered as `tel:` links so agents can tap-to-call.
  - **Meals**: Each meal (Breakfast / Lunch / Dinner) is its own row with a green "✓ Included" badge or red "✗ Not included" badge — matches the reference exactly.
  - Verified against booking `TBM-000003`: city cards (1N Bangkok, 2N Pattaya, 1N Bangkok) show round hotel circle + Day/date + green CHECK IN TO + hero image + Standard Double room + 02:00 PM check-in / 12:00 PM check-out. The arrival transfer renders driver block (Mr. Somchai Jaidee · +66 81 234 5678 · Sedan Car 7) parsed from a seeded ops note; meal rows show the green/red status pills exactly as in the reference.
- **Structured Driver Fields on Operational Dashboard (Apr 2026)**: Added 4 dedicated form fields in the Operational Dashboard's "Confirm Service" / "Update Confirmation" modal so agents no longer need to remember the `Driver: X | Phone: Y | Plate: Z` syntax:
  - Backend (`routes/operational_services.py`): `ServiceConfirmRequest` now accepts `driver_name`, `driver_phone`, `vehicle_plate`, `pickup_time`. The confirm endpoint persists them onto the per-service confirmation entry alongside the existing `confirmation_number` / `op_note`.
  - Frontend (`SupplierDashboard/ServiceViewModal.jsx`): The form section "DRIVER / VEHICLE DETAILS (optional)" appears only for transfer + activity service types and contains 4 inputs — Driver/Guide Name, Contact No, Vehicle Plate, Pickup Time — with placeholders, prefilled from any existing per-service entry.
  - Frontend (`TripItineraryView.jsx`): Both `TransferBlock` and `ActivityBlock` now **prefer** the structured `driver_name` / `driver_phone` / `vehicle_plate` / `pickup_time` fields and only fall back to parsing the legacy `op_note` text when the structured fields are empty (so existing rows keep working).
  - Verified end-to-end: posting `{driver_name, driver_phone, vehicle_plate, pickup_time}` to `/api/operational/service-confirm` persists all 4 fields on `service_confirmations[transfer:inter:0_1]`; the modal UI shows the new section with all 4 fields rendered correctly when opening a transfer's "Update Confirmation" form.
- **Travo by MedVentures Logo on Invoice & Voucher (Apr 2026)**: Replaced the placeholder text-only headers (`"TRAVO TOURS & TRAVELS"` block + first-letter brand circle) with the user-supplied **"Travo by MedVentures" brand image** (brown wordmark with globe + airplane icon and "BY MEDVENTURES" tagline). Logo is stored at `/app/backend/static/travo_logo.png` and embedded as a base64 data URL into both `build_invoice_html` and `build_voucher_html` so WeasyPrint renders it inline without a network round-trip. Added new CSS classes `.brand-block`, `.brand-logo`, and `.voucher-brand-logo` with sensible max-height/max-width constraints (64-80px tall, 220-240px wide). Verified end-to-end via PDF→PNG conversion + AI vision check on both files.
- **Cancel Request (two-step approval) on Trip Confirmation (May 2026)**: Agents can now request a booking cancellation directly from the Trip Confirmation (`BookingDetail`) page; admins/operational team approve or reject before the booking is actually cancelled.
  - Backend (`routes/bookings.py`): 3 new endpoints — `POST /api/bookings/{id}/cancel-request` (requires `reason`, validates owner or admin, travel-date must be in the future, blocks duplicate pending requests), `POST /api/bookings/{id}/cancel-request/approve` (admin/staff/supplier only, flips `status` → `cancelled`, stamps `cancelled_at`, mirrors into linked proposal), `POST /api/bookings/{id}/cancel-request/reject` (clears pending state, requester can resubmit). All update both `bookings` and `held_bookings` collections so MyBookings and Operational views stay in sync.
  - Notifications: Admin+staff users receive `cancel_request_new` on submission; the original requester receives `cancel_request_approved` / `cancel_request_rejected` with the reviewer's note so they see the decision in the Header bell.
  - Frontend (`BookingDetail.jsx` + new `BookingDetail/CancelRequestModal.jsx`): Red dashed "Cancel Request" button in the Seller sidebar (only visible when booking status isn't cancelled/completed, no pending cancellation already, and travel date still in the future). Modal enforces a required reason textarea + shows the 3 important-info bullets. Once requested, the page status pill flips to rose "Cancellation Requested", and a full banner shows reason/requester/timestamp. Admins/staff/suppliers see an inline review form with optional note + **Approve Cancellation** (red) / **Reject Request** buttons. On approval, pill turns red "Cancelled" and the banner shows reviewer + timestamp + note.
  - `MyBookings.jsx`: Extended `getDisplayStatus` to surface "Cancellation Requested" (rose pill) for `cancellation_status=requested && status!=cancelled`. Added both `cancellation_requested` and existing `cancelled` options to the top status filter and the column filter dropdown.
  - Verified end-to-end via curl (9 test cases) + Playwright (agent submits → admin approves with note → page pill flips to red "CANCELLED").

- **Payment Receipt PDF (May 2026)**: New `GET /api/bookings/{id}/receipt-pdf?txn=<index>` endpoint in `routes/invoice_voucher.py` (`build_receipt_html`) generates a Nexus DMC-style Payment Receipt when the agent clicks "Print Receipt" on the Trip Confirmation Payment Details card.
  - Layout matches the user's reference PDF exactly: Travo by MedVentures logo top-left + "Payment Receipt" + REF (e.g., TBM-000003) top-right; two-column ISSUED TO (customer name / email / phone) and TRANSACTION DETAILS (Booking Reference, Booking Date, Payment Reference) block; Description / On / Amount table; right-aligned summary with Total Booking Amount + Total Amount Paid (bold, top-bordered); centered footer with company name + care email.
  - Optional `?txn=<index>` query param pins the receipt to a single transaction row (the Print Receipt link passes the row index, so each transaction gets its own focused receipt).
  - Frontend (`BookingDetail.jsx`): Wired the existing `data-testid="print-receipt-{i}"` button to download `Payment_Receipt_<ref>.pdf` via axios blob response.
  - Verified end-to-end: 54KB PDF with valid `%PDF-1.7` header generates on demand; Playwright download triggered with `Payment_Receipt_TBM-000003.pdf`; AI-vision analysis confirms every element from the Nexus reference is present.

- **ORN → TBM branding migration (May 2026)**: Every user-visible legacy `ORN*` identifier is now replaced with the real TBM booking reference (`TBM-XXXXXX`).
  - Receipt PDF **Payment Reference**: no longer falls back to `order_id` (which used to be `ORN<random>`). Now renders as `#TBM-000003-P1` (booking ref + `-P<txn_index+1>` suffix when a specific transaction is requested, bare ref otherwise).
  - Invoice PDF **Confirmation/PNR**: switched from `booking.order_id` fallback to the booking's TBM ref — so instead of `ORNFI0W6OUQU` it now shows `TBM-000003`.
  - `PaymentPage.jsx` order-id generator: new transactions now produce `TBM-P<8>` strings instead of `ORN<9>`.
  - `routes/change_requests.py` → `_short_ref()` is now async and reads the booking's real `booking_ref` / `booking_number` from the DB (with a TBM fallback for legacy rows). All 3 call-sites updated to `await _short_ref(...)`. Notification messages like "Booking ORNXXXX" now show "Booking TBM-000003".
  - `routes/email_service.py`: Both email builders (`build_booking_status_email_html`, `build_booking_confirmation_email_html`) stopped constructing `ORN + id[:8]` refs; they now use the persisted `booking_ref` with TBM fallback.
  - Frontend chips (`AdminDashboard.jsx`, `SupplierDashboard.jsx`, `SupplierDashboard/ServiceViewModal.jsx`): replaced "Order: <order_id>" displays with "Ref: <TBM-XXXXXX>" via `booking.booking_ref || (booking.booking_number ? TBM-xxxxxx : id.slice(0,8))`.
  - Verified end-to-end via curl: regenerated receipt PDF → Payment Reference shows `#TBM-000003-P1`; regenerated invoice PDF → Confirmation/PNR shows `TBM-000003` (AI-extraction confirms no ORN codes remain).

- **Locked Price Breakdown sidebar on View Quote (May 2026)**: Once a proposal has been held or booked, returning to the ProposalView "View Quote" page now renders a read-only, simplified **Price Breakdown** card that matches the user-supplied reference design — instead of the full editable sidebar.
  - New branch in `ProposalView/PriceSidebar.jsx`: when `proposal.booking_id` is present OR status is held/booked/confirmed/cancelled, render a clean card with Estimated Date of Booking / Price Breakdown heading / rooms+adults+nationality+departure city / Price per adult / large "$ Total Price AED xxx INCLUDING ALL TAXES" / Net Price.
  - **Status-aware CTA button**: When booking is held/booked/confirmed, shows dark-blue **"TBM-000003 — BOOKING DETAILS"** button. When cancelled, flips to a red **"× TBM-000003 — CANCELLED"** button (both navigate to the Trip Confirmation page so the advisor can still review history). Verified: button text + bg color match — `rgb(220, 38, 38)` for cancelled, dark navy for active.
  - Backend: Both booking-creation paths (`routes/proposals.py` hold + `routes/bookings.py` create) now stamp `booking_id`, `booking_number`, `booking_ref` back onto the proposal doc after the booking is created. Added matching `Optional[str]` fields to `ProposalResponse` in `models/schemas.py` so the GET `/api/proposals/{id}` endpoint actually returns them (previously Pydantic was stripping them).
  - Added a resilient frontend fallback: if the proposal only has `booking_id` but no ref (stale cache / legacy row), `PriceSidebar` runs a one-time `GET /api/bookings/{id}` and resolves the TBM ref client-side — no more "TBM-—" placeholder.
  - Ran a one-time backfill script that populated the three fields on 3 existing held/booked proposals from their matching bookings.
  - Verified end-to-end via Playwright: navigating My Bookings → TBM-000003 → View Quote now shows the locked sidebar with the button text `"TBM-000003 — BOOKING DETAILS"`; clicking it lands on the Trip Confirmation page with `TBM-000003` heading.

- **Group Tours pricing redesigned to B2B + Display tier model (May 2026)**:
  - Backend `routes/group_tours.py` schema replaced single `price_per_adult` + multiplier-based `child_age_rules` with structured `pricing` block containing 5 fixed tiers, every tier carries `supplier_cost` (B2B net, internal/accounting) + `display_price` (customer-facing rate):
    1. `single_sharing` — Cost per adult on single sharing
    2. `twin_double` — Cost per adult on twin/double sharing (default headline)
    3. `triple` — Cost per adult on triple sharing
    4. `child_no_bed` — Cost per child 2-5 yrs without bed
    5. `infant` — Cost per infant 0-2 yrs
  - Legacy `price_per_adult` retained as a read-only computed projection (= `pricing.twin_double.display_price`) so the public `GroupTours.jsx` deal cards + `GroupTourDetail.jsx` price card keep working without a frontend migration. `_seed_defaults_if_empty()` auto-backfills `pricing` for any pre-migration doc.
  - Quote engine rewritten: per-room adult occupancy picks the matching tier (1→single, 2→twin, 3+→triple). Children billed by age band — `<2`→infant, `2-5`→child_no_bed, `6+`→twin/double rate (treated as adult, requires a bed). Verified 3 scenarios via curl.
  - Admin editor (`AdminDashboard/GroupToursAdmin.jsx`) replaces the old single-price + child-rules UI with a "Price B2B / Display" table matching the user reference image — 5 tier rows × 2 columns (Supplier Cost / Display Price). Admin list now shows two columns per package: amber `Twin Supplier (AED)` (B2B accounting view) + emerald `Twin Display (AED)` (headline rate).
- **Group Tours margin indicator + Suggested Price (May 2026)**: Operations can now spot under-priced packages at a glance.
  - New `target_margin_pct` field (default 25%) on each package — drives Suggested Price hints.
  - **Admin list** has a new color-coded "Markup (Twin)" badge column: red <10%, amber 10-19%, emerald 20-49%, indigo 50%+. Hovering the badge tooltips the deviation vs target.
  - **Editor pricing table** got a 4th "Markup" column showing live computed margin per tier + a small ↻ "Suggest" button next to each Display Price input that auto-fills `Display = Supplier × (1 + Target Margin / 100)`. Button highlights emerald when the current display matches the suggestion. Verified: clicking Suggest on twin_double with supplier=2,700 + target=25% jumped display to 3,375 (= 2,700 × 1.25) instantly.
  - Verified target_margin_pct persists via PUT and quote engine totals unchanged.

- **Editable Invoice Fields + Highlighted Final Payment Due (May 2026)**: Operations can now override the Total / Paid / Balance / Due Date directly on the Proforma Invoice.
  - Backend: New `PATCH /api/bookings/{id}/invoice-fields` endpoint (admin/staff only) that whitelists `total_price`, `payment_amount`, `payment_fee`, `refund_amount`, `final_payment_due_date`, `invoice_notes` and mirrors the change to both `bookings` and `held_bookings` collections.
  - Frontend: New `BookingDetail/EditInvoiceModal.jsx` opened via a small "Edit" pencil button next to the Invoice dropdown on the Payment Details card (visible only to admin/staff). Shows live Balance Due preview (red when > 0, emerald when paid in full) and a date picker for the Final Payment Due Date.
  - Invoice PDF: When `Balance Due > 0`, the "Final Payment Due" row in TRANSACTION DETAILS is rendered with a red background + bold red label, and the "Balance Due" totals row uses a red border + red text instead of the default navy. Verified end-to-end via curl PATCH (paid=2150 on a 2650 booking, due=2026-05-04) → Gemini Vision analysis confirms `Balance Due: AED 500.00`, red Balance Due styling, `Final Payment Due: 04 May 2026` with red highlight in the top-right transaction block.
- **Send Payment Reminder + Pending Banner (May 2026)**: One-click reminder email + automatic on-page banner when balance > 0 and travel is imminent.
  - Backend: New `POST /api/bookings/{id}/send-payment-reminder` endpoint (admin/staff only) — refuses when balance is 0 (HTTP 400), no customer email (HTTP 400), or non-privileged role (HTTP 403). Sends a branded Resend email with a custom payment-reminder template (`_build_reminder_email_html`) that prominently shows the balance + final payment due date, plus the latest Proforma Invoice PDF as an attachment. Stamps `last_payment_reminder_at` + auto-incrementing `payment_reminder_count` on the booking. Fallback final-due = `journey - 15 days` when not explicitly set.
  - Frontend EditInvoiceModal: New amber "📧 Send Reminder" button next to the Final Payment Due Date input — disabled when balance = 0, shows green ✓ inline confirmation with recipient + balance + reminder count, plus an italic "Last reminder sent on …" footer.
  - Frontend BookingDetail: New red `payment-pending-banner` above the Payment Details card that auto-renders when `outstanding > 0 && days_until_travel ≤ 14 && days_until_travel ≥ 0`. Banner shows formatted "PAYMENT PENDING — AED X · Final payment is due by DD Mon YYYY · Only N days until travel" along with a red "Send Reminder" CTA (admin/staff only) that opens the Edit Invoice modal.
  - Verified end-to-end via curl + Playwright: 200 success with `email_sent=true` for verified Resend recipient, banner renders with "PAYMENT PENDING — AED 500 · 04 May 2026 · 8 days until travel" when travel is pulled inside 14 days, modal "Send Reminder" round-trip displays "Reminder sent to ... · Reminder #2" inline.

- **Group Tours — Full Itinerary Editor (May 2026)**: Operations can now edit ALL detail-page content without code changes.
  - Backend schema extended (`routes/group_tours.py`): added `intro_paragraph`, `highlights[]`, `itinerary[ItineraryDay]`, `hotels[HotelRow]`, `inclusions: Dict[category, bullets]`, `exclusions[]`, `what_to_expect[]`. `ItineraryDay` = `{day, title, desc, meals[B/L/D], hotel_note}`. `HotelRow` = `{name, stars, nights, room_type, meal_plan, image}`.
  - 6 collapsible editor sections in `GroupToursAdmin.jsx` (Intro+Highlights, Itinerary, Hotels, Inclusions, Exclusions, What to Expect). `GroupTourDetail.jsx` now reads from backend with destination-template fallback.

- **Collections Dashboard + DnD Itinerary + Image Upload + WYSIWYG (May 2026)**: 4 ops productivity boosters.
  - **Collections Dashboard** (Admin → Collections tab, `AdminDashboard/CollectionsDashboard.jsx`): New `GET /api/admin/collections` returns every booking with `balance_due > 0` sorted by due date with computed aging buckets (overdue / critical [≤3d] / warning [≤7d] / watch [≤14d] / future / no_due_date) + next-milestone hint per row. Frontend shows 6 KPI cards, filter pills with counts, search, and per-row `📧 Remind` (one-click reminder w/ toast) + `View` actions. Owner email surfaced for each booking. Verified: TBM-000003 (balance 500, due +8d) appears in `14-day` bucket with T-14 sent / T-7 next, click "Remind" fires Resend email + toast confirms "✓ Reminder sent to rashid@travotours.ae".
  - **Drag-to-reorder Itinerary** (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`): `ItineraryEditor` rewritten with PointerSensor + KeyboardSensor + `verticalListSortingStrategy`. Each day card has a grab handle (⋮⋮) on the left that drags the whole row; drop position commits via `arrayMove`. Position indicator "Position N of M" shown per card. Verified: 5 drag handles render on the Baku 5-day itinerary.
  - **Image upload widget** (`AdminDashboard/ImageUploadField.jsx`): New `POST /api/uploads/group-tour-image` endpoint stores files in `UPLOADS_DIR/group-tours/`. Frontend widget supports drag-and-drop, file picker (10 MB / image-only), URL paste fallback, live thumbnail preview, and a Clear button. Mounted on Group Tour cover image + each Hotel row's image input. Replaces the old plain URL inputs.
  - **WYSIWYG editor** (`AdminDashboard/RichTextEditor.jsx`): Lightweight in-house contentEditable wrapper (~80 lines, zero runtime deps) with toolbar — Bold, Italic, Underline, Bullet, Numbered, Link, Clear formatting. Persists rich text as HTML. Used for the **intro paragraph** (cover) + each itinerary day's **description**. `GroupTourDetail.jsx` updated to render with `dangerouslySetInnerHTML` + `prose prose-sm` styling. Initially tried `react-quill-new` but it triggered React 18 concurrent-mode hydration recovery warnings in dev mode → swapped for the lighter custom solution. Verified: 5 RTE toolbars render across the 5-day itinerary, plus 1 on the intro paragraph.

- **Group Tours — Catalog Pickers (May 2026)**: Itinerary days, Hotels, and the Destination field can now be linked to existing entries from the **Activities**, **Hotels**, and **Cities** management catalogs. Additionally, the Activities + Hotels pickers **auto-scope to the package's Destination** so ops only see items for the selected city.
  - Backend schema: `ItineraryDay` got `activity_id` + `activity_name` (denormalised label for display fallback). `HotelRow` got `hotel_id`. All optional — manual entries still work.
  - `AdminDashboard/CatalogPicker.jsx`: searchable modal with image thumbnails, typeahead filter, "Change" + "Unlink" actions. New `scopeFilter` prop = `{label, predicate}` constrains items to the package's destination city (case-insensitive match on `city`/`name`). Header shows an emerald "Filtered: {city} only" pill with a click-to-toggle "Show all destinations" override. Footer shows scope context ("Scoped to Almaty · 1 item") + an inline "Show all destinations →" action when the filter returns zero results.
  - `ItineraryEditor.SortableDay`: Each day card's "Linked Activity" picker is automatically scoped to `form.destination`. Verified: Tbilisi package's Day 1 picker → 3 scoped activities (case-insensitive match on "Tbilisi"/"tbilisi"); toggling "Show all" expands to 14.
  - `HotelsEditor`: Each hotel row's picker is auto-scoped. Verified: Almaty package → 1 scoped hotel (Plaza Hotel Almaty), toggle "Show all" expands to 7.
  - `GroupToursAdmin` Destination field: Replaced the free-text input with a "Pick a city from the Cities catalog…" picker (16 cities loaded from `/api/cities`). The selected city's name persists into the package's `destination` field and drives the scope filter on Hotels + Activities.
  - Catalog API responses cached per-mount on the frontend so opening the picker on multiple days/hotels doesn't refetch.

- **Automatic Reminder Scheduler + Reminder History + Mark as Paid (May 2026)**: Full closed-loop collections flow without ops manually chasing customers.
  - **APScheduler** (`backend/scheduler.py`): Added `apscheduler==3.11.2`. Daily cron job at **09:00 UTC** scans every booking with a `final_payment_due_date`; at **T-14 / T-7 / T-3** days it auto-fires the Resend reminder (idempotent — tracks `auto_reminder_milestones_sent` array so the same milestone never fires twice). Started on `startup`, clean shutdown on `shutdown`. Exposed admin-only `POST /api/admin/run-reminder-scheduler` to trigger the job manually for QA/catch-up. Verified: first run sent T-7 (scanned=1, sent=1); re-run skipped=1.
  - **Reminder history log**: Every reminder (manual or auto) now appends a `reminder_log[]` entry on the booking with `{sent_at, recipient, balance_due, due_date, source, milestone, reminder_no, email_sent}`. New `GET /api/bookings/{id}/reminder-history` returns the sorted timeline + `milestones_sent`.
  - **ReminderHistorySection** (`BookingDetail/ReminderHistorySection.jsx`): Renders under Payment Details when `payment_reminder_count > 0` OR when viewing as admin. Shows 3-pill "Auto Schedule" tracker (T-14 / T-7 / T-3 coloured sky/amber/red, sent = filled checkmark, pending = outlined clock), total-sent counter, and a left-border timeline of every send with `Bot`/`Hand` icon (auto vs manual), recipient, balance, reminder #, due date, and delivery status.
  - **MarkPaidModal** (`BookingDetail/MarkPaidModal.jsx`): New green "✓ Mark as Paid" button in the Payment Details header (admin/staff only, visible when outstanding > 0). Modal accepts amount (prefilled with balance), method dropdown (cash / bank transfer / card / cheque / wallet / other), reference / transaction ID, optional note, and an "Auto-email Payment Receipt PDF" checkbox. On submit: `POST /api/bookings/{id}/mark-paid` appends to `payments[]`, re-totals `payment_amount` as the sum, auto-promotes legacy `paid_at` into a transaction entry, and sends the Payment Receipt PDF to the customer via Resend. Success view shows "Payment Recorded — AED X" with a green "Fully Paid" pill when balance reaches 0. Verified end-to-end: AED 2,150 then AED 500 → balance=0, 2 payments in DB, both receipts emailed.

- **Group Tours — Transfers Editor (Feb 2026)**: Completed the final catalog picker for Group Tours — Transfers can now be linked from the `/api/transfers` catalog, scoped automatically to the selected Destination city.
  - New `TransfersEditor` in `GroupTourEditorSections.jsx` (symmetrical with `HotelsEditor`): mirrors the scoped `CatalogPicker` pattern — transfers whose `city` matches the package's destination are shown by default, with a one-click "Show all destinations" override when ops need it.
  - Each transfer row has: Linked Transfer picker (shows current label in the emerald pill), plus editable From / To / Vehicle Type / Display Label override / Note fields. Picking a transfer from the catalog auto-fills from/to/vehicle fields from the catalog record.
  - `GroupToursAdmin.jsx` form state + PUT/POST payload extended to carry `transfers: [{transfer_id, label, from_location, to_location, vehicle_type, note}]`. Collapsible "Transfers" section added to the modal between Hotels and Inclusions.
  - Verified end-to-end: PUT `almaty-eid` with 2 Almaty transfers → GET returns them exactly; Playwright-via-screenshot-tool confirms the picker modal shows the "Filtered: Almaty only" pill with the 2 Almaty transfers + "Scoped to Almaty · 2 items" footer when the Almaty package is being edited.

- **Group Tours Editor — Accidental-close bug fixed (Feb 2026)**: Removed click-outside-to-close on the `Edit Group Tour Package` modal so in-progress edits (itinerary, hotels, transfers, pricing, etc.) are no longer lost when users accidentally click the dark backdrop area while interacting with nested catalog pickers. The editor now only closes via the explicit X icon, the Cancel button, or a successful Save. Verified across 7 click scenarios (outer-backdrop, side-backdrop, picker-backdrop, picker X, picker item-select, Cancel button, Save) — editor correctly stays open for all backdrop clicks and only dismisses when the user explicitly chooses to.

- **Group Tours — Multi-image support (Feb 2026)**: Cover images, hotel rows, and itinerary days now each support up to 5 images with the first acting as the primary (hero). The legacy single-image field is automatically kept in sync for full backward compatibility.
  - **Backend** (`routes/group_tours.py`): Extended schema — `GroupTourPackageBase`, `HotelRow`, and `ItineraryDay` each gain `images: List[str]` (max 5). New `_sync_image_fields` helper mirrors `images[]` ↔ legacy `image: str` on every read AND every write so existing public callers (`GroupTours.jsx`, `GroupTourDetail.jsx`) keep rendering with no migration. Server enforces a hard cap of 5 images per entry (over-cap input is silently truncated).
  - **Frontend** — new `MultiImageUploadField` widget (`AdminDashboard/MultiImageUploadField.jsx`): up-to-5 thumbnail grid, primary badge on the first image, hover-overlay controls (← move-left, ★ make-primary, → move-right, × remove), drag-and-drop file upload, multi-file picker, paste-URL-and-Enter alternative. Uses the same `/api/uploads/group-tour-image` endpoint as before.
  - **Wiring**: `GroupToursAdmin.jsx` cover-image section, `HotelsEditor` hotel rows, and `ItineraryEditor`'s `SortableDay` (one widget per day) all swapped from the single-image `ImageUploadField` to the new multi-image one. `packageId` now flows down to itinerary days too so per-package upload folders stay tidy.
  - **Public detail page** (`GroupTourDetail.jsx`): The 3-up hero gallery now reads from `deal.images[]` when ≥2 admin-uploaded images exist (graceful fallback to the repeated legacy `image` for older packages).
  - Verified end-to-end via curl (PUT 7 images → 5 stored, hotels[0].images round-trips, itinerary[0/1].images round-trips, legacy `image` stays mirrored to `images[0]`) and Playwright screenshot (cover widget shows "(3/5) · First image = primary" header with PRIMARY badge on slot 1, 4th slot is the dashed-border "Add image" tile, URL-paste + Add adds new images on the fly, hotel and itinerary widgets mount inside their respective editors).

- **Group Tours — Per-day Date + Linked Transfer (Feb 2026)**: Each itinerary day now carries an explicit `date` (ISO `YYYY-MM-DD`) and an optional `transfer_id` + `transfer_label` link to the Transfers catalog (scoped to the package's destination, mirroring the Activity picker pattern).
  - **Backend** (`routes/group_tours.py`): `ItineraryDay` schema extended with `date`, `transfer_id`, `transfer_label` (all `Optional[str]`). Round-trips cleanly; legacy days that don't carry these fields default to `null` and continue to render fine.
  - **Frontend** (`SortableDay` inside `GroupTourEditorSections.jsx`): Day header row now hosts a compact native `<input type="date">` next to the title field. A new "Linked Transfer (from Transfers catalog)" picker sits directly below the Activity picker and uses the same destination-scoped `_cityScopeFilter`. Selected transfers persist as a green emerald pill identical to the Activity / Hotel pickers.
  - **Payload** (`GroupToursAdmin.jsx`): Itinerary serializer now passes `date`, `transfer_id`, `transfer_label` through on both POST and PUT.
  - Verified end-to-end via curl (`PUT almaty-eid` with 3 days + dates + 2 linked transfers → re-GET returns all fields correctly) and Playwright screenshot (date input shows `2026-05-26`, transfer picker opens with "Filtered: Almaty only" pill listing the 2 Almaty transfers).

- **Group Tours — Public Detail page now renders date + linked activities (Feb 2026)**: The customer-facing `GroupTourDetail.jsx` itinerary tab was a static text-only list — even when the admin had linked multiple activities and a per-day date, none of it was surfaced. Now fully wired:
  - **Date pill**: Each day card shows a `WEEKDAY, MMM DD` chip (e.g., "WED, MAY 27") immediately under the red Day-NN badge whenever `day.date` is set.
  - **Activity cards**: Linked activities render as a responsive 2-column grid of emerald cards (`12×12` thumbnail + bold name + sub-line `City · Country · Duration`) above the day's description. Mirrors the admin editor pill style.
  - **Transfer line**: When `day.transfer_label` is set, an inline plane-icon row ("Almaty Airport → Hotel (Sedan)") is shown next to meal/hotel chips.
  - **Backwards compatible**: Days without `date` / `activities` / `transfer_label` render exactly as before, so legacy packages are unaffected.

- **Group Tours — Activity Detail Modal on public page (Feb 2026)**: Added a per-activity "View" button on every linked-activity card on the public detail page. Clicking it opens a polished `ActivityDetailModal` that fetches the full activity record from `GET /api/activities/{id}` and renders:
  - **Hero gallery**: the activity's full `images[]` with prev/next arrows, thumbnail strip, and image counter (e.g., "1 / 3").
  - **Meta row**: City · Country, Duration, ★ Rating + review count, and a Category pill.
  - **Description**: full free-text body from the catalog.
  - **What's Included / Not Included**: side-by-side green/red cards with bulleted check/X lists.
  - **Operational meta-grid**: Meeting Point, Languages, Group Size (min–max), Start Times, Transfer Type, and Cancellation Policy.
  - **Loading + error states** + lock-body-scroll while open.
  - Bug fix: the singular `GET /api/activities/{id}` endpoint wraps its payload as `{success, activity}` while the list endpoint returns objects directly — modal handles both shapes via `r.data?.activity || r.data`.

- **Group Tours — Per-day transfer picker removed from admin form (Feb 2026)**: Removed the "Linked Transfer (from Transfers catalog)" section from inside each itinerary day in the `Edit Group Tour Package` form (on user request — the dedicated package-level Transfers section at the bottom of the form is the canonical place to manage transfers). The per-day `transfer_id` / `transfer_label` backend fields are retained for backward compatibility so any previously-saved day transfers still render on the public Group Tour Detail page (as "Airport → Hotel (Sedan)" plane-icon pills). Date input, Linked Activities picker, and Day Images widget all remain untouched inside each day card.

- **Group Tours — Package-level Transfers section also removed (Feb 2026)**: Per follow-up user request, also removed the full-width "TRANSFERS" collapsible section (the one that hosted the `TransfersEditor` with destination-scoped transfer picker rows) from the bottom of the Edit Group Tour Package form. `TransfersEditor` component + backend `transfers: List[TransferRow]` schema field are retained untouched in the codebase so any previously-saved data round-trips silently and the UI can be re-mounted later with a single JSX block if ops decides to bring it back. Remaining visible sections in the form: Pricing table → Intro & Highlights → Itinerary → Hotels → Inclusions → Exclusions → What to Expect → Active toggle.

- **Group Tours — Admin dashboard now shows hidden (inactive) packages (Feb 2026)**: Fix for a nasty UX gotcha — if ops accidentally unticked "Active (visible on Group Tours page)" on a package, the package disappeared from the ADMIN list too (because the list page and admin editor both hit the same `GET /api/group-tours` endpoint which filters `active: True`), leaving the package unrecoverable via the UI. Backend now accepts `?include_inactive=true` on the list endpoint to return every package; `GroupToursAdmin.jsx` always passes that flag when fetching. Public Group Tours listing stays filtered to active packages only. Admin rows already render an `ACTIVE` / `HIDDEN` pill so the status is obvious at a glance, and the editor's Active checkbox can toggle it back on. Verified: deactivating `almaty-eid` → public count = 0, admin count = 1 with `active=False` visible → re-activate from editor restores both.

- **Group Tours — Terms & Conditions field (Feb 2026)**: Added an end-to-end "Terms & Conditions" feature to Group Tour packages.
  - **Backend** (`routes/group_tours.py`): `GroupTourPackageBase.terms_and_conditions: str = ""` (rich-text HTML) + `GroupTourPackageUpdate.terms_and_conditions: Optional[str]` — round-trips cleanly on POST/PUT/GET.
  - **Admin editor** (`GroupToursAdmin.jsx`): New collapsible "Terms & Conditions" `Section` between "What to Expect" and the Active checkbox. Uses the existing lightweight `RichTextEditor` (bold/italic/underline/lists/link toolbar). Section count renders `1` when content exists, `0` when empty.
  - **Public detail page** (`GroupTourDetail.jsx`): New "Terms" tab appears dynamically next to Itinerary / Flights / Hotels **only when** the package has non-empty T&C content. Tab body renders the stored HTML via `dangerouslySetInnerHTML` inside a Tailwind `prose` container for clean typography, so bold headings, bullet lists, and paragraph breaks all surface correctly to customers.
  - Verified end-to-end via curl (437-char HTML round-trip with `<strong>` tags intact) and Playwright (admin `gt-section-terms` mounts + expands; public `pkg-tab-terms` visible + `pkg-tab-terms-content` renders the full three-clause sample T&C text).

- **Group Tours — Default T&C template shipped (Feb 2026)**: Per ops request, pre-loaded the full company-standard Refund & Cancellation Policy (transcribed from the PDF reference) as the default `terms_and_conditions` for every new Group Tour package. Lives in `AdminDashboard/defaultTerms.js` and is imported by `GroupToursAdmin.jsx`.
  - Template content: H2 main heading "Refund & Cancellation Policy"; 5 bold sub-sections (Cancellation by Customer / Cancellation by Travo Tours / Travel Insurance / Force Majeure / Flight Cancellations); Visa Requirements - Kazakhstan bullet list (8 clauses); General Terms & Conditions bullet list (35 clauses). ≈7,950 chars total.
  - `EMPTY_PKG.terms_and_conditions = DEFAULT_TERMS_HTML` so new packages auto-carry the template.
  - Existing packages can adopt the template at any time via the new "↻ Load Default Template" button inside the T&C section — button asks for a JS `window.confirm` when the current T&C has content, so ops can't accidentally wipe custom edits.
  - Verified end-to-end: PUT 7,953-char HTML round-trips intact · public Terms tab renders 1 H2, 14 paragraphs, 2 ULs, 42 bullets matching the ops reference document.

- **Group Tours — Admin description auto-regenerates from linked activities (Feb 2026)**: Previously, only the FIRST activity pick seeded the day's `desc`; adding a 2nd or 3rd activity left the description out of sync. Now every pick at every slot rebuilds the day's `desc` by concatenating each linked activity's catalog `description` (looked up from the cached `loadActivities()` list) into a `<p>…</p>` paragraph stack. Slot 0 still seeds the day's `title`. Verified end-to-end via curl + Playwright: 3 Almaty activities linked → 3 paragraphs in `desc`, public page shows the 3 activity cards above the combined description.

## Upcoming Tasks
- P1: Integrate Stripe on Pay Now button (test key in pod)
- P2: AI-powered trip recommendations frontend
- P2: Verify Resend domain for production email delivery

## Future/Backlog
- P3: Real Flight API (Airlabs), Google Sheets Sync (needs OAuth)
- Refactoring: ~~ProposalView.jsx (~3,500 lines) component extraction~~ DONE (2,320 lines, 10 sub-components)
- Refactoring: ~~TripBuilder.jsx (~2,300 lines) component extraction~~ DONE (1,934 lines, 14 sub-components)


### Session 10 (Feb 2026)
- **Removed Taxes & Fees from Group Tours pricing (Feb 2026)**: Per user request, the 5% tax line was removed from both the public detail-page quote breakdown and the Admin Group Tours editor.
  - Backend (`routes/group_tours.py`): `GroupTourPackageBase.tax_pct` default changed from `5.0` → `0.0`; all 4 seed packages (Baku / Tbilisi / Almaty / Armenia Eid Break) now seed with `tax_pct=0.0`. Existing package in DB migrated via one-time `update_many({}, {'$set':{'tax_pct':0.0}})` — 1 doc updated. Quote endpoint math unchanged (still multiplies subtotal × tax_pct/100); now always yields `tax_amount=0` and `total=subtotal`.
  - Frontend (`GroupTourDetail.jsx`): Removed the "Subtotal" and "Taxes & Fees ({pct}%)" rows from the Price Breakdown sidebar. Total Price is now the only summary line and equals subtotal.
  - Admin editor (`AdminDashboard/GroupToursAdmin.jsx`): Dropped the "Tax %" input from the editor form and the "Tax %" column from the admin package list. `EMPTY_PKG` seed + PUT/POST payload serializer no longer carry `tax_pct`.
  - Verified end-to-end via curl (Almaty Eid quote returns `tax_pct:0.0, tax_amount:0.0, total:6498.0`) and Playwright screenshot (Price Breakdown shows `2 × Adults — Twin/Double sharing AED 6,498` and `Total Price AED 6,498` with no tax row).

## MOCKED
- Google Sheets sync, PayPal checkout, Aviationstack, Credit Card/EMI/Tabby payments (wallet payment is LIVE)

## Credentials
- **Group Tours — Per-package Departure Cities + Travel Window (Feb 2026)**: Ops can now configure the public "Book your trip" form per-package.
  - **Backend** (`routes/group_tours.py`): `GroupTourPackageBase` extended with `departure_cities: List[str]` (allowed "Leaving From" options), `travel_window_start: Optional[str]` and `travel_window_end: Optional[str]` (ISO `YYYY-MM-DD`). Same fields added to `GroupTourPackageUpdate` — all Optional so legacy packages round-trip as `[]` / `null` without issue.
  - **Admin editor** (`AdminDashboard/GroupToursAdmin.jsx`): New **Booking Settings** card (sky-tinted section) between Basic Info and Pricing. Includes a tags-style "Allowed Departure Cities" input (Enter/Add button → chip, X to remove) with inline hint that falls back to the 6 defaults when empty, plus two date inputs for Travel Window Start / End (End clamped ≥ Start via native `min`). `EMPTY_PKG` + PUT/POST payload serializer extended with all 3 fields; empty strings sent as `null` so the backend treats them as "no restriction".
  - **Public detail page** (`GroupTourDetail.jsx`): The `Leaving From` dropdown now reads from `deal.departure_cities` (falls back to the 6 defaults when unset). The `Leaving On` date input picks up `min={travel_window_start}` / `max={travel_window_end}`, `selectedDate` auto-defaults to `travel_window_start` when set, and a small "Travel window: start → end" hint appears under the picker when either bound exists.
  - Verified end-to-end via curl (PUT almaty-eid with `{departure_cities:["Dubai","Sharjah"], travel_window_start:"2026-05-24", travel_window_end:"2026-05-31"}` round-trips cleanly) and Playwright (`Leaving From` options = `["Dubai","Sharjah"]`, date input `min=2026-05-24, max=2026-05-31, value=2026-05-24`, hint text present).

- Admin: testadmin@example.com / password123
- Agent: rashid@travotours.ae / password123
- Supplier: supplier@georgiancars.ge / password123 (company: Travo Georgia)
- **Group Tours — Download Brochure PDF (Feb 2026)**: The "Download Brochure" button on the public Group Tour detail page is now wired to a real WeasyPrint-generated brochure.
  - **Backend** (`routes/group_tours.py`): New public endpoint `GET /api/group-tours/{pkg_id}/brochure-pdf` renders an 8-page A4 brochure — Cover (Travo logo, hero image, title, destination, nights/days, date range, stars, "starting from AED X"), At-a-glance (highlights + exclusions two-column + departure cities + travel window), Day-wise Itinerary cards (day # badge + title + date + description + meal pills + activity chips + transfer line + hotel-note pill), Hotels block, categorised Inclusions, Pricing table (5 tiers), Terms & Conditions (rich-HTML passthrough). Pulls the Travo brand logo from `static/travo_logo.png` and embeds it as a base64 data URL so WeasyPrint renders offline.
  - **Frontend** (`GroupTourDetail.jsx`): The previously-dead "Download Brochure" button now calls `api.get('/group-tours/{id}/brochure-pdf', { responseType: 'blob' })` and triggers a file download (`Brochure_<Title>.pdf`) with a loading state ("Preparing...") and basic error alert on failure.
  - Verified end-to-end via curl (`HTTP 200`, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Brochure_Almaty_Eid_Break.pdf"`, 240KB, `%PDF-1.7` header) + Gemini Vision content analysis (8 pages, all sections rendered correctly, pricing table with 5 tiers) + Playwright browser download (file captured, 245,793 bytes).


- **Group Tours — Book Now & Save As Proposal (Feb 2026)**: Added the post-quote action buttons from the user's reference video — Book Now (red) and Save As Proposal (navy) appear side-by-side below the Price Breakdown once the agent clicks Check Availability.
  - **Backend** (`routes/group_tours.py`): New endpoint `POST /api/group-tours/{id}/save-as-proposal` converts a group tour package + its live quote into a full proposal doc and inserts it into `db.proposals`. The proposal is persisted with the same shape as a normal proposal (`cities`, `selected_hotels`, `selected_activities`, `pricing_breakdown`, `total_price`, `customer_name/email/phone`, `leaving_from/on`, `room_data`, `total_pax`) so downstream pages (My Leads, BookingConfirmation, ProposalView) can render it without group-tour-specific branches. Adds `group_tour_id` + `group_tour_title` back-references. Refactored the quote math into `_compute_quote(pkg, req)` helper shared by both `/quote` and `/save-as-proposal`.
  - **Frontend**:
    - New `GroupTourDetail/GroupTourCustomerModal.jsx` — tiny form collecting customer name (required) / email / phone, with a single action button whose label and colour flip based on `mode` (`'book'` → red "Continue to Booking", `'save'` → navy "Save Proposal").
    - `GroupTourDetail.jsx` now renders `Book Now` + `Save As Proposal` buttons inside a 2-column grid beneath the Price Breakdown (only when `quote && !quote.error`). Each button opens the customer modal in its mode. On successful save, the parent receives `(proposal, mode)` and routes accordingly.
    - `App.js` wires `onBookFromGroupTour` (sets `savedProposal`, switches view to `booking-confirmation`) and `onProposalSaved` (switches to dashboard → `My Proposals` tab) props.
  - Verified end-to-end via curl (POST returns full proposal with `id`, `total_price=6498`, `cities=[{Almaty,3}]`, `group_tour_id=almaty-eid`) and Playwright (buttons hidden pre-click, visible post-click; clicking Save As Proposal opens modal → fill → submit → redirect to My Proposals dashboard).
- **Group Tours — Save As Proposal uses full TripBuilder form (Feb 2026)**: Per user's attached reference screenshot, the "Save As Proposal" flow on Group Tour Detail now opens the richer `TripBuilder/SaveProposalModal` (same form as regular trip save) instead of the minimal customer-only modal.
  - **Backend** (`routes/group_tours.py`): `SaveAsProposalRequest` extended with `proposal_name`, `expected_booking_date`, `flights_booked`, `markup_value`, `markup_type`, `discount_amount`. Applied server-side math: `markup_amount = base × pct/100` (or fixed), `discount` is capped at markup, `final_total = base + markup − discount`. Proposal doc now stores `markup_land`, `discount_amount`, `flights_booked`, `expected_booking_date`, and `pricing_breakdown.{base_total, markup_amount, discount_amount}` so the downstream ProposalView/BookingConfirmation pages show the right final number.
  - **Frontend** (`GroupTourDetail.jsx`): The `Save As Proposal` button now mounts the existing `SaveProposalModal` with synthetic `tripData` / `selectedHotels` / `cities` / `pricing` props built from the current deal + live quote. The `onSave(formData)` callback bridges into `POST /api/group-tours/{id}/save-as-proposal` and then routes to the My Proposals dashboard tab. The Book Now flow keeps the lightweight 3-field `GroupTourCustomerModal` (no markup/discount needed for a direct booking).
  - Verified end-to-end via curl (`markup_value:10 pct + discount_amount:200 on 6498` → `total_price:6947.8` correctly) and Playwright (modal title "Save Proposal", all 10 form fields present including Trip Name auto-filled, markup dropdown with percentage/fixed, flights_booked radios, booking-date calendar, save button).


- **Group Tours — Structured Flights (backend + public + admin) (Feb 2026)**: Replaced the static amber "Flights" banner with a fully structured `flights[]` field per package, rendered as brochure-style cards on the public Flights tab and editable per-leg in the admin form.
  - **Backend** (`routes/group_tours.py`): New `FlightSegment` Pydantic model with 21 fields (airline, airline_logo, flight_number, from/to city/airport/code/terminal, departure_date/time, arrival_date/time, duration, fare, baggage, meals, cabin). Added `flights: List[FlightSegment] = []` to `GroupTourPackageBase` + `Optional[List[FlightSegment]]` to `GroupTourPackageUpdate`. Round-trips cleanly through PUT `/group-tours/{id}`.
  - **Public detail** (`GroupTourDetail/FlightsBlock.jsx` — new): Each leg renders a card with header (route + travel date), airline strip (logo + name + flight #), 3-column body (timeline with dep/arr times + airports + duration + `+1` next-day badge, dates column, fare/baggage/meals/cabin column). Auto-falls-back to the legacy amber banner when `flights[]` is empty.
  - **Admin editor** (`AdminDashboard/FlightsEditor.jsx` — new): Add/Remove flight legs, all 21 fields editable with native date/time pickers, grouped into Departure / Arrival / Fare sections. Wired into the Group Tour editor below the Booking Settings block.
  - **Seed**: Almaty Eid Break populated with the user's reference data (G9-253 SHJ→ALA 26 May 20:45 → 27 May 02:30 with `+1` overnight badge, G9-254 ALA→SHJ 30 May 03:30 → 08:00, both Air Arabia / Basic / 20 kg / Economy).
  - Verified via curl (PUT round-trip with 2 segments returns identical structure) + Playwright (route headers, AM/PM time formatting, `+1` next-day badge, fare column all match the screenshot).

- **PDF Inclusions section dates fixed (Feb 2026)**: Verified and finalized the previously-pending fix in `routes/pdf_generator.py::section_inclusions_exclusions`. Per-item Day labels (hotel, transfers, activities) now use the destination arrival date (`trip_start = arrival_flight_info.arrivalDate || flightDate || leaving_on`) instead of the origin departure date — so Day 1 correctly reads "Wed, 27 May 2026" for an overnight SHJ→ALA flight that departs Tue, 26 May. Mirrors the ProposalView UX exactly: city-0 header still shows `leaving_on` (origin departure); subsequent city headers + all per-item dates use `trip_start`. Also fixed: arrival-transfer day-1 date, departure-transfer last-day date, inter-city transfer dates. Verified end-to-end on proposal `2ad90ade-1474-4a36-9978-e224a59762b6` (Almaty 3N): regenerated PDF (5.4 MB) → AI vision confirms Day 1 = Wed 27 May, Day 2 = Thu 28 May, Day 3 = Fri 29 May, Almaty Departure on Day 3 with correct date.

- **Coupon discount now flows end-to-end through checkout (Feb 2026)**: Fixed the P0 bug where applying a coupon at checkout updated the on-screen "Coupon Applied" message but **did not** actually subtract the discount from Total Price, the Pay-Now amount, or the booking record.
  - **Frontend `BookingConfirmation.jsx`**: `finalPrice` now computes `Math.max(0, totalPrice - couponDiscount)` instead of mirroring `totalPrice` blindly. The `Proceed to Payment` callback now passes `couponCode`, `couponDiscount`, and the discounted `finalPrice` down to PaymentPage so the next step picks up the deduction. The 25% partial-payment auto-rollover, "Custom Payable" max input, and the price-summary block all consume the new `finalPrice` so the math stays consistent across the page.
  - **Frontend `PaymentPage.jsx`**: `priceAfterMarkup` now also subtracts `bookingData.couponDiscount`. `amountToPay` (full or 25% partial) recomputes against the discounted total. The successful wallet-payment POST to `/api/bookings` now includes `coupon_code`, `coupon_discount`, and `final_total`. After the booking is created, a best-effort `POST /api/coupons/redeem` increments the coupon's `usage_count`.
  - **Backend `routes/bookings.py`**: `BookingCreate` schema accepts `coupon_code`, `coupon_discount`, `final_total`. Booking record persists `total_price = final_total` (the discounted amount), `original_total_price = proposal.total_price` (audit trail), `coupon_code`, and `coupon_discount`. Existing flow (held-booking reuse, supplier routing, payment_received status) untouched.
  - **Verified end-to-end** via `/app/backend/tests/test_coupon_finalprice_e2e.py`: created a 10%-off-cap-500 coupon → validated against AED 9,547 proposal → got AED 500 discount → POSTed booking with `final_total=9047` → fetched booking back → `total_price=9047`, `original_total_price=9547`, `coupon_code` and `coupon_discount` round-tripped → redeemed coupon → `usage_count` 0→1. Cleanup of test artefacts (booking, held_booking, proposal status reset, coupon delete) verified.

- **Group Tour Brochure — Cover gallery + Day-wise images (Feb 2026)**: Extended the existing `/api/group-tours/{id}/brochure-pdf` WeasyPrint generator (`routes/group_tours.py::_build_brochure_html`) to render images in two new places, exactly as requested.
  - **Cover page**: When the package has more than one cover image (`pkg.images[]`), the additional 3 images are rendered as a horizontal thumbnail strip (28mm tall, white-bordered, rounded) directly below the price block on the cover. Hero (images[0]) continues to fill the full A4 cover behind the title.
  - **Day-wise itinerary cards**: Each `ItineraryDay` now starts with a full-width hero banner (38mm tall) using the day's primary image (`day.images[0]`). When the day has more than 1 image, a thumbnail strip of up to 4 additional photos (32mm × 22mm) renders under the description. **Graceful fallback chain**: if `day.images` is empty, the card uses the day's first linked activity image; if none, it falls back to the package cover hero — so the brochure never prints a flat blank day card even when admins haven't yet uploaded explicit per-day photos.
  - **CSS**: Added `.day-hero`, `.day-thumbs`, `.day-thumb`, `.cover-gallery`, `.cover-thumb` classes. Day card padding adjusted (image bleeds full-width while text content stays inset 5mm).
  - **Verified end-to-end via Gemini Vision** on the Almaty Eid Break package (4 cover images, 1 with explicit day-wise images, 1 with empty fallback): cover hero + 3-thumbnail gallery render correctly under the AED 3,449 price; Day 1 with 3 explicit images shows hero banner + 2-thumbnail strip; Day 2 with 1 image shows just the hero banner (no strip); Day 3/4 with no explicit day images show activity-image fallback. PDF size 4.0 MB, 8 pages, valid `%PDF-1.7` header.

