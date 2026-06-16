# Pre-Integration Questionnaire for RateHawk API Partners

**Partner:** Travo DMC (Travo Tours & Travels)  
**Prepared by:** Technical Integration Team  
**Date:** June 2026  
**Questionnaire version:** May 2026  
**Status:** Draft — pending internal review before submission to RateHawk Account Manager

---

## 1. Company & Partnership Details

| # | Question | Response |
|---|----------|----------|
| 1.1 | Legal company name | Travo Tours & Travels *(confirm legal entity name with finance)* |
| 1.2 | Trading / brand name | Travo DMC |
| 1.3 | Company registration country | United Arab Emirates |
| 1.4 | Primary business address | Dubai, UAE *(confirm full registered address)* |
| 1.5 | Company website | www.travotours.ae *(confirm production URL)* |
| 1.6 | Partner type | B2B travel platform / DMC (Destination Management Company) |
| 1.7 | Business model | We serve travel agents and advisors who build multi-city itineraries (hotels + transfers + activities + flights) and confirm bookings on behalf of end travellers. Hotels are one component of packaged proposals, not a standalone OTA storefront. |
| 1.8 | Years in operation | Established travel operator *(confirm exact year)* |
| 1.9 | Active agent network size | 7,200+ registered travel agents (platform marketing figure) |
| 1.10 | Primary markets / source countries | UAE, GCC, India, and broader international outbound leisure & FIT travel |
| 1.11 | Destination focus (initial) | Global hotel inventory required; initial high-volume corridors include UAE, Georgia, Thailand, Kazakhstan, Azerbaijan, and other FIT destinations already sold on the platform |
| 1.12 | RateHawk account email (if registered) | rashid@travotours.ae *(confirm primary API account holder)* |
| 1.13 | Preferred contract / billing currency | AED (primary display), with support for USD, EUR, GBP, INR via live FX conversion |
| 1.14 | Payment model preference | Credit line / deposit account *(confirm with finance — currently wallet + bank transfer flows for agent payments)* |

---

## 2. Primary & Technical Contacts

| Role | Name | Email | Phone | Time zone |
|------|------|-------|-------|-----------|
| Business / Account Owner | Rashid *(confirm surname)* | rashid@travotours.ae | *(confirm)* | GST (UTC+4) |
| Technical Lead / Integration Owner | *(assign)* | *(assign)* | *(assign)* | GST (UTC+4) |
| DevOps / Infrastructure | *(assign)* | *(assign)* | *(assign)* | GST (UTC+4) |
| Finance / Billing | *(assign)* | *(assign)* | *(assign)* | GST (UTC+4) |
| 24/7 Operations escalation | Neha *(confirm surname)* | neha@travotours.ae | +971 54 232 1025 | GST (UTC+4) |

**Preferred communication language:** English  
**Secondary languages (operations):** Arabic, Hindi *(if applicable)*

---

## 3. Integration Scope & Product Requirements

| # | Question | Response |
|---|----------|----------|
| 3.1 | Integration type | Direct API integration (API v3) into our B2B platform backend |
| 3.2 | Products to integrate | Hotel search, availability, prebook/book, booking status, cancellation, and static content (hotel descriptions, images, amenities, room metadata) |
| 3.3 | Platforms in scope | Web application (React SPA) — primary. Mobile-responsive web; no native iOS/Android app at launch. |
| 3.4 | Will you use Sandbox first? | **Yes.** We will develop and certify entirely in Sandbox (`https://api-sandbox.worldota.net`) before requesting production credentials. |
| 3.5 | API version | **API v3 only** (no legacy v1/v2) |
| 3.6 | Search entry points needed | Region/city search, geo search, hotel ID lookup, and hotel page (single-property rate refresh) |
| 3.7 | Pre-filtered SERP results | **Yes** — we want server-side pre-filtered accommodation results where available (star rating, meal plan, free cancellation) to reduce client-side filtering load |
| 3.8 | Content API | **Yes** — hotel static content (images, descriptions, amenities, room size, geo coordinates) for proposal PDFs and agent-facing hotel detail pages |
| 3.9 | Multi-room bookings | **Yes** — itineraries commonly include 1–3 rooms per city stay with mixed adult/child occupancy |
| 3.10 | Multi-hotel / multi-city itineraries | **Yes** — a single booking proposal may contain 2–6 hotel stays across different cities and date ranges |
| 3.11 | Package rates | Not required at launch; evaluate in Phase 2 if RateHawk package-rate endpoints add value for our FIT builder |
| 3.12 | Quotes feature | **Interested** — evaluate RateHawk Quotes API for agent offer management in a later phase |
| 3.13 | Booking on behalf of (B2B2C) | Agents book on behalf of end travellers; guest names and residency are captured at confirmation |
| 3.14 | Instant confirmation required? | **Yes** — agents expect immediate confirmation numbers for hotel segments within the broader itinerary |
| 3.15 | Hold / pay-later flow | **Yes** — platform supports Hold Booking (deposit / payment pending) before final confirmation; hotel segment should support book-now or hold-compatible flows per RateHawk capabilities |
| 3.16 | Cancellation support | **Yes** — full cancellation with policy display at search/book time; cancellation fees surfaced to agents before action |
| 3.17 | Modification support | Phase 2 — date/room changes via cancel-and-rebook initially; native modification API if available |
| 3.18 | Voucher / confirmation document | **Yes** — we generate branded PDF vouchers and proforma invoices; need RateHawk booking reference, hotel confirmation number, guest names, room type, meal plan, check-in/out |
| 3.19 | Webhooks / push notifications | **Yes** — interested in booking status change webhooks (confirmation, no-show, cancellation) if offered; otherwise polling with exponential backoff |
| 3.20 | Reconciliation / reporting | Daily booking reconciliation export; finance needs booking ID, net rate, sell rate, status, cancellation penalties |

---

## 4. Technical Architecture

| # | Question | Response |
|---|----------|----------|
| 4.1 | Backend language / framework | Python 3.x, FastAPI (async), Pydantic v2 |
| 4.2 | Frontend | React.js, Tailwind CSS, Axios |
| 4.3 | Database | MongoDB (Motor async driver) |
| 4.4 | Hosting / cloud provider | Cloud-hosted (containerised deployment) *(confirm AWS/GCP/Azure and region)* |
| 4.5 | Production server region | Prefer EU or ME region for latency to RateHawk endpoints *(confirm actual region)* |
| 4.6 | Architecture pattern | Supplier adapter layer behind internal `/api/hotels` routes — RateHawk logic isolated from core proposal/booking engine; responses normalised to Travo hotel schema |
| 4.7 | Authentication handling | API Key stored in environment secrets; dedicated HMAC signing utility for secure booking/cancellation endpoints |
| 4.8 | Credential storage | Environment variables / secrets manager — separate Sandbox and Production keys; never committed to source control |
| 4.9 | Outbound IP addresses (for whitelisting) | *(provide static egress IPs before production go-live)* |
| 4.10 | Expected Sandbox go-live (dev start) | Immediately upon receipt of Sandbox credentials |
| 4.11 | Expected Production go-live target | Within 30 days of Sandbox certification *(subject to internal QA)* |
| 4.12 | SSL/TLS | All API traffic over HTTPS; TLS 1.2+ |
| 4.13 | Logging | Structured request/response logging with PII redaction; correlation IDs per search/book session |
| 4.14 | Error handling | Graceful degradation — if RateHawk is unavailable, agents can still select manually-entered hotels from admin catalogue; user-facing error messages are non-technical |
| 4.15 | Rate limiting / retry strategy | Exponential backoff on 429/5xx; idempotent booking retries with deduplication on `partner_order_id` |
| 4.16 | Caching strategy | Short TTL cache for search results (2–5 min); no cache on prebook/book; static content cached 24h |
| 4.17 | Existing hotel inventory | Yes — admin-managed hotel catalogue (MongoDB) used today for DMC-contracted properties; RateHawk will augment/replace live inventory for non-contracted destinations |

---

## 5. Search & Booking Parameters

| # | Question | Response |
|---|----------|----------|
| 5.1 | Default search currency | AED |
| 5.2 | Supported display currencies | AED, USD, EUR, GBP, INR (converted client-side via live FX API) |
| 5.3 | Guest residency / nationality | **Required** — captured at booking for RateHawk residency rules |
| 5.4 | Typical occupancy | 2 adults per room (double); support 1–4 adults, 0–2 children per room |
| 5.5 | Child age handling | Children ages sent per RateHawk API spec at search and book |
| 5.6 | Meal plans needed | Room only (RO), Bed & Breakfast (BB), Half Board (HB), Full Board (FB), All Inclusive (AI) |
| 5.7 | Star rating filter | 3★, 4★, 5★ (primary); optional 2★ for budget corridors |
| 5.8 | Free cancellation filter | **Yes** — prominent filter in agent hotel picker |
| 5.9 | Typical lead time | 7–90 days ahead; Hold bookings require travel date > 28 days out |
| 5.10 | Typical stay length | 1–5 nights per city; multi-city trips 3–14 nights total |
| 5.11 | Maximum rooms per search | Up to 4 rooms |
| 5.12 | Maximum guests per booking | Up to 9 travellers (adults + children) |

---

## 6. Volume & Performance Expectations

| # | Question | Response |
|---|----------|----------|
| 6.1 | Estimated monthly searches (Year 1) | 5,000 – 15,000 |
| 6.2 | Estimated monthly bookings (Year 1) | 200 – 800 hotel room-nights |
| 6.3 | Estimated monthly bookings (Year 3) | 2,000 – 5,000 hotel room-nights |
| 6.4 | Peak season | Q4 (Oct–Dec), school holidays, UAE National Day, Christmas/New Year |
| 6.5 | Peak concurrent users | 50 – 150 agents during business hours (GST) |
| 6.6 | Search response time SLA expected | < 3 seconds for SERP; < 5 seconds for hotel page |
| 6.7 | Booking confirmation time expected | < 10 seconds end-to-end |

*(Volume figures are estimates — finance to validate before submission.)*

---

## 7. Certification & Testing Plan

| # | Question | Response |
|---|----------|----------|
| 7.1 | Certification contact | Same as Technical Lead (Section 2) |
| 7.2 | Sandbox test scenarios we will cover | Single-room book + cancel; multi-room same hotel; multi-city sequential hotels; child occupancy; meal plan variants; free vs non-refundable rates; price-change handling between prebook and book; booking timeout / retry; HMAC signature validation |
| 7.3 | Test property usage | RateHawk Sandbox mock properties per official certification guidelines |
| 7.4 | Certification timeline | Target 14–21 days from Sandbox access to certification submission |
| 7.5 | UAT participants | 2 developers, 1 QA, 2 senior travel agents, 1 operations staff |
| 7.6 | Production cutover plan | Feature-flagged rollout — RateHawk inventory enabled per destination corridor; admin catalogue remains fallback |
| 7.7 | Rollback plan | Feature flag off → revert to admin-managed hotel catalogue; in-flight RateHawk bookings honoured via direct API |

---

## 8. Compliance, Legal & Data

| # | Question | Response |
|---|----------|----------|
| 8.1 | PCI-DSS scope | We do **not** pass card data to RateHawk — payments handled via Stripe / bank transfer / agent wallet on our side |
| 8.2 | GDPR / data privacy | Guest PII (name, email, phone, passport details) stored in MongoDB; minimal data sent to RateHawk per booking requirements |
| 8.3 | Data retention | Booking records retained 7 years for financial audit |
| 8.4 | Terms displayed to agents | RateHawk cancellation policies and hotel rules shown at selection and on proposal PDF |
| 8.5 | Company T&C | Standard Refund & Cancellation Policy template already deployed on platform |

---

## 9. Current Platform Capabilities (Context for RateHawk Team)

Travo DMC is a React + FastAPI + MongoDB B2B platform. Relevant existing features that RateHawk hotels will plug into:

- **Trip Builder** — day-by-day itinerary with per-city hotel selection, room type, meal plan, and pricing
- **Auto-Recommendation Engine** — auto-selects best hotel per city based on rating and price
- **Proposal Viewer** — branded itinerary PDF with hotel detail pages (images, room type, meal plan, confirmation number)
- **Booking Flow** — Hold / Pay Now / Wallet payment; traveller and contact capture; booking reference format `TBM-XXXXXX`
- **Supplier Portal** — operations team confirms hotel segments and enters supplier confirmation numbers
- **Operational Dashboard** — per-service confirmation tracking keyed by `hotel:<city>_<idx>`
- **Collections & Payment Reminders** — automated payment reminder emails with proforma invoice PDFs
- **Multi-Currency** — AED default with USD/EUR/GBP/INR conversion

**Current hotel data source:** Admin-managed MongoDB catalogue (static rates, manual confirmation). RateHawk integration replaces/augments this with live global inventory.

---

## 10. Open Questions for RateHawk Account Manager

1. Confirm credit line / deposit terms and minimum balance requirements for UAE-based B2B partners.
2. Provide Sandbox API credentials and confirm access to Sandbox Integration and Certification Guidelines.
3. Confirm whether booking webhooks are available in API v3 or if polling is the recommended approach.
4. Clarify HMAC-required endpoint list for our integration scope.
5. Confirm Content API access tier and any rate limits on static content pulls.
6. Advise on pre-filtered SERP parameter support for our expected filter set (stars, meal plan, free cancellation).
7. Confirm multi-hotel booking approach — separate book calls per stay vs. batch if supported.
8. Provide production IP whitelisting procedure and timeline.
9. Confirm SLA for technical support during GST business hours and 24/7 escalation path.
10. Share certification checklist document and sample certification call scheduling process.

---

## 11. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Authorised Signatory (Business) | | | |
| Technical Lead | | | |
| Finance Approval | | | |

---

*Internal reference only until reviewed and submitted to RateHawk. Fields marked "confirm" require input from business/finance before external submission.*
