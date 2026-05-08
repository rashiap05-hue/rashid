"""Coupon code management — admin CRUD + customer validation/redeem.

Coupons offer a percentage or flat-amount discount on a proposal/booking
checkout. Each coupon has an expiry date, optional usage cap, and an active
toggle. The validate endpoint is public (any signed-in user) so the booking
confirmation page can check a code before applying it; redeem must be called
once a booking is created so usage_count increments correctly.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

from db import db, get_current_user

coupons_router = APIRouter(prefix="/coupons", tags=["Coupons"])


# ----------------- Schemas -----------------

class CouponBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    discount_type: str = "percentage"      # 'percentage' | 'fixed'
    discount_value: float = 0              # 10 = 10% (or AED 10 if fixed)
    max_discount: Optional[float] = None   # cap for percentage coupons
    min_order_amount: float = 0            # only valid above this trip total
    expiry_date: Optional[str] = None      # ISO YYYY-MM-DD; null = never expires
    active: bool = True
    usage_limit: Optional[int] = None      # null = unlimited
    description: Optional[str] = ""


class CouponCreate(CouponBase):
    pass


class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_discount: Optional[float] = None
    min_order_amount: Optional[float] = None
    expiry_date: Optional[str] = None
    active: Optional[bool] = None
    usage_limit: Optional[int] = None
    description: Optional[str] = None


class CouponResponse(CouponBase):
    id: str
    usage_count: int = 0
    created_at: str
    updated_at: Optional[str] = None


class CouponValidateRequest(BaseModel):
    code: str
    order_amount: float = 0


class CouponRedeemRequest(BaseModel):
    code: str
    proposal_id: Optional[str] = None
    booking_id: Optional[str] = None


# ----------------- Helpers -----------------

def _is_admin(user: dict) -> bool:
    role = (user.get("role") or "").lower()
    return role in ("admin", "staff")


def _compute_discount(coupon: dict, order_amount: float) -> float:
    """Apply the coupon's rule to a given order amount → AED discount."""
    dtype = (coupon.get("discount_type") or "percentage").lower()
    val = float(coupon.get("discount_value") or 0)
    if dtype == "fixed":
        discount = val
    else:  # percentage
        discount = order_amount * val / 100.0
        cap = coupon.get("max_discount")
        if cap and cap > 0:
            discount = min(discount, float(cap))
    discount = min(discount, order_amount)
    return round(max(discount, 0), 2)


def _check_usable(coupon: dict, order_amount: float) -> Optional[str]:
    """Return None if the coupon can be used right now, or an error string."""
    if not coupon.get("active", True):
        return "This coupon is not active"
    expiry = (coupon.get("expiry_date") or "").strip()
    if expiry:
        try:
            exp = datetime.strptime(expiry[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc).date() > exp.date():
                return "This coupon has expired"
        except (ValueError, TypeError):
            pass
    cap = coupon.get("usage_limit")
    if cap and (coupon.get("usage_count") or 0) >= cap:
        return "This coupon has reached its usage limit"
    minimum = float(coupon.get("min_order_amount") or 0)
    if minimum > 0 and order_amount < minimum:
        return f"This coupon requires a minimum order of AED {minimum:,.0f}"
    return None


# ----------------- Admin endpoints -----------------

@coupons_router.post("", response_model=CouponResponse)
async def create_coupon(payload: CouponCreate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can create coupons")
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=409, detail="A coupon with this code already exists")
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "code": code,
        "usage_count": 0,
        "created_at": now,
        "updated_at": now,
    })
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return CouponResponse(**doc)


@coupons_router.get("")
async def list_coupons(user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can list coupons")
    docs = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [CouponResponse(**d) for d in docs]


@coupons_router.patch("/{coupon_id}", response_model=CouponResponse)
async def update_coupon(coupon_id: str, payload: CouponUpdate, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can update coupons")
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "code" in update:
        update["code"] = update["code"].strip().upper()
        # Guard against renaming to a clashing code
        clash = await db.coupons.find_one({"code": update["code"], "id": {"$ne": coupon_id}})
        if clash:
            raise HTTPException(status_code=409, detail="Another coupon already uses this code")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.coupons.update_one({"id": coupon_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    doc = await db.coupons.find_one({"id": coupon_id}, {"_id": 0})
    return CouponResponse(**doc)


@coupons_router.delete("/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_current_user)):
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Only admins can delete coupons")
    res = await db.coupons.delete_one({"id": coupon_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True}


# ----------------- Public endpoints -----------------

@coupons_router.post("/validate")
async def validate_coupon(payload: CouponValidateRequest, user: dict = Depends(get_current_user)):
    code = (payload.code or "").strip().upper()
    if not code:
        return {"valid": False, "message": "Please enter a coupon code"}
    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not coupon:
        return {"valid": False, "message": "Invalid coupon code"}
    err = _check_usable(coupon, payload.order_amount or 0)
    if err:
        return {"valid": False, "message": err}
    discount = _compute_discount(coupon, payload.order_amount or 0)
    return {
        "valid": True,
        "code": coupon["code"],
        "discount": discount,
        "discount_type": coupon.get("discount_type"),
        "discount_value": coupon.get("discount_value"),
        "message": f"Coupon applied — you saved AED {discount:,.0f}",
    }


@coupons_router.post("/redeem")
async def redeem_coupon(payload: CouponRedeemRequest, user: dict = Depends(get_current_user)):
    code = (payload.code or "").strip().upper()
    coupon = await db.coupons.find_one({"code": code}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    err = _check_usable(coupon, 0)
    if err:
        raise HTTPException(status_code=400, detail=err)
    await db.coupons.update_one({"id": coupon["id"]}, {"$inc": {"usage_count": 1}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True}
