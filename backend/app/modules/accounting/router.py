from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.accounting.models import Account, JournalEntry
from backend.app.modules.accounting.schemas import (
    AccountCreate,
    AccountOut,
    AccountingPeriodOut,
    AccountingPeriodUpdate,
    AccountingSummary,
    FiscalYearCreate,
    FiscalYearOut,
    JournalEntryCreate,
    JournalEntryOut,
    JournalEntryReverse,
    TrialBalanceLine,
)
from backend.app.modules.accounting.service import (
    AccountingError,
    accounting_summary,
    create_account as create_account_service,
    create_fiscal_year,
    create_journal_entry,
    delete_account as delete_account_service,
    list_accounts as list_accounts_service,
    list_fiscal_years,
    list_periods,
    post_journal_entry,
    reverse_journal_entry,
    trial_balance,
    update_period_status,
)
from backend.app.modules.auth.models import User


router = APIRouter()


def _accounting_http_error(exc: AccountingError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/summary", response_model=AccountingSummary)
def get_accounting_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> AccountingSummary:
    return accounting_summary(db, current_user.company_id)


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[dict]:
    return list_accounts_service(db, current_user.company_id)


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> Account:
    try:
        return create_account_service(db, current_user.company_id, payload)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> None:
    try:
        delete_account_service(db, current_user.company_id, account_id)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.get("/journal-entries", response_model=list[JournalEntryOut])
def list_journal_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[JournalEntry]:
    return (
        db.query(JournalEntry)
        .filter(JournalEntry.company_id == current_user.company_id)
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())
        .limit(100)
        .all()
    )


@router.post("/journal-entries", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
def add_journal_entry(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> JournalEntry:
    try:
        return create_journal_entry(db, current_user.company_id, payload, current_user.id)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.post("/journal-entries/{entry_id}/post", response_model=JournalEntryOut)
def post_draft_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> JournalEntry:
    try:
        return post_journal_entry(db, current_user.company_id, entry_id)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.post("/journal-entries/{entry_id}/reverse", response_model=JournalEntryOut, status_code=status.HTTP_201_CREATED)
def reverse_posted_journal_entry(
    entry_id: int,
    payload: JournalEntryReverse,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> JournalEntry:
    try:
        return reverse_journal_entry(db, current_user.company_id, entry_id, payload, current_user.id)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.get("/trial-balance", response_model=list[TrialBalanceLine])
def get_trial_balance(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    fiscal_year_id: int | None = Query(default=None),
    period_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> list[TrialBalanceLine]:
    try:
        return trial_balance(db, current_user.company_id, from_date, to_date, fiscal_year_id, period_id)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.get("/fiscal-years", response_model=list[FiscalYearOut])
def get_fiscal_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
):
    return list_fiscal_years(db, current_user.company_id)


@router.post("/fiscal-years", response_model=FiscalYearOut, status_code=status.HTTP_201_CREATED)
def add_fiscal_year(
    payload: FiscalYearCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
):
    try:
        return create_fiscal_year(db, current_user.company_id, payload)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc


@router.get("/periods", response_model=list[AccountingPeriodOut])
def get_periods(
    fiscal_year_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
):
    return list_periods(db, current_user.company_id, fiscal_year_id)


@router.patch("/periods/{period_id}", response_model=AccountingPeriodOut)
def patch_period(
    period_id: int,
    payload: AccountingPeriodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
):
    try:
        return update_period_status(db, current_user.company_id, period_id, payload)
    except AccountingError as exc:
        raise _accounting_http_error(exc) from exc
