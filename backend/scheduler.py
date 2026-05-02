"""APScheduler jobs for the Travo DMC backend.

Currently runs a single daily job that scans bookings with an outstanding
balance + `final_payment_due_date` and fires the reminder email at the T-14,
T-7 and T-3 milestones (each milestone sent at most once per booking).

The scheduler is started on FastAPI `startup` and shut down on `shutdown`.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from db import db
from routes.invoice_voucher import _send_payment_reminder_core

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
MILESTONES = [("T-14", 14), ("T-7", 7), ("T-3", 3)]


async def _synthetic_admin_for(owner_id: str | None) -> dict:
    """Build a fake 'current_user' context for the scheduler so the reminder
    core helper can load the booking. We use the booking owner when available,
    else any admin user."""
    if owner_id:
        u = await db.users.find_one({"id": owner_id}, {"_id": 0})
        if u:
            return u
    u = await db.users.find_one({"role": "admin"}, {"_id": 0})
    return u or {"id": "system", "role": "admin", "email": "system@travotours.ae"}


async def run_due_date_reminders() -> dict:
    """Fire reminder emails for every booking whose `final_payment_due_date`
    is exactly 14, 7 or 3 days away and whose milestone hasn't been sent yet.

    Returns a stats summary for logging/tests.
    """
    today = datetime.now(timezone.utc).date()
    stats = {"scanned": 0, "sent": 0, "skipped": 0, "errors": 0, "milestones": {}}

    cursor = db.bookings.find({
        "final_payment_due_date": {"$exists": True, "$nin": [None, ""]},
    }, {"_id": 0, "id": 1, "final_payment_due_date": 1, "payment_amount": 1,
        "total_price": 1, "payment_fee": 1, "refund_amount": 1,
        "auto_reminder_milestones_sent": 1, "user_id": 1, "created_by": 1,
        "customer_email": 1})

    async for bk in cursor:
        stats["scanned"] += 1
        due_raw = str(bk.get("final_payment_due_date") or "")[:10]
        try:
            due_date = datetime.strptime(due_raw, "%Y-%m-%d").date()
        except Exception:
            stats["skipped"] += 1
            continue
        days_to_due = (due_date - today).days

        # Pick the matching milestone (if any)
        milestone = next((m for m, d in MILESTONES if d == days_to_due), None)
        if not milestone:
            stats["skipped"] += 1
            continue

        already_sent = set(bk.get("auto_reminder_milestones_sent") or [])
        if milestone in already_sent:
            stats["skipped"] += 1
            continue

        # Outstanding balance check (cheap first-pass filter)
        total = float(bk.get("total_price") or 0)
        paid = float(bk.get("payment_amount") or 0)
        fee = float(bk.get("payment_fee") or 0)
        refund = float(bk.get("refund_amount") or 0)
        if max(total - paid + fee - refund, 0) < 0.01:
            stats["skipped"] += 1
            continue

        owner_id = bk.get("user_id") or bk.get("created_by")
        current_user = await _synthetic_admin_for(owner_id)
        try:
            await _send_payment_reminder_core(bk["id"], current_user, source="auto", milestone=milestone)
            stats["sent"] += 1
            stats["milestones"][milestone] = stats["milestones"].get(milestone, 0) + 1
            logger.info("[reminder-scheduler] sent %s reminder for booking %s", milestone, bk.get("id"))
        except Exception as e:
            stats["errors"] += 1
            logger.warning("[reminder-scheduler] failed for booking %s: %s", bk.get("id"), e)

    return stats


def start_scheduler() -> None:
    """Start the APScheduler. Safe to call multiple times — idempotent."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    sched = AsyncIOScheduler(timezone="UTC")
    # Daily at 09:00 UTC = 13:00 GST (good morning in Dubai, nudges customers early)
    sched.add_job(
        run_due_date_reminders,
        CronTrigger(hour=9, minute=0),
        id="payment-reminder-milestones",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    sched.start()
    _scheduler = sched
    logger.info("[reminder-scheduler] started — daily payment-reminder-milestones @ 09:00 UTC")


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[reminder-scheduler] shut down")
    _scheduler = None
