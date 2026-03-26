from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from db import db, client, UPLOADS_DIR, logger

from routes.auth import auth_router
from routes.proposals import proposals_router
from routes.flights import flights_router
from routes.hotels import hotels_router
from routes.airports import airports_router
from routes.cities import cities_router
from routes.transfers import transfers_router
from routes.activities import activities_router
from routes.terms import terms_router
from routes.ai import ai_router
from routes.payments import payments_router
from routes.sheets import sheets_router
from routes.admin import admin_router
from routes.supplier import supplier_router
from routes.uploads import uploads_router
from routes.settings import settings_router
from routes.flight_api import flight_api_router

from seed import seed_initial_data, seed_terms_policies, migrate_image_urls, migrate_activities_fields, migrate_transfer_image_urls

app = FastAPI(title="Travo DMC B2B Travel Platform", redirect_slashes=False)

api_router = APIRouter(prefix="/api")


@api_router.get("")
async def root():
    return {"message": "Travo DMC B2B Travel Platform API", "version": "2.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(proposals_router)
api_router.include_router(flights_router)
api_router.include_router(hotels_router)
api_router.include_router(airports_router)
api_router.include_router(cities_router)
api_router.include_router(transfers_router)
api_router.include_router(activities_router)
api_router.include_router(terms_router)
api_router.include_router(ai_router)
api_router.include_router(payments_router)
api_router.include_router(sheets_router)
api_router.include_router(admin_router)
api_router.include_router(supplier_router)
api_router.include_router(uploads_router)
api_router.include_router(settings_router)
api_router.include_router(flight_api_router)

app.include_router(api_router)

# Mount static files for uploads
app.mount("/api/static", StaticFiles(directory=str(UPLOADS_DIR)), name="static_uploads")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads_compat")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await seed_initial_data()
    await migrate_image_urls()
    await migrate_transfer_image_urls()
    await migrate_activities_fields()
    await seed_terms_policies()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
