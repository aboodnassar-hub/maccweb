import os
from dataclasses import dataclass
from functools import lru_cache


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


LOCAL_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

PRODUCTION_CORS_ORIGINS = [
    "https://maccweb.vercel.app",
]


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _first_env(*names: str) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def _cors_origins(environment: str) -> list[str]:
    explicit_origins = _first_env("MACC_ALLOWED_ORIGINS", "CORS_ORIGINS", "ALLOWED_ORIGINS")
    if explicit_origins:
        origins = _csv(explicit_origins)
    else:
        origins = list(PRODUCTION_CORS_ORIGINS)

    env_name = environment.strip().lower()
    allow_local = env_name in {"development", "dev", "testing", "test"} or _bool_env("MACC_ENABLE_LOCAL_CORS")
    if allow_local:
        origins.extend(LOCAL_CORS_ORIGINS)

    origins.extend(_csv(os.getenv("MACC_EXTRA_CORS_ORIGINS", "")))
    origins.extend(_csv(os.getenv("CORS_EXTRA_ORIGINS", "")))
    return _dedupe(origins)


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
    system_admin_email: str = os.getenv("MACC_SYSTEM_ADMIN_EMAIL", "abdelrahmanassar01@gmail.com").strip().lower()
    system_admin_password: str | None = os.getenv("MACC_SYSTEM_ADMIN_PASSWORD")
    system_admin_full_name: str = os.getenv("MACC_SYSTEM_ADMIN_FULL_NAME", "System Admin")
    reset_system_admin_password: bool = _bool_env("MACC_RESET_SYSTEM_ADMIN_PASSWORD")

    def __post_init__(self) -> None:
        object.__setattr__(self, "allowed_origins", _cors_origins(self.environment))


@lru_cache
def get_settings() -> Settings:
    return Settings()
