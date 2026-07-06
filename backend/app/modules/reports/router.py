from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.sales.models import Invoice, Payment


router = APIRouter()


def _money(value: Decimal | int | str | None) -> Decimal:
    return Decimal(str(value or "0")).quantize(Decimal("0.0001"))


def _apply_date_filter(query, column, date_from: date | None, date_to: date | None):
    if date_from:
        query = query.filter(column >= date_from)
    if date_to:
        query = query.filter(column <= date_to)
    return query


@router.get("/overview")
def reports_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    return {
        "available_reports": [
            {"code": "partner_statement", "name_en": "Customer / Supplier Statement", "name_ar": "كشف حساب عميل / مورد"},
            {"code": "profit_loss", "name_en": "Basic Profit & Loss", "name_ar": "الأرباح والخسائر المبسط"},
        ],
    }


@router.get("/partner-statement")
def partner_statement(
    partner_id: int = Query(),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    partner = (
        db.query(BusinessPartner)
        .filter(BusinessPartner.company_id == current_user.company_id, BusinessPartner.id == partner_id)
        .first()
    )
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")

    partner_type = (partner.partner_type or "").upper()
    lines: list[dict] = []

    invoice_query = db.query(Invoice).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.partner_id == partner.id,
        Invoice.status == "POSTED",
    )
    invoice_query = _apply_date_filter(invoice_query, Invoice.invoice_date, date_from, date_to)
    for invoice in invoice_query.order_by(Invoice.invoice_date, Invoice.id).all():
        if invoice.invoice_type == "SALES" and partner_type in {"CUSTOMER", "BOTH"}:
            debit, credit = _money(invoice.grand_total), Decimal("0.0000")
            description = "Sales invoice"
        elif invoice.invoice_type == "PURCHASE" and partner_type in {"VENDOR", "SUPPLIER", "BOTH"}:
            debit, credit = Decimal("0.0000"), _money(invoice.grand_total)
            description = "Purchase invoice"
        else:
            continue
        lines.append(
            {
                "date": invoice.invoice_date,
                "reference": invoice.invoice_number,
                "description": description,
                "debit": debit,
                "credit": credit,
            }
        )

    payment_query = db.query(Payment).filter(Payment.company_id == current_user.company_id, Payment.partner_id == partner.id)
    payment_query = _apply_date_filter(payment_query, Payment.payment_date, date_from, date_to)
    for payment in payment_query.order_by(Payment.payment_date, Payment.id).all():
        if payment.payment_type == "RECEIPT" and partner_type in {"CUSTOMER", "BOTH"}:
            debit, credit = Decimal("0.0000"), _money(payment.amount)
            description = "Receipt voucher"
        elif payment.payment_type == "PAYMENT" and partner_type in {"VENDOR", "SUPPLIER", "BOTH"}:
            debit, credit = _money(payment.amount), Decimal("0.0000")
            description = "Payment voucher"
        else:
            continue
        lines.append(
            {
                "date": payment.payment_date,
                "reference": payment.payment_number,
                "description": description,
                "debit": debit,
                "credit": credit,
            }
        )

    balance = Decimal("0.0000")
    sorted_lines = []
    for line in sorted(lines, key=lambda item: (item["date"], item["reference"])):
        balance = _money(balance + _money(line["debit"]) - _money(line["credit"]))
        sorted_lines.append({**line, "balance": balance})

    return {
        "partner": {
            "id": partner.id,
            "code": partner.code,
            "name_en": partner.name_en,
            "name_ar": partner.name_ar,
            "partner_type": partner.partner_type,
        },
        "date_from": date_from,
        "date_to": date_to,
        "opening_balance": Decimal("0.0000"),
        "closing_balance": balance,
        "lines": sorted_lines,
    }


@router.get("/profit-loss")
def profit_loss(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    sales_query = db.query(func.coalesce(func.sum(Invoice.subtotal), 0)).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.invoice_type == "SALES",
        Invoice.status == "POSTED",
    )
    sales_query = _apply_date_filter(sales_query, Invoice.invoice_date, date_from, date_to)
    purchase_query = db.query(func.coalesce(func.sum(Invoice.subtotal), 0)).filter(
        Invoice.company_id == current_user.company_id,
        Invoice.invoice_type == "PURCHASE",
        Invoice.status == "POSTED",
    )
    purchase_query = _apply_date_filter(purchase_query, Invoice.invoice_date, date_from, date_to)

    revenue = _money(sales_query.scalar())
    cost_of_sales = _money(purchase_query.scalar())
    gross_profit = _money(revenue - cost_of_sales)

    return {
        "date_from": date_from,
        "date_to": date_to,
        "revenue": revenue,
        "cost_of_sales": cost_of_sales,
        "gross_profit": gross_profit,
        "expenses": Decimal("0.0000"),
        "net_profit": gross_profit,
        "lines": [
            {"code": "revenue", "label_en": "Sales revenue", "label_ar": "إيرادات المبيعات", "amount": revenue},
            {"code": "cost_of_sales", "label_en": "Purchases / cost of sales", "label_ar": "المشتريات / تكلفة المبيعات", "amount": cost_of_sales},
            {"code": "gross_profit", "label_en": "Gross profit", "label_ar": "مجمل الربح", "amount": gross_profit},
            {"code": "expenses", "label_en": "Other expenses", "label_ar": "مصروفات أخرى", "amount": Decimal("0.0000")},
            {"code": "net_profit", "label_en": "Net profit", "label_ar": "صافي الربح", "amount": gross_profit},
        ],
    }
