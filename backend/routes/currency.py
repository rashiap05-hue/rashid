from fastapi import APIRouter
from datetime import datetime, timezone
import httpx
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = {
    "AED": {"symbol": "AED", "name": "UAE Dirham", "flag": "🇦🇪"},
    "USD": {"symbol": "$", "name": "US Dollar", "flag": "🇺🇸"},
    "EUR": {"symbol": "€", "name": "Euro", "flag": "🇪🇺"},
    "GBP": {"symbol": "£", "name": "British Pound", "flag": "🇬🇧"},
    "INR": {"symbol": "₹", "name": "Indian Rupee", "flag": "🇮🇳"},
}

_cache = {"rates": None, "fetched_at": None}


@router.get("/currency/rates")
async def get_exchange_rates():
    now = datetime.now(timezone.utc)
    if _cache["rates"] and _cache["fetched_at"]:
        age = (now - _cache["fetched_at"]).total_seconds()
        if age < 3600:
            return _cache["rates"]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://open.er-api.com/v6/latest/AED")
            data = resp.json()
            if data.get("result") == "success":
                all_rates = data.get("rates", {})
                rates = {}
                for code in SUPPORTED_CURRENCIES:
                    if code in all_rates:
                        rates[code] = round(all_rates[code], 4)
                result = {
                    "base": "AED",
                    "rates": rates,
                    "currencies": SUPPORTED_CURRENCIES,
                    "updated_at": now.isoformat(),
                }
                _cache["rates"] = result
                _cache["fetched_at"] = now
                return result
    except Exception as e:
        logger.error(f"Failed to fetch exchange rates: {e}")

    fallback = {
        "base": "AED",
        "rates": {"AED": 1, "USD": 0.2723, "EUR": 0.2512, "GBP": 0.2149, "INR": 22.83},
        "currencies": SUPPORTED_CURRENCIES,
        "updated_at": now.isoformat(),
        "fallback": True,
    }
    _cache["rates"] = fallback
    _cache["fetched_at"] = now
    return fallback
