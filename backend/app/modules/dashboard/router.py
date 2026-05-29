from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.accounting.models import Account, JournalEntry, JournalLine
from backend.app.modules.auth.models import User
from backend.app.modules.hr.models import Employee
from backend.app.modules.inventory.models import Item, StockMovement, Warehouse
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.sales.models import Invoice, Payment


router = APIRouter()


def _count(db: Session, model, company_id: int) -> int:
    return int(db.query(func.count(model.id)).filter(model.company_id == company_id).scalar() or 0)


def _money(value: Decimal | int | float | None) -> str:
    return str(value or Decimal("0"))


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    company_id = current_user.company_id

    journal_totals = (
        db.query(
            func.coalesce(func.sum(JournalLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit), 0).label("credit"),
        )
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "POSTED")
        .one()
    )

    invoices_total = (
        db.query(func.coalesce(func.sum(Invoice.grand_total), 0))
        .filter(Invoice.company_id == company_id)
        .scalar()
    )
    payments_total = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.company_id == company_id)
        .scalar()
    )

    recent_journals = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == company_id)
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())
        .limit(8)
        .all()
    )

    return {
        "kpis": [
            {"code": "accounts", "label_en": "Accounts", "label_ar": "الحسابات", "value": _count(db, Account, company_id), "tone": "blue"},
            {"code": "journal_entries", "label_en": "Journal entries", "label_ar": "قيود اليومية", "value": _count(db, JournalEntry, company_id), "tone": "emerald"},
            {"code": "invoices", "label_en": "Invoices", "label_ar": "الفواتير", "value": _money(invoices_total), "tone": "amber"},
            {"code": "payments", "label_en": "Payments", "label_ar": "المدفوعات", "value": _money(payments_total), "tone": "rose"},
        ],
        "module_counts": [
            {"code": "accounting", "label_en": "Accounting", "label_ar": "المحاسبة", "count": _count(db, Account, company_id)},
            {"code": "partners", "label_en": "Customers & vendors", "label_ar": "العملاء والموردون", "count": _count(db, BusinessPartner, company_id)},
            {"code": "inventory", "label_en": "Inventory", "label_ar": "المخزون", "count": _count(db, Item, company_id) + _count(db, Warehouse, company_id)},
            {"code": "sales", "label_en": "Sales", "label_ar": "المبيعات", "count": _count(db, Invoice, company_id)},
            {"code": "hr", "label_en": "HR", "label_ar": "الموارد البشرية", "count": _count(db, Employee, company_id)},
            {"code": "stock_movements", "label_en": "Stock movements", "label_ar": "حركات المخزون", "count": _count(db, StockMovement, company_id)},
        ],
        "recent_activity": [
            {
                "id": row.id,
                "date": row.entry_date.isoformat(),
                "description": row.description or row.source_module,
                "reference": row.entry_number,
                "status": row.status,
            }
            for row in recent_journals
        ],
        "financial_totals": {
            "debit": _money(journal_totals.debit),
            "credit": _money(journal_totals.credit),
            "difference": _money(Decimal(journal_totals.debit or 0) - Decimal(journal_totals.credit or 0)),
        },
    }
