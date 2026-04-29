"""Sequential booking-number helper.

Generates `TBM-{N:06d}` references (e.g. `TBM-000123`) for vouchers, invoices, and
booking displays. Uses a `counters` collection with atomic findOneAndUpdate to
guarantee monotonic, gap-free sequencing across concurrent bookings.

Use:
    from booking_number import next_booking_number, format_booking_ref
    n = await next_booking_number()        # -> int, e.g. 123
    ref = format_booking_ref(n)            # -> "TBM-000123"

Already-assigned bookings reuse `booking.booking_number`. The migration script
populates this for legacy rows in created_at order.
"""
from pymongo import ReturnDocument

from db import db

PREFIX = "TBM"
PAD = 6


async def next_booking_number() -> int:
    """Atomically increment and return the next booking sequence number."""
    res = await db.counters.find_one_and_update(
        {"_id": "booking_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int((res or {}).get("seq") or 1)


def format_booking_ref(num) -> str:
    """Format an integer (or string) as `TBM-000123`. Returns `""` for falsy input."""
    if num is None or num == "":
        return ""
    try:
        n = int(num)
        return f"{PREFIX}-{n:0{PAD}d}"
    except (ValueError, TypeError):
        # Unrecognized — show raw to avoid hiding data.
        return f"{PREFIX}-{num}"
