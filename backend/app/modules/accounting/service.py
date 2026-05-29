from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account, JournalEntry, JournalLine
from backend.app.modules.accounting.schemas import (
    AccountCreate,
    AccountingPeriodUpdate,
    AccountingSummary,
    FiscalYearCreate,
    JournalEntryCreate,
    JournalEntryReverse,
    TrialBalanceLine,
)
from backend.app.modules.companies.models import AccountingPeriod, FinancialYear


class AccountingError(ValueError):
    pass


ACCOUNT_NORMAL_BALANCE = {
    "ASSET": "DEBIT",
    "EXPENSE": "DEBIT",
    "LIABILITY": "CREDIT",
    "EQUITY": "CREDIT",
    "REVENUE": "CREDIT",
}
PERIOD_STATUSES = {"OPEN", "CLOSED", "LOCKED"}


def _decimal(value: Decimal | int | float | str | None) -> Decimal:
    return Decimal(str(value or "0"))


def _normalize_code(value: str) -> str:
    return value.strip().upper()


def _validate_status(status_value: str) -> str:
    status_value = _normalize_code(status_value)
    if status_value not in PERIOD_STATUSES:
        raise AccountingError("Status must be OPEN, CLOSED, or LOCKED")
    return status_value


def _account_children_count(db: Session, account_id: int) -> int:
    return int(db.query(func.count(Account.id)).filter(Account.parent_id == account_id).scalar() or 0)


def _account_transaction_count(db: Session, account_id: int) -> int:
    return int(db.query(func.count(JournalLine.id)).filter(JournalLine.account_id == account_id).scalar() or 0)


def list_accounts(db: Session, company_id: int) -> list[dict]:
    accounts = (
        db.query(Account)
        .filter(Account.company_id == company_id)
        .order_by(Account.code)
        .all()
    )
    child_counts = dict(
        db.query(Account.parent_id, func.count(Account.id))
        .filter(Account.company_id == company_id, Account.parent_id.isnot(None))
        .group_by(Account.parent_id)
        .all()
    )
    transaction_counts = dict(
        db.query(JournalLine.account_id, func.count(JournalLine.id))
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(JournalEntry.company_id == company_id)
        .group_by(JournalLine.account_id)
        .all()
    )

    return [
        {
            "id": account.id,
            "company_id": account.company_id,
            "code": account.code,
            "name_en": account.name_en,
            "name_ar": account.name_ar,
            "parent_id": account.parent_id,
            "account_type": account.account_type,
            "normal_balance": account.normal_balance,
            "is_group": account.is_group,
            "is_active": account.is_active,
            "children_count": int(child_counts.get(account.id, 0)),
            "transaction_count": int(transaction_counts.get(account.id, 0)),
        }
        for account in accounts
    ]


def create_account(db: Session, company_id: int, payload: AccountCreate) -> Account:
    account_type = _normalize_code(payload.account_type)
    expected_balance = ACCOUNT_NORMAL_BALANCE.get(account_type)
    if not expected_balance:
        raise AccountingError("Unsupported account type")

    normal_balance = _normalize_code(payload.normal_balance)
    if normal_balance != expected_balance:
        raise AccountingError(f"{account_type} accounts must have a {expected_balance} normal balance")

    code = payload.code.strip()
    existing = db.query(Account).filter(Account.company_id == company_id, Account.code == code).first()
    if existing:
        raise AccountingError("Account code already exists")

    parent = None
    if payload.parent_id:
        parent = db.query(Account).filter(Account.company_id == company_id, Account.id == payload.parent_id).first()
        if not parent:
            raise AccountingError("Parent account was not found")
        if not parent.is_group:
            raise AccountingError("Parent account must be a group account")
        if parent.account_type != account_type:
            raise AccountingError("Child account type must match its parent")

    account = Account(
        company_id=company_id,
        code=code,
        name_en=payload.name_en.strip(),
        name_ar=payload.name_ar.strip(),
        parent=parent,
        account_type=account_type,
        normal_balance=normal_balance,
        is_group=payload.is_group,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def delete_account(db: Session, company_id: int, account_id: int) -> None:
    account = db.query(Account).filter(Account.company_id == company_id, Account.id == account_id).first()
    if not account:
        raise AccountingError("Account not found")
    if _account_children_count(db, account.id):
        raise AccountingError("Accounts with child accounts cannot be deleted")
    if _account_transaction_count(db, account.id):
        raise AccountingError("Accounts with financial transactions cannot be deleted")

    db.delete(account)
    db.commit()


def _validate_lines(lines) -> None:
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for line in lines:
        debit = _decimal(line.debit)
        credit = _decimal(line.credit)
        if debit < 0 or credit < 0:
            raise AccountingError("Debit and credit amounts cannot be negative")
        if debit > 0 and credit > 0:
            raise AccountingError("A journal line cannot contain both debit and credit")
        if debit == 0 and credit == 0:
            raise AccountingError("Every journal line must contain an amount")
        total_debit += debit
        total_credit += credit

    if total_debit != total_credit:
        raise AccountingError("Journal entry is not balanced")


def _ensure_leaf_posting_accounts(db: Session, company_id: int, account_ids: set[int]) -> None:
    accounts = (
        db.query(Account)
        .filter(Account.company_id == company_id, Account.id.in_(account_ids))
        .all()
    )
    accounts_by_id = {account.id: account for account in accounts}
    if len(accounts_by_id) != len(account_ids):
        raise AccountingError("One or more accounts do not exist for this company")

    for account in accounts:
        if not account.is_active:
            raise AccountingError("Journal entries cannot use inactive accounts")
        if account.is_group or _account_children_count(db, account.id):
            raise AccountingError("Journal entries can only be posted to leaf accounts")


def _period_for_date(db: Session, company_id: int, transaction_date: date) -> AccountingPeriod | None:
    return (
        db.query(AccountingPeriod)
        .filter(
            AccountingPeriod.company_id == company_id,
            AccountingPeriod.starts_on <= transaction_date,
            AccountingPeriod.ends_on >= transaction_date,
        )
        .order_by(AccountingPeriod.starts_on.desc())
        .first()
    )


def ensure_open_period(db: Session, company_id: int, transaction_date: date) -> AccountingPeriod:
    period = _period_for_date(db, company_id, transaction_date)
    if not period:
        raise AccountingError("No accounting period covers the transaction date")

    financial_year = db.get(FinancialYear, period.financial_year_id)
    if not financial_year or financial_year.status != "OPEN":
        raise AccountingError("The financial year is closed or locked")
    if period.status != "OPEN":
        raise AccountingError("The accounting period is closed or locked")
    return period


def create_journal_entry(
    db: Session,
    company_id: int,
    payload: JournalEntryCreate,
    created_by_id: int | None,
) -> JournalEntry:
    existing = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == company_id, JournalEntry.entry_number == payload.entry_number)
        .first()
    )
    if existing:
        raise AccountingError("Journal entry number already exists")

    ensure_open_period(db, company_id, payload.entry_date)
    _validate_lines(payload.lines)
    _ensure_leaf_posting_accounts(db, company_id, {line.account_id for line in payload.lines})

    entry = JournalEntry(
        company_id=company_id,
        entry_number=payload.entry_number.strip(),
        entry_date=payload.entry_date,
        description=payload.description,
        reference_doc=payload.reference_doc,
        status="POSTED" if payload.post else "DRAFT",
        created_by_id=created_by_id,
    )
    entry.lines = [
        JournalLine(
            account_id=line.account_id,
            cost_center_id=line.cost_center_id,
            description=line.description,
            debit=line.debit,
            credit=line.credit,
        )
        for line in payload.lines
    ]
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def post_journal_entry(db: Session, company_id: int, entry_id: int) -> JournalEntry:
    entry = db.query(JournalEntry).filter(JournalEntry.company_id == company_id, JournalEntry.id == entry_id).first()
    if not entry:
        raise AccountingError("Journal entry not found")
    if entry.status == "POSTED":
        return entry
    if entry.status != "DRAFT":
        raise AccountingError("Only draft journal entries can be posted")

    ensure_open_period(db, company_id, entry.entry_date)
    _validate_lines(entry.lines)
    _ensure_leaf_posting_accounts(db, company_id, {line.account_id for line in entry.lines})
    entry.status = "POSTED"
    db.commit()
    db.refresh(entry)
    return entry


def reverse_journal_entry(
    db: Session,
    company_id: int,
    entry_id: int,
    payload: JournalEntryReverse,
    created_by_id: int | None,
) -> JournalEntry:
    original = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == company_id, JournalEntry.id == entry_id)
        .first()
    )
    if not original:
        raise AccountingError("Journal entry not found")
    if original.status != "POSTED":
        raise AccountingError("Only posted journal entries can be reversed")

    existing_reversal = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == company_id, JournalEntry.reversal_of_id == original.id)
        .first()
    )
    if existing_reversal:
        raise AccountingError("This journal entry already has a reversal")

    ensure_open_period(db, company_id, payload.entry_date)
    entry_number = payload.entry_number or f"REV-{original.id}-{payload.entry_date:%Y%m%d}"
    duplicate = (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == company_id, JournalEntry.entry_number == entry_number)
        .first()
    )
    if duplicate:
        raise AccountingError("Reversal entry number already exists")

    reversal = JournalEntry(
        company_id=company_id,
        entry_number=entry_number,
        entry_date=payload.entry_date,
        description=payload.description or f"Reversal of {original.entry_number}",
        reference_doc=original.entry_number,
        source_module="manual_reversal",
        status="POSTED",
        reversal_of_id=original.id,
        created_by_id=created_by_id,
    )
    reversal.lines = [
        JournalLine(
            account_id=line.account_id,
            cost_center_id=line.cost_center_id,
            description=line.description,
            debit=line.credit,
            credit=line.debit,
        )
        for line in original.lines
    ]
    db.add(reversal)
    db.commit()
    db.refresh(reversal)
    return reversal


def _date_filter_range(
    db: Session,
    company_id: int,
    from_date: date | None,
    to_date: date | None,
    fiscal_year_id: int | None,
    period_id: int | None,
) -> tuple[date | None, date | None]:
    if period_id:
        period = (
            db.query(AccountingPeriod)
            .filter(AccountingPeriod.company_id == company_id, AccountingPeriod.id == period_id)
            .first()
        )
        if not period:
            raise AccountingError("Accounting period not found")
        return period.starts_on, period.ends_on

    if fiscal_year_id:
        financial_year = (
            db.query(FinancialYear)
            .filter(FinancialYear.company_id == company_id, FinancialYear.id == fiscal_year_id)
            .first()
        )
        if not financial_year:
            raise AccountingError("Financial year not found")
        from_date = from_date or financial_year.starts_on
        to_date = to_date or financial_year.ends_on

    return from_date, to_date


def trial_balance(
    db: Session,
    company_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
    fiscal_year_id: int | None = None,
    period_id: int | None = None,
) -> list[TrialBalanceLine]:
    from_date, to_date = _date_filter_range(db, company_id, from_date, to_date, fiscal_year_id, period_id)

    movements = (
        db.query(
            JournalLine.account_id.label("account_id"),
            func.coalesce(func.sum(JournalLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit), 0).label("credit"),
        )
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "POSTED")
    )
    if from_date:
        movements = movements.filter(JournalEntry.entry_date >= from_date)
    if to_date:
        movements = movements.filter(JournalEntry.entry_date <= to_date)

    movements_subquery = movements.group_by(JournalLine.account_id).subquery()
    rows = (
        db.query(
            Account.id,
            Account.code,
            Account.name_en,
            Account.name_ar,
            func.coalesce(movements_subquery.c.debit, 0).label("debit"),
            func.coalesce(movements_subquery.c.credit, 0).label("credit"),
        )
        .outerjoin(movements_subquery, movements_subquery.c.account_id == Account.id)
        .filter(Account.company_id == company_id, Account.is_active.is_(True), Account.is_group.is_(False))
        .order_by(Account.code)
        .all()
    )

    return [
        TrialBalanceLine(
            account_id=row.id,
            account_code=row.code,
            name_en=row.name_en,
            name_ar=row.name_ar,
            debit=row.debit,
            credit=row.credit,
            balance=row.debit - row.credit,
        )
        for row in rows
    ]


def list_fiscal_years(db: Session, company_id: int) -> list[FinancialYear]:
    return (
        db.query(FinancialYear)
        .filter(FinancialYear.company_id == company_id)
        .order_by(FinancialYear.starts_on.desc())
        .all()
    )


def _generate_monthly_periods(financial_year: FinancialYear) -> list[AccountingPeriod]:
    periods = []
    current = financial_year.starts_on
    while current <= financial_year.ends_on:
        month_end = date(current.year, current.month, monthrange(current.year, current.month)[1])
        ends_on = min(month_end, financial_year.ends_on)
        code = current.strftime("%Y-%m")
        periods.append(
            AccountingPeriod(
                company_id=financial_year.company_id,
                code=code,
                name_en=current.strftime("%B %Y"),
                name_ar=code,
                starts_on=current,
                ends_on=ends_on,
                status=financial_year.status,
            )
        )
        current = ends_on + timedelta(days=1)
    return periods


def create_fiscal_year(db: Session, company_id: int, payload: FiscalYearCreate) -> FinancialYear:
    status_value = _validate_status(payload.status)
    if payload.ends_on < payload.starts_on:
        raise AccountingError("Fiscal year end date must be after the start date")

    duplicate = (
        db.query(FinancialYear)
        .filter(FinancialYear.company_id == company_id, FinancialYear.code == payload.code.strip())
        .first()
    )
    if duplicate:
        raise AccountingError("Fiscal year code already exists")

    overlap = (
        db.query(FinancialYear)
        .filter(
            FinancialYear.company_id == company_id,
            FinancialYear.starts_on <= payload.ends_on,
            FinancialYear.ends_on >= payload.starts_on,
        )
        .first()
    )
    if overlap:
        raise AccountingError("Fiscal year dates overlap an existing fiscal year")

    financial_year = FinancialYear(
        company_id=company_id,
        code=payload.code.strip(),
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        status=status_value,
    )
    db.add(financial_year)
    db.flush()

    if payload.generate_periods:
        for period in _generate_monthly_periods(financial_year):
            period.financial_year = financial_year
            db.add(period)

    db.commit()
    db.refresh(financial_year)
    return financial_year


def list_periods(db: Session, company_id: int, fiscal_year_id: int | None = None) -> list[AccountingPeriod]:
    query = db.query(AccountingPeriod).filter(AccountingPeriod.company_id == company_id)
    if fiscal_year_id:
        query = query.filter(AccountingPeriod.financial_year_id == fiscal_year_id)
    return query.order_by(AccountingPeriod.starts_on).all()


def update_period_status(
    db: Session,
    company_id: int,
    period_id: int,
    payload: AccountingPeriodUpdate,
) -> AccountingPeriod:
    period = (
        db.query(AccountingPeriod)
        .filter(AccountingPeriod.company_id == company_id, AccountingPeriod.id == period_id)
        .first()
    )
    if not period:
        raise AccountingError("Accounting period not found")

    period.status = _validate_status(payload.status)
    db.commit()
    db.refresh(period)
    return period


def accounting_summary(db: Session, company_id: int) -> AccountingSummary:
    today = date.today()
    financial_year = (
        db.query(FinancialYear)
        .filter(FinancialYear.company_id == company_id, FinancialYear.starts_on <= today, FinancialYear.ends_on >= today)
        .order_by(FinancialYear.starts_on.desc())
        .first()
    )
    current_period = _period_for_date(db, company_id, today)

    posted_totals = (
        db.query(
            func.coalesce(func.sum(JournalLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit), 0).label("credit"),
        )
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "POSTED")
        .one()
    )
    opening_totals_query = (
        db.query(
            func.coalesce(func.sum(JournalLine.debit), 0).label("debit"),
            func.coalesce(func.sum(JournalLine.credit), 0).label("credit"),
        )
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "POSTED")
    )
    if financial_year:
        opening_totals_query = opening_totals_query.filter(JournalEntry.entry_date < financial_year.starts_on)
    else:
        opening_totals_query = opening_totals_query.filter(JournalEntry.id.is_(None))
    opening_totals = opening_totals_query.one()

    accounts_total = int(db.query(func.count(Account.id)).filter(Account.company_id == company_id).scalar() or 0)
    group_accounts = int(
        db.query(func.count(Account.id))
        .filter(Account.company_id == company_id, Account.is_group.is_(True))
        .scalar()
        or 0
    )
    draft_entries = int(
        db.query(func.count(JournalEntry.id))
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "DRAFT")
        .scalar()
        or 0
    )
    posted_entries = int(
        db.query(func.count(JournalEntry.id))
        .filter(JournalEntry.company_id == company_id, JournalEntry.status == "POSTED")
        .scalar()
        or 0
    )
    open_periods = int(
        db.query(func.count(AccountingPeriod.id))
        .filter(AccountingPeriod.company_id == company_id, AccountingPeriod.status == "OPEN")
        .scalar()
        or 0
    )
    restricted_periods = int(
        db.query(func.count(AccountingPeriod.id))
        .filter(AccountingPeriod.company_id == company_id, AccountingPeriod.status != "OPEN")
        .scalar()
        or 0
    )

    difference = _decimal(posted_totals.debit) - _decimal(posted_totals.credit)
    period_open = current_period is not None and current_period.status == "OPEN"
    health_status = "BALANCED" if difference == 0 and period_open else "ATTENTION"

    return AccountingSummary(
        opening_balance=_decimal(opening_totals.debit) - _decimal(opening_totals.credit),
        fiscal_year_code=financial_year.code if financial_year else None,
        fiscal_year_status=financial_year.status if financial_year else None,
        current_period_code=current_period.code if current_period else None,
        current_period_status=current_period.status if current_period else None,
        accounts_total=accounts_total,
        group_accounts=group_accounts,
        posting_accounts=accounts_total - group_accounts,
        draft_entries=draft_entries,
        posted_entries=posted_entries,
        open_periods=open_periods,
        restricted_periods=restricted_periods,
        posted_debit=posted_totals.debit,
        posted_credit=posted_totals.credit,
        difference=difference,
        health_status=health_status,
    )
