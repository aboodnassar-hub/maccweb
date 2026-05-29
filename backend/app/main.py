from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.router import api_router
from backend.app.core.config import get_settings
from backend.app.db.init_db import init_db


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Modular ERP/accounting API for Macc.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    if settings.auto_create_tables:
        init_db()


@app.get("/health", tags=["system"])
def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
    }


app.include_router(api_router, prefix=settings.api_prefix)
