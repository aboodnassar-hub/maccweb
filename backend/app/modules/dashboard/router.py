from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.inventory.models import Item
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.sales.models import Invoice, Payment


router = APIRouter()


def _count(db: Session, model, company_id: int) -> int:
    return int(db.query(func.count(model.id)).filter(model.company_id == company_id).scalar() or 0)


def _money(value: Decimal | int | float | None) -> str:
    return str(value or Decimal("0"))


def _partner_count(db: Session, company_id: int, partner_types: set[str]) -> int:
    return int(
        db.query(func.count(BusinessPartner.id))
        .filter(BusinessPartner.company_id == company_id, BusinessPartner.partner_type.in_(partner_types))
        .scalar()
        or 0
    )


def _invoice_total(db: Session, company_id: int, invoice_type: str, column) -> Decimal:
    return (
        db.query(func.coalesce(func.sum(column), 0))
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type, Invoice.status == "POSTED")
        .scalar()
        or Decimal("0")
    )


def _payment_total(db: Session, company_id: int, payment_type: str) -> Decimal:
    return (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.company_id == company_id, Payment.payment_type == payment_type)
        .scalar()
        or Decimal("0")
    )


def _payment_count(db: Session, company_id: int, payment_type: str) -> int:
    return int(
        db.query(func.count(Payment.id))
        .filter(Payment.company_id == company_id, Payment.payment_type == payment_type)
        .scalar()
        or 0
    )


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    company_id = current_user.company_id

    sales_total = _invoice_total(db, company_id, "SALES", Invoice.grand_total)
    purchase_total = _invoice_total(db, company_id, "PURCHASE", Invoice.grand_total)
    receipts_total = _payment_total(db, company_id, "RECEIPT")
    payments_total = _payment_total(db, company_id, "PAYMENT")
    revenue = _invoice_total(db, company_id, "SALES", Invoice.subtotal)
    cost_of_sales = _invoice_total(db, company_id, "PURCHASE", Invoice.subtotal)
    net_profit = Decimal(revenue or 0) - Decimal(cost_of_sales or 0)

    recent_invoices = [
        {
            "id": f"invoice-{row.id}",
            "date": row.invoice_date.isoformat(),
            "description": "Sales invoice" if row.invoice_type == "SALES" else "Purchase invoice",
            "reference": row.invoice_number,
            "status": row.status,
        }
        for row in db.query(Invoice)
        .filter(Invoice.company_id == company_id)
        .order_by(Invoice.invoice_date.desc(), Invoice.id.desc())
        .limit(6)
        .all()
    ]
    recent_vouchers = [
        {
            "id": f"payment-{row.id}",
            "date": row.payment_date.isoformat(),
            "description": "Receipt voucher" if row.payment_type == "RECEIPT" else "Payment voucher",
            "reference": row.payment_number,
            "status": "POSTED",
        }
        for row in db.query(Payment)
        .filter(Payment.company_id == company_id)
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .limit(6)
        .all()
    ]

    return {
        "kpis": [
            {"code": "sales", "label_en": "Sales invoices", "label_ar": "فواتير المبيعات", "value": _money(sales_total), "tone": "blue"},
            {"code": "purchases", "label_en": "Purchase invoices", "label_ar": "فواتير المشتريات", "value": _money(purchase_total), "tone": "amber"},
            {"code": "receipts", "label_en": "Receipts", "label_ar": "سندات القبض", "value": _money(receipts_total), "tone": "emerald"},
            {"code": "payments", "label_en": "Payments", "label_ar": "سندات الصرف", "value": _money(payments_total), "tone": "rose"},
        ],
        "module_counts": [
            {"code": "customers", "label_en": "Customers", "label_ar": "العملاء", "count": _partner_count(db, company_id, {"CUSTOMER", "BOTH"})},
            {"code": "suppliers", "label_en": "Suppliers", "label_ar": "الموردون", "count": _partner_count(db, company_id, {"VENDOR", "SUPPLIER", "BOTH"})},
            {"code": "products", "label_en": "Products / services", "label_ar": "المنتجات / الخدمات", "count": _count(db, Item, company_id)},
            {"code": "sales", "label_en": "Sales invoices", "label_ar": "فواتير المبيعات", "count": int(db.query(func.count(Invoice.id)).filter(Invoice.company_id == company_id, Invoice.invoice_type == "SALES").scalar() or 0)},
            {"code": "purchases", "label_en": "Purchase invoices", "label_ar": "فواتير المشتريات", "count": int(db.query(func.count(Invoice.id)).filter(Invoice.company_id == company_id, Invoice.invoice_type == "PURCHASE").scalar() or 0)},
            {"code": "receipts", "label_en": "Receipt vouchers", "label_ar": "سندات القبض", "count": _payment_count(db, company_id, "RECEIPT")},
            {"code": "payments", "label_en": "Payment vouchers", "label_ar": "سندات الصرف", "count": _payment_count(db, company_id, "PAYMENT")},
        ],
        "recent_activity": sorted(recent_invoices + recent_vouchers, key=lambda row: (row["date"], row["reference"]), reverse=True)[:8],
        "financial_totals": {
            "revenue": _money(revenue),
            "cost_of_sales": _money(cost_of_sales),
            "net_profit": _money(net_profit),
        },
    }
