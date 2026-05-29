from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.security import hash_password
from backend.app.modules.accounting.models import Account, CostCenter, JournalEntry, JournalLine
from backend.app.modules.accounting.seed import seed_chart_of_accounts
from backend.app.modules.audit.models import ActivityLog
from backend.app.modules.auth.models import Role, User, user_roles
from backend.app.modules.auth.service import ensure_default_roles
from backend.app.modules.companies.models import Branch, Company, FinancialYear
from backend.app.modules.hr.models import Department, Employee
from backend.app.modules.inventory.models import Item, StockMovement, Warehouse
from backend.app.modules.notifications.models import Notification
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.sales.models import Invoice, InvoiceLine, Payment
from backend.app.modules.system_admin.schemas import CompanyAccountCreate, CompanyAccountOut, ManagedUserOut


class SystemAdminError(ValueError):
    pass


def list_company_accounts(db: Session) -> list[CompanyAccountOut]:
    rows = (
        db.query(
            Company,
            func.count(User.id).label("users_count"),
            func.coalesce(func.sum(case((User.is_active.is_(True), 1), else_=0)), 0).label("active_users_count"),
        )
        .outerjoin(User, User.company_id == Company.id)
        .group_by(Company.id)
        .order_by(Company.code)
        .all()
    )

    result = []
    for company, users_count, active_users_count in rows:
        result.append(
            CompanyAccountOut(
                id=company.id,
                code=company.code,
                name_en=company.name_en,
                name_ar=company.name_ar,
                base_currency=company.base_currency,
                is_active=company.is_active,
                users_count=int(users_count or 0),
                active_users_count=int(active_users_count or 0),
            )
        )
    return result


def list_managed_users(db: Session) -> list[ManagedUserOut]:
    rows = (
        db.query(User, Company)
        .join(Company, Company.id == User.company_id)
        .order_by(Company.code, User.email)
        .all()
    )
    return [
        ManagedUserOut(
            id=user.id,
            company_id=user.company_id,
            company_code=company.code,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            roles=[role.code for role in user.roles],
        )
        for user, company in rows
    ]


def create_company_account(db: Session, payload: CompanyAccountCreate) -> CompanyAccountOut:
    ensure_default_roles(db)
    existing_company = db.query(Company).filter(Company.code == payload.company_code).first()
    if existing_company:
        raise SystemAdminError("Company code already exists")

    existing_user = db.query(User).filter(User.email == payload.admin_email).first()
    if existing_user:
        raise SystemAdminError("Admin email already exists")

    role = db.query(Role).filter(Role.code == "head_accountant").first()
    company = Company(
        code=payload.company_code,
        name_en=payload.company_name_en,
        name_ar=payload.company_name_ar,
        base_currency=payload.base_currency,
        is_active=True,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    user = User(
        company_id=company.id,
        full_name=payload.admin_full_name,
        email=payload.admin_email,
        hashed_password=hash_password(payload.admin_password),
        roles=[role] if role else [],
        is_active=True,
    )
    db.add(user)
    db.commit()
    seed_chart_of_accounts(db, company.id)

    return next(item for item in list_company_accounts(db) if item.id == company.id)


def set_company_active(db: Session, company_id: int, is_active: bool) -> None:
    company = db.get(Company, company_id)
    if not company:
        raise SystemAdminError("Company not found")
    company.is_active = is_active
    db.commit()


def set_user_active(db: Session, user_id: int, is_active: bool) -> None:
    user = db.get(User, user_id)
    if not user:
        raise SystemAdminError("User not found")

    settings = get_settings()
    if user.email == settings.system_admin_email and not is_active:
        raise SystemAdminError("The primary system admin account cannot be deactivated")

    user.is_active = is_active
    db.commit()


def delete_company_account(db: Session, company_id: int) -> None:
    settings = get_settings()
    company = db.get(Company, company_id)
    if not company:
        raise SystemAdminError("Company not found")
    if company.code == settings.default_company_code:
        raise SystemAdminError("The default system company cannot be deleted")

    invoice_ids = [row.id for row in db.query(Invoice.id).filter(Invoice.company_id == company_id)]
    journal_ids = [row.id for row in db.query(JournalEntry.id).filter(JournalEntry.company_id == company_id)]
    user_ids = [row.id for row in db.query(User.id).filter(User.company_id == company_id)]

    if invoice_ids:
        db.query(InvoiceLine).filter(InvoiceLine.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
    if journal_ids:
        db.query(JournalLine).filter(JournalLine.journal_entry_id.in_(journal_ids)).delete(synchronize_session=False)
    if user_ids:
        db.execute(user_roles.delete().where(user_roles.c.user_id.in_(user_ids)))

    for model in [
        StockMovement,
        Payment,
        Invoice,
        Notification,
        ActivityLog,
        Employee,
        Department,
        BusinessPartner,
        Item,
        Warehouse,
        JournalEntry,
        CostCenter,
        Account,
        User,
        FinancialYear,
        Branch,
    ]:
        db.query(model).filter(model.company_id == company_id).delete(synchronize_session=False)

    db.delete(company)
    db.commit()
