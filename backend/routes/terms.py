from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from db import db, get_current_user, security
from models.schemas import TermsPolicyCreate
from datetime import datetime, timezone
import uuid

terms_router = APIRouter(prefix="/terms-policies", tags=["Terms and Policies"])


@terms_router.get("")
async def get_terms_policies(
    country: Optional[str] = None,
    city: Optional[str] = None,
    category: Optional[str] = None,
    active_only: bool = True
):
    looked_up_country = None
    if city and not country:
        city_doc = await db.cities.find_one(
            {"name": {"$regex": f"^{city}$", "$options": "i"}},
            {"country": 1, "_id": 0}
        )
        if city_doc:
            looked_up_country = city_doc.get("country")

    effective_country = country or looked_up_country

    query = {}
    if active_only:
        query["is_active"] = True

    or_conditions = [{"applies_to": "all"}]
    if city:
        or_conditions.append({"city": city, "applies_to": "city"})
    if effective_country:
        or_conditions.append({"country": effective_country, "applies_to": "country"})
    if category:
        query["category"] = category

    query["$or"] = or_conditions
    terms = await db.terms_policies.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return terms


@terms_router.get("/all")
async def get_all_terms_policies():
    terms = await db.terms_policies.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return terms


@terms_router.get("/categories/list")
async def get_terms_categories():
    categories = await db.terms_policies.distinct("category")
    return categories


@terms_router.get("/countries/list")
async def get_terms_countries():
    countries = await db.terms_policies.distinct("country")
    return [c for c in countries if c]


@terms_router.get("/{term_id}")
async def get_term_policy(term_id: str):
    term = await db.terms_policies.find_one({"id": term_id}, {"_id": 0})
    if not term:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    return term


@terms_router.post("")
async def create_term_policy(term: TermsPolicyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    term_dict = term.dict()
    term_dict["id"] = str(uuid.uuid4())
    term_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    term_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    term_dict["created_by"] = user.get("id")
    await db.terms_policies.insert_one(term_dict)
    term_dict.pop("_id", None)
    return term_dict


@terms_router.put("/{term_id}")
async def update_term_policy(term_id: str, term: TermsPolicyCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    term_dict = term.dict()
    term_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.terms_policies.update_one({"id": term_id}, {"$set": term_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    updated_term = await db.terms_policies.find_one({"id": term_id}, {"_id": 0})
    return updated_term


@terms_router.delete("/{term_id}")
async def delete_term_policy(term_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.terms_policies.delete_one({"id": term_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Term/Policy not found")
    return {"success": True}
