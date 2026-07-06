from collections import defaultdict
from datetime import UTC, date, datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account
from backend.app.modules.accounting.schemas import JournalEntryCreate, JournalEntryReverse, JournalLineCreate
from backend.app.modules.accounting.service import AccountingError, create_journal_entry, reverse_journal_entry
from backend.app.modules.inventory.models import Item, StockMovement, Warehouse
from backend.app.modules.parties.models import BusinessPartner
from backend.app.modules.sales.models import Invoice, InvoiceLine
from backend.app.modules.sales.schemas import InvoiceCancel, InvoiceCreate, InvoiceLineCreate, InvoiceOut


class InvoiceError(ValueError):
    pass


MONEY_QUANT = Decimal("0.0001")
SALES_PARTNER_TYPES = {"CUSTOMER", "BOTH"}
PURCHASE_PARTNER_TYPES = {"VENDOR", "SUPPLIER", "BOTH"}


def _money(value: Decimal | int | str | None) -> Decimal:
    return Decimal(str(value or "0")).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _normalize(value: str | None) -> str:
    return (value or "").strip().upper()


def _invoice_prefix(invoice_type: str) -> str:
    return "SINV" if invoice_type == "SALES" else "PINV"


def _next_invoice_number(db: Session, company_id: int, invoice_type: str, invoice_date: date) -> str:
    prefix = _invoice_prefix(invoice_type)
    count = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type)
        .count()
    )
    return f"{prefix}-{invoice_date:%Y%m%d}-{count + 1:05d}"


def _get_account(db: Session, company_id: int, code: str) -> Account:
    account = db.query(Account).filter(Account.company_id == company_id, Account.code == code).first()
    if not account:
        raise InvoiceError(f"Required account {code} is missing from the chart of accounts")
    if account.is_group:
        raise InvoiceError(f"Required account {code} must be a posting account")
    return account


def _validate_partner(db: Session, company_id: int, partner_id: int, invoice_type: str) -> BusinessPartner:
    partner = (
        db.query(BusinessPartner)
        .filter(BusinessPartner.company_id == company_id, BusinessPartner.id == partner_id)
        .first()
    )
    if not partner or not partner.is_active:
        raise InvoiceError("Business partner was not found or is inactive")

    partner_type = _normalize(partner.partner_type)
    allowed = SALES_PARTNER_TYPES if invoice_type == "SALES" else PURCHASE_PARTNER_TYPES
    if partner_type not in allowed:
        raise InvoiceError("Business partner type is not valid for this invoice")
    return partner


def _validate_warehouse(db: Session, company_id: int, warehouse_id: int | None) -> Warehouse | None:
    if not warehouse_id:
        return None
    warehouse = (
        db.query(Warehouse)
        .filter(Warehouse.company_id == company_id, Warehouse.id == warehouse_id)
        .first()
    )
    if not warehouse or not warehouse.is_active:
        raise InvoiceError("Warehouse was not found or is inactive")
    return warehouse


def _validate_item(db: Session, company_id: int, item_id: int | None) -> Item | None:
    if not item_id:
        return None
    item = db.query(Item).filter(Item.company_id == company_id, Item.id == item_id).first()
    if not item or not item.is_active:
        raise InvoiceError("Item was not found or is inactive")
    return item


def _calculate_line(line: InvoiceLineCreate, tax_inclusive: bool) -> dict[str, Decimal]:
    quantity = _money(line.quantity)
    unit_price = _money(line.unit_price)
    gross = _money(quantity * unit_price)
    rate_discount = _money(gross * _money(line.discount_rate) / Decimal("100"))
    discount_amount = min(gross, _money(line.discount_amount) + rate_discount)
    taxable_amount = max(Decimal("0"), _money(gross - discount_amount))
    tax_rate = _money(line.tax_rate)

    if tax_inclusive and tax_rate > 0:
        divisor = Decimal("1") + (tax_rate / Decimal("100"))
        net_amount = _money(taxable_amount / divisor)
        tax_amount = _money(taxable_amount - net_amount)
        line_total = taxable_amount
    else:
        net_amount = taxable_amount
        tax_amount = _money(net_amount * tax_rate / Decimal("100"))
        line_total = _money(net_amount + tax_amount)

    return {
        "discount_amount": discount_amount,
        "tax_amount": tax_amount,
        "net_amount": net_amount,
        "line_total": line_total,
    }


def _invoice_to_out(db: Session, invoice: Invoice) -> InvoiceOut:
    partner = db.get(BusinessPartner, invoice.partner_id)
    return InvoiceOut(
        id=invoice.id,
        company_id=invoice.company_id,
        invoice_number=invoice.invoice_number,
        invoice_type=invoice.invoice_type,
        partner_id=invoice.partner_id,
        partner_code=partner.code if partner else None,
        partner_name_en=partner.name_en if partner else None,
        partner_name_ar=partner.name_ar if partner else None,
        warehouse_id=invoice.warehouse_id,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        status=invoice.status,
        currency=invoice.currency,
        tax_inclusive=invoice.tax_inclusive,
        subtotal=invoice.subtotal,
        tax_total=invoice.tax_total,
        discount_total=invoice.discount_total,
        grand_total=invoice.grand_total,
        journal_entry_id=invoice.journal_entry_id,
        notes=invoice.notes,
        lines=list(invoice.lines),
    )


def list_invoices(db: Session, company_id: int, invoice_type: str) -> list[InvoiceOut]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type)
        .order_by(Invoice.invoice_date.desc(), Invoice.id.desc())
        .limit(100)
        .all()
    )
    return [_invoice_to_out(db, row) for row in rows]


def get_invoice(db: Session, company_id: int, invoice_id: int, invoice_type: str) -> InvoiceOut:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type, Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise InvoiceError("Invoice not found")
    return _invoice_to_out(db, invoice)


def create_invoice(
    db: Session,
    company_id: int,
    invoice_type: str,
    payload: InvoiceCreate,
    created_by_id: int | None,
) -> InvoiceOut:
    invoice_type = _normalize(invoice_type)
    if invoice_type not in {"SALES", "PURCHASE"}:
        raise InvoiceError("Unsupported invoice type")

    _validate_partner(db, company_id, payload.partner_id, invoice_type)
    _validate_warehouse(db, company_id, payload.warehouse_id)

    invoice_number = (payload.invoice_number or _next_invoice_number(db, company_id, invoice_type, payload.invoice_date)).strip()
    duplicate = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_number == invoice_number)
        .first()
    )
    if duplicate:
        raise InvoiceError("Invoice number already exists")

    invoice = Invoice(
        company_id=company_id,
        invoice_number=invoice_number,
        invoice_type=invoice_type,
        partner_id=payload.partner_id,
        warehouse_id=payload.warehouse_id,
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        status="DRAFT",
        currency=_normalize(payload.currency) or "JOD",
        tax_inclusive=payload.tax_inclusive,
        notes=payload.notes,
    )

    totals = {"subtotal": Decimal("0"), "tax_total": Decimal("0"), "discount_total": Decimal("0"), "grand_total": Decimal("0")}
    for line in payload.lines:
        item = _validate_item(db, company_id, line.item_id)
        warehouse_id = line.warehouse_id or payload.warehouse_id
        if item:
            _validate_warehouse(db, company_id, warehouse_id)
        amounts = _calculate_line(line, payload.tax_inclusive)
        invoice_line = InvoiceLine(
            item_id=line.item_id,
            warehouse_id=warehouse_id,
            description=line.description.strip(),
            quantity=_money(line.quantity),
            unit_price=_money(line.unit_price),
            discount_rate=_money(line.discount_rate),
            discount_amount=amounts["discount_amount"],
            tax_rate=_money(line.tax_rate),
            tax_amount=amounts["tax_amount"],
            net_amount=amounts["net_amount"],
            line_total=amounts["line_total"],
        )
        invoice.lines.append(invoice_line)
        totals["subtotal"] += amounts["net_amount"]
        totals["tax_total"] += amounts["tax_amount"]
        totals["discount_total"] += amounts["discount_amount"]
        totals["grand_total"] += amounts["line_total"]

    invoice.subtotal = _money(totals["subtotal"])
    invoice.tax_total = _money(totals["tax_total"])
    invoice.discount_total = _money(totals["discount_total"])
    invoice.grand_total = _money(totals["grand_total"])

    if invoice.grand_total <= 0:
        raise InvoiceError("Invoice total must be greater than zero")

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    if payload.post:
        return post_invoice(db, company_id, invoice.id, invoice_type, created_by_id)
    return _invoice_to_out(db, invoice)


def _add_amount(bucket: dict[int, Decimal], account_id: int, amount: Decimal) -> None:
    amount = _money(amount)
    if amount:
        bucket[account_id] += amount


def _journal_payload_for_invoice(db: Session, invoice: Invoice) -> JournalEntryCreate:
    partner = db.get(BusinessPartner, invoice.partner_id)
    if not partner:
        raise InvoiceError("Invoice partner is missing")

    debit_by_account: dict[int, Decimal] = defaultdict(Decimal)
    credit_by_account: dict[int, Decimal] = defaultdict(Decimal)

    if invoice.invoice_type == "SALES":
        ar_account_id = partner.receivable_account_id or _get_account(db, invoice.company_id, "112").id
        revenue_account = _get_account(db, invoice.company_id, "41")
        vat_payable = _get_account(db, invoice.company_id, "213")
        _add_amount(debit_by_account, ar_account_id, invoice.grand_total)
        _add_amount(credit_by_account, revenue_account.id, invoice.subtotal)
        _add_amount(credit_by_account, vat_payable.id, invoice.tax_total)
    else:
        ap_account_id = partner.payable_account_id or _get_account(db, invoice.company_id, "211").id
        vat_receivable = _get_account(db, invoice.company_id, "114")
        fallback_expense = _get_account(db, invoice.company_id, "511")
        inventory_account = _get_account(db, invoice.company_id, "113")
        for line in invoice.lines:
            item = db.get(Item, line.item_id) if line.item_id else None
            account_id = item.inventory_account_id if item and item.inventory_account_id else inventory_account.id if item else fallback_expense.id
            _add_amount(debit_by_account, account_id, line.net_amount)
        _add_amount(debit_by_account, vat_receivable.id, invoice.tax_total)
        _add_amount(credit_by_account, ap_account_id, invoice.grand_total)

    journal_lines = [
        JournalLineCreate(account_id=account_id, debit=amount, credit=Decimal("0"), description=invoice.invoice_number)
        for account_id, amount in debit_by_account.items()
        if amount
    ]
    journal_lines.extend(
        JournalLineCreate(account_id=account_id, debit=Decimal("0"), credit=amount, description=invoice.invoice_number)
        for account_id, amount in credit_by_account.items()
        if amount
    )

    return JournalEntryCreate(
        entry_number=f"{invoice.invoice_type}-{invoice.invoice_number}",
        entry_date=invoice.invoice_date,
        description=f"{invoice.invoice_type.title()} invoice {invoice.invoice_number}",
        reference_doc=invoice.invoice_number,
        post=True,
        lines=journal_lines,
    )


def _create_stock_movements(db: Session, invoice: Invoice, reverse: bool = False) -> None:
    for line in invoice.lines:
        if not line.item_id:
            continue
        warehouse_id = line.warehouse_id or invoice.warehouse_id
        if not warehouse_id:
            raise InvoiceError("Warehouse is required for stocked invoice lines")

        quantity_in = Decimal("0")
        quantity_out = Decimal("0")
        if invoice.invoice_type == "PURCHASE":
            quantity_in = line.quantity
        else:
            quantity_out = line.quantity
        if reverse:
            quantity_in, quantity_out = quantity_out, quantity_in

        unit_cost = _money(line.net_amount / line.quantity) if invoice.invoice_type == "PURCHASE" and line.quantity else Decimal("0")
        db.add(
            StockMovement(
                company_id=invoice.company_id,
                item_id=line.item_id,
                warehouse_id=warehouse_id,
                movement_date=invoice.invoice_date,
                source_module=f"{invoice.invoice_type.lower()}_invoice",
                source_id=invoice.id,
                quantity_in=quantity_in,
                quantity_out=quantity_out,
                unit_cost=unit_cost,
                notes=invoice.invoice_number,
            )
        )


def _ensure_stock_ready(db: Session, invoice: Invoice) -> None:
    for line in invoice.lines:
        if not line.item_id:
            continue
        warehouse_id = line.warehouse_id or invoice.warehouse_id
        if not warehouse_id:
            raise InvoiceError("Warehouse is required for stocked invoice lines")
        _validate_warehouse(db, invoice.company_id, warehouse_id)


def post_invoice(
    db: Session,
    company_id: int,
    invoice_id: int,
    invoice_type: str,
    created_by_id: int | None,
) -> InvoiceOut:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type, Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise InvoiceError("Invoice not found")
    if invoice.status == "POSTED":
        return _invoice_to_out(db, invoice)
    if invoice.status != "DRAFT":
        raise InvoiceError("Only draft invoices can be posted")

    _ensure_stock_ready(db, invoice)
    try:
        journal = create_journal_entry(db, company_id, _journal_payload_for_invoice(db, invoice), created_by_id)
    except AccountingError as exc:
        db.rollback()
        raise InvoiceError(str(exc)) from exc
    journal.source_module = invoice.invoice_type.lower()
    _create_stock_movements(db, invoice)
    invoice.journal_entry_id = journal.id
    invoice.status = "POSTED"
    invoice.posted_at = datetime.now(UTC)
    db.commit()
    db.refresh(invoice)
    return _invoice_to_out(db, invoice)


def cancel_invoice(
    db: Session,
    company_id: int,
    invoice_id: int,
    invoice_type: str,
    payload: InvoiceCancel,
    created_by_id: int | None,
) -> InvoiceOut:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.company_id == company_id, Invoice.invoice_type == invoice_type, Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise InvoiceError("Invoice not found")
    if invoice.status == "CANCELED":
        return _invoice_to_out(db, invoice)
    if invoice.status == "DRAFT":
        invoice.status = "CANCELED"
        invoice.canceled_at = datetime.now(UTC)
        db.commit()
        db.refresh(invoice)
        return _invoice_to_out(db, invoice)
    if invoice.status != "POSTED":
        raise InvoiceError("Invoice cannot be canceled from its current status")

    if invoice.journal_entry_id:
        try:
            reverse_journal_entry(
                db,
                company_id,
                invoice.journal_entry_id,
                JournalEntryReverse(
                    entry_number=f"REV-{invoice.invoice_type}-{invoice.invoice_number}",
                    entry_date=payload.reversal_date or date.today(),
                    description=payload.reason or f"Cancel invoice {invoice.invoice_number}",
                ),
                created_by_id,
            )
        except AccountingError as exc:
            raise InvoiceError(str(exc)) from exc

    _create_stock_movements(db, invoice, reverse=True)
    invoice.status = "CANCELED"
    invoice.canceled_at = datetime.now(UTC)
    db.commit()
    db.refresh(invoice)
    return _invoice_to_out(db, invoice)
