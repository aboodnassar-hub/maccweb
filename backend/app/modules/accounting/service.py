from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account, JournalEntry, JournalLine
from backend.app.modules.accounting.schemas import JournalEntryCreate, TrialBalanceLine


class AccountingError(ValueError):
    pass


def validate_balanced_journal(payload: JournalEntryCreate) -> None:
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for line in payload.lines:
        debit = Decimal(line.debit or 0)
        credit = Decimal(line.credit or 0)
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


def create_journal_entry(
    db: Session,
    company_id: int,
    payload: JournalEntryCreate,
    created_by_id: int | None,
) -> JournalEntry:
    validate_balanced_journal(payload)

    account_ids = {line.account_id for line in payload.lines}
    accounts = (
        db.query(Account)
        .filter(Account.company_id == company_id, Account.id.in_(account_ids))
        .all()
    )
    accounts_by_id = {account.id: account for account in accounts}
    if len(accounts_by_id) != len(account_ids):
        raise AccountingError("One or more accounts do not exist for this company")
    if any(account.is_group for account in accounts):
        raise AccountingError("Journal entries can only be posted to leaf accounts")

    entry = JournalEntry(
        company_id=company_id,
        entry_number=payload.entry_number,
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


def trial_balance(db: Session, company_id: int) -> list[TrialBalanceLine]:
    debit_sum = func.coalesce(func.sum(JournalLine.debit), 0)
    credit_sum = func.coalesce(func.sum(JournalLine.credit), 0)
    rows = (
        db.query(
            Account.id,
            Account.code,
            Account.name_en,
            Account.name_ar,
            debit_sum.label("debit"),
            credit_sum.label("credit"),
        )
        .join(JournalLine, JournalLine.account_id == Account.id)
        .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
        .filter(Account.company_id == company_id, JournalEntry.status == "POSTED")
        .group_by(Account.id, Account.code, Account.name_en, Account.name_ar)
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
