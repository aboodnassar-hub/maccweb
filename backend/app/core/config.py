import os
from dataclasses import dataclass
from functools import lru_cache


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def _database_url() -> str:
    value = (
        os.getenv("MACC_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or "sqlite:///./macc_erp.db"
    )
    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql://", 1)
    return value


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("MACC_APP_NAME", "Macc ERP API")
    environment: str = os.getenv("MACC_ENV", "development")
    api_prefix: str = os.getenv("MACC_API_PREFIX", "/api/v1")
    database_url: str = _database_url()
    secret_key: str = os.getenv("MACC_SECRET_KEY", "change-this-secret-before-production")
    access_token_expire_minutes: int = int(os.getenv("MACC_ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    allowed_origins: list[str] = None
    auto_create_tables: bool = os.getenv("MACC_AUTO_CREATE_TABLES", "false").lower() == "true"
    default_company_code: str = os.getenv("MACC_DEFAULT_COMPANY_CODE", "MAIN")

    def __post_init__(self) -> None:
        origins = os.getenv(
            "MACC_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        )
        object.__setattr__(self, "allowed_origins", _csv(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
