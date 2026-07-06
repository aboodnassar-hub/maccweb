from decimal import Decimal

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.parties.schemas import BusinessPartnerCreate, BusinessPartnerOut, BusinessPartnerUpdate
from backend.app.modules.sales.models import Invoice, Payment


class PartnerError(ValueError):
    pass


PARTNER_TYPES = {"CUSTOMER", "VENDOR", "SUPPLIER", "BOTH"}


def _normalize(value: str | None) -> str:
    return (value or "").strip().upper()


def _default_account(db: Session, company_id: int, code: str) -> Account | None:
    return db.query(Account).filter(Account.company_id == company_id, Account.code == code).first()


def _validate_posting_account(db: Session, company_id: int, account_id: int | None, label: str) -> int | None:
    if not account_id:
        return None
    account = db.query(Account).filter(Account.company_id == company_id, Account.id == account_id).first()
    if not account or not account.is_active:
        raise PartnerError(f"{label} account was not found or is inactive")
    if account.is_group:
        raise PartnerError(f"{label} account must be a posting account")
    return account.id


def _prepare_type(value: str | None) -> str:
    partner_type = _normalize(value) or "CUSTOMER"
    if partner_type not in PARTNER_TYPES:
        raise PartnerError("Partner type must be CUSTOMER, VENDOR, SUPPLIER, or BOTH")
    return "VENDOR" if partner_type == "SUPPLIER" else partner_type


def _invoice_stats(db: Session, company_id: int) -> dict[int, dict]:
    rows = (
        db.query(
            Invoice.partner_id,
            func.count(Invoice.id).label("invoice_count"),
            func.coalesce(func.sum(case((Invoice.invoice_type == "SALES", Invoice.grand_total), else_=0)), 0).label("sales_total"),
            func.coalesce(func.sum(case((Invoice.invoice_type == "PURCHASE", Invoice.grand_total), else_=0)), 0).label("purchase_total"),
        )
        .filter(Invoice.company_id == company_id, Invoice.status != "CANCELED")
        .group_by(Invoice.partner_id)
        .all()
    )
    return {
        row.partner_id: {
            "invoice_count": int(row.invoice_count or 0),
            "sales_total": row.sales_total or Decimal("0"),
            "purchase_total": row.purchase_total or Decimal("0"),
        }
        for row in rows
    }


def _to_out(partner: BusinessPartner, stats: dict | None = None) -> BusinessPartnerOut:
    stats = stats or {}
    return BusinessPartnerOut(
        id=partner.id,
        company_id=partner.company_id,
        code=partner.code,
        type=partner.partner_type,
        partner_type=partner.partner_type,
        name_en=partner.name_en,
        name_ar=partner.name_ar,
        tax_number=partner.tax_number,
        phone=partner.phone,
        email=partner.email,
        address=partner.address,
        receivable_account_id=partner.receivable_account_id,
        payable_account_id=partner.payable_account_id,
        is_active=partner.is_active,
        invoice_count=stats.get("invoice_count", 0),
        sales_total=stats.get("sales_total", Decimal("0")),
        purchase_total=stats.get("purchase_total", Decimal("0")),
    )


def list_partners(
    db: Session,
    company_id: int,
    partner_type: str | None = None,
    is_active: bool | None = None,
    search: str | None = None,
) -> list[BusinessPartnerOut]:
    query = db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id)
    normalized_type = _normalize(partner_type)
    if normalized_type:
        normalized_type = "VENDOR" if normalized_type == "SUPPLIER" else normalized_type
        query = query.filter(BusinessPartner.partner_type == normalized_type)
    if is_active is not None:
        query = query.filter(BusinessPartner.is_active.is_(is_active))
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            (BusinessPartner.code.ilike(like))
            | (BusinessPartner.name_en.ilike(like))
            | (BusinessPartner.name_ar.ilike(like))
            | (BusinessPartner.email.ilike(like))
            | (BusinessPartner.phone.ilike(like))
        )

    stats_by_partner = _invoice_stats(db, company_id)
    return [
        _to_out(row, stats_by_partner.get(row.id))
        for row in query.order_by(BusinessPartner.code).limit(200).all()
    ]


def get_partner(db: Session, company_id: int, partner_id: int) -> BusinessPartnerOut:
    partner = db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id, BusinessPartner.id == partner_id).first()
    if not partner:
        raise PartnerError("Partner not found")
    return _to_out(partner, _invoice_stats(db, company_id).get(partner.id))


def create_partner(db: Session, company_id: int, payload: BusinessPartnerCreate) -> BusinessPartnerOut:
    code = payload.code.strip().upper()
    if db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id, BusinessPartner.code == code).first():
        raise PartnerError("Partner code already exists")

    partner_type = _prepare_type(payload.partner_type)
    receivable_id = _validate_posting_account(db, company_id, payload.receivable_account_id, "Receivable")
    payable_id = _validate_posting_account(db, company_id, payload.payable_account_id, "Payable")
    if partner_type in {"CUSTOMER", "BOTH"} and not receivable_id:
        receivable_account = _default_account(db, company_id, "112")
        receivable_id = receivable_account.id if receivable_account else None
    if partner_type in {"VENDOR", "BOTH"} and not payable_id:
        payable_account = _default_account(db, company_id, "211")
        payable_id = payable_account.id if payable_account else None

    partner = BusinessPartner(
        company_id=company_id,
        code=code,
        partner_type=partner_type,
        name_en=payload.name_en.strip(),
        name_ar=payload.name_ar.strip(),
        tax_number=(payload.tax_number or "").strip() or None,
        phone=(payload.phone or "").strip() or None,
        email=(payload.email or "").strip().lower() or None,
        address=(payload.address or "").strip() or None,
        receivable_account_id=receivable_id,
        payable_account_id=payable_id,
        is_active=True,
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return _to_out(partner)


def update_partner(db: Session, company_id: int, partner_id: int, payload: BusinessPartnerUpdate) -> BusinessPartnerOut:
    partner = db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id, BusinessPartner.id == partner_id).first()
    if not partner:
        raise PartnerError("Partner not found")

    data = payload.model_dump(exclude_unset=True)
    if "partner_type" in data:
        partner.partner_type = _prepare_type(data["partner_type"])
    for field in ["name_en", "name_ar", "tax_number", "phone", "email", "address"]:
        if field in data:
            value = data[field]
            if field in {"name_en", "name_ar"}:
                if not value or not value.strip():
                    raise PartnerError("Partner names cannot be empty")
                setattr(partner, field, value.strip())
            else:
                setattr(partner, field, value.strip().lower() if field == "email" and value else value.strip() if isinstance(value, str) and value.strip() else None)
    if "receivable_account_id" in data:
        partner.receivable_account_id = _validate_posting_account(db, company_id, data["receivable_account_id"], "Receivable")
    if "payable_account_id" in data:
        partner.payable_account_id = _validate_posting_account(db, company_id, data["payable_account_id"], "Payable")

    if partner.partner_type in {"CUSTOMER", "BOTH"} and not partner.receivable_account_id:
        account = _default_account(db, company_id, "112")
        partner.receivable_account_id = account.id if account else None
    if partner.partner_type in {"VENDOR", "BOTH"} and not partner.payable_account_id:
        account = _default_account(db, company_id, "211")
        partner.payable_account_id = account.id if account else None

    db.commit()
    db.refresh(partner)
    return _to_out(partner, _invoice_stats(db, company_id).get(partner.id))


def set_partner_active(db: Session, company_id: int, partner_id: int, is_active: bool) -> BusinessPartnerOut:
    partner = db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id, BusinessPartner.id == partner_id).first()
    if not partner:
        raise PartnerError("Partner not found")
    partner.is_active = is_active
    db.commit()
    db.refresh(partner)
    return _to_out(partner, _invoice_stats(db, company_id).get(partner.id))


def delete_partner(db: Session, company_id: int, partner_id: int) -> None:
    partner = db.query(BusinessPartner).filter(BusinessPartner.company_id == company_id, BusinessPartner.id == partner_id).first()
    if not partner:
        raise PartnerError("Partner not found")
    invoice_count = db.query(Invoice).filter(Invoice.company_id == company_id, Invoice.partner_id == partner_id).count()
    payment_count = db.query(Payment).filter(Payment.company_id == company_id, Payment.partner_id == partner_id).count()
    if invoice_count or payment_count:
        raise PartnerError("Partners with invoices or payments cannot be deleted; deactivate them instead")
    db.delete(partner)
    db.commit()
