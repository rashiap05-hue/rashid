from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from db import db, get_current_user
from datetime import datetime, timezone
import uuid

settings_router = APIRouter(prefix="/settings", tags=["Settings"])

DEFAULT_INSURANCE = {
    "country": "Default",
    "price_per_person": 50,
    "currency": "AED",
    "min_coverage": 50000,
    "max_age": 60,
    "description": "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs"
}


@settings_router.get("/insurance")
async def get_insurance_settings(country: Optional[str] = None):
    if country:
        entry = await db.insurance_prices.find_one({"country": country}, {"_id": 0})
        if entry:
            return entry
        default = await db.insurance_prices.find_one({"country": "Default"}, {"_id": 0})
        return default or DEFAULT_INSURANCE

    entries = []
    async for doc in db.insurance_prices.find({}, {"_id": 0}).sort("country", 1):
        entries.append(doc)
    if not entries:
        seed = {**DEFAULT_INSURANCE, "id": str(uuid.uuid4()), "created_at": datetime.now(timezone.utc).isoformat()}
        await db.insurance_prices.insert_one(seed)
        entries = [{k: v for k, v in seed.items() if k != "_id"}]
    return {"insurance_prices": entries}


@settings_router.post("/insurance")
async def create_insurance_price(request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    country = data.get("country", "").strip()
    if not country:
        raise HTTPException(status_code=400, detail="Country is required")
    existing = await db.insurance_prices.find_one({"country": country})
    if existing:
        raise HTTPException(status_code=400, detail=f"Insurance price for '{country}' already exists")
    entry = {
        "id": str(uuid.uuid4()),
        "country": country,
        "price_per_person": data.get("price_per_person", 50),
        "currency": data.get("currency", "AED"),
        "min_coverage": data.get("min_coverage", 50000),
        "max_age": data.get("max_age", 60),
        "description": data.get("description", "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.insurance_prices.insert_one(entry)
    entry.pop("_id", None)
    return entry


@settings_router.put("/insurance/{entry_id}")
async def update_insurance_price(entry_id: str, request: Request, user: dict = Depends(get_current_user)):
    data = await request.json()
    update_fields = {
        "price_per_person": data.get("price_per_person", 50),
        "currency": data.get("currency", "AED"),
        "min_coverage": data.get("min_coverage", 50000),
        "max_age": data.get("max_age", 60),
        "description": data.get("description", ""),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    new_country = data.get("country", "").strip()
    if new_country:
        existing = await db.insurance_prices.find_one({"country": new_country, "id": {"$ne": entry_id}})
        if existing:
            raise HTTPException(status_code=400, detail=f"Insurance price for '{new_country}' already exists")
        update_fields["country"] = new_country
    result = await db.insurance_prices.update_one({"id": entry_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Insurance price entry not found")
    updated = await db.insurance_prices.find_one({"id": entry_id}, {"_id": 0})
    return updated


@settings_router.delete("/insurance/{entry_id}")
async def delete_insurance_price(entry_id: str, user: dict = Depends(get_current_user)):
    entry = await db.insurance_prices.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Insurance price entry not found")
    if entry.get("country") == "Default":
        raise HTTPException(status_code=400, detail="Cannot delete the Default pricing entry")
    await db.insurance_prices.delete_one({"id": entry_id})
    return {"message": "Insurance price entry deleted"}


# ── Visa Settings ──────────────────────────────────────

VISA_DEFAULTS = {
    "Georgia": {"visa_type": "Tourist Visa", "entry_type": "Tourist / Single Entry / Sticker Visa", "required": False, "notes": "Visa on arrival for most nationalities"},
    "Turkey": {"visa_type": "Tourist Visa", "entry_type": "e-Visa / Single Entry", "required": True, "notes": "e-Visa required for most nationalities"},
    "Thailand": {"visa_type": "Tourist Visa", "entry_type": "Tourist / Single Entry", "required": False, "notes": "Visa exemption for many nationalities (30 days)"},
    "Default": {"visa_type": "Tourist Visa", "entry_type": "Tourist / Single Entry", "required": True, "notes": "Check visa requirements for your nationality"},
}

@settings_router.get("/visa")
async def get_visa_settings(country: Optional[str] = None):
    if country:
        entry = await db.visas.find_one({"country": {"$regex": f"^{country}$", "$options": "i"}}, {"_id": 0})
        if entry:
            return entry
        # Fall back to defaults
        if country in VISA_DEFAULTS:
            return {"country": country, **VISA_DEFAULTS[country]}
        return {"country": country, **VISA_DEFAULTS["Default"]}

    entries = []
    async for doc in db.visas.find({}, {"_id": 0}).sort("country", 1):
        entries.append(doc)
    return {"visa_settings": entries}



# ---------------------------------------------------------------------------
# Branding (white-label) settings — single tenant-wide override applied to
# customer-facing PDFs (Brochure / Invoice / Voucher / Payment Receipt).
# ---------------------------------------------------------------------------
import base64
from pathlib import Path
from db import UPLOADS_DIR

_BRANDING_KEY = "branding"


def _empty_branding() -> dict:
    return {
        "key": _BRANDING_KEY,
        "logo_url": "",          # /api/static/branding/<file>.png — applied to all PDFs when set
        "company_name": "",      # company name shown on PDF headers/footers
        "footer_email": "",      # support / care email
        "footer_phone": "",      # optional phone shown in PDF footer
        "footer_website": "",    # optional website shown in PDF footer
        "updated_at": "",
    }


def _is_admin(user: dict) -> bool:
    role = ((user or {}).get("role") or "").lower()
    return role in ("admin", "staff")


@settings_router.get("/branding")
async def get_branding(user: dict = Depends(get_current_user)):
    """Return the current tenant-wide branding settings. Any signed-in user can
    read so the frontend can preview the logo + footer that will appear on
    their downloaded PDFs."""
    doc = await db.app_settings.find_one({"key": _BRANDING_KEY}, {"_id": 0})
    return doc or _empty_branding()


@settings_router.put("/branding")
async def update_branding(request: Request, user: dict = Depends(get_current_user)):
    """Admin/staff update the tenant-wide branding. Whitelisted fields only."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    data = await request.json()
    allowed = {"logo_url", "company_name", "footer_email", "footer_phone", "footer_website"}
    update = {k: (data.get(k) or "").strip() for k in allowed if k in data}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["key"] = _BRANDING_KEY
    await db.app_settings.update_one(
        {"key": _BRANDING_KEY},
        {"$set": update},
        upsert=True,
    )
    doc = await db.app_settings.find_one({"key": _BRANDING_KEY}, {"_id": 0})
    return doc or _empty_branding()


@settings_router.delete("/branding")
async def reset_branding(user: dict = Depends(get_current_user)):
    """Admin-only — clear all branding overrides (PDFs revert to defaults)."""
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.app_settings.delete_one({"key": _BRANDING_KEY})
    return _empty_branding()


# ---------------------------------------------------------------------------
# Shared helper — used by every PDF generator (brochure, invoice, voucher,
# receipt). Resolves the saved logo URL into a `data:image/...;base64,` string
# so WeasyPrint can embed the image without a network round-trip, and exposes
# the company-block fields directly.
# ---------------------------------------------------------------------------
async def get_pdf_branding() -> dict:
    """Returns the branding dict to be injected into a PDF builder.

    Keys:
        logo_data_url   — base64-encoded data URL for the saved logo, or "" if
                          none uploaded. Only PNG / JPEG / WEBP supported.
        company_name    — empty string if not configured.
        footer_email    — same.
        footer_phone    — same.
        footer_website  — same.
    """
    doc = await db.app_settings.find_one({"key": _BRANDING_KEY}, {"_id": 0})
    if not doc:
        return {"logo_data_url": "", "company_name": "", "footer_email": "",
                "footer_phone": "", "footer_website": ""}
    logo_url = (doc.get("logo_url") or "").strip()
    logo_data_url = ""
    if logo_url:
        # The URL is /api/static/branding/<file>.<ext> — resolve to the local
        # file and base64-encode it so WeasyPrint embeds it inline.
        import re as _re
        m = _re.search(r"/(?:api/static|uploads)/([^?#]+)", logo_url)
        if m:
            local = UPLOADS_DIR / m.group(1)
            if local.exists():
                ext = local.suffix.lower().lstrip(".")
                mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp",
                        "gif": "gif"}.get(ext, "png")
                try:
                    with open(local, "rb") as lf:
                        logo_data_url = f"data:image/{mime};base64," + base64.b64encode(lf.read()).decode("ascii")
                except Exception:
                    logo_data_url = ""
    return {
        "logo_data_url": logo_data_url,
        "company_name": (doc.get("company_name") or "").strip(),
        "footer_email": (doc.get("footer_email") or "").strip(),
        "footer_phone": (doc.get("footer_phone") or "").strip(),
        "footer_website": (doc.get("footer_website") or "").strip(),
    }
