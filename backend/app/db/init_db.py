from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.modules.accounting.seed import seed_chart_of_accounts
from backend.app.modules.auth.service import ensure_default_roles, ensure_system_admin
from backend.app.modules.companies.models import Company

from backend.app.db import models as db_models  # noqa: F401


def _ensure_default_company(db: Session) -> Company:
    settings = get_settings()
    company = db.query(Company).filter(Company.code == settings.default_company_code).first()
    if company:
        return company

    company = Company(
        code=settings.default_company_code,
        name_en="Main Company",
        name_ar="الشركة الرئيسية",
        base_currency="JOD",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def seed_database() -> None:
    db = SessionLocal()
    try:
        company = _ensure_default_company(db)
        ensure_default_roles(db)
        ensure_system_admin(db, company)
        seed_chart_of_accounts(db, company.id)
    finally:
        db.close()


def init_db(create_schema: bool = True) -> None:
    if create_schema:
        Base.metadata.create_all(bind=engine)
    seed_database()
