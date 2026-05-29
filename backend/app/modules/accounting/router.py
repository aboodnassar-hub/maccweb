from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user, require_permissions
from backend.app.db.session import get_db
from backend.app.modules.accounting.models import Account, JournalEntry
from backend.app.modules.accounting.schemas import AccountCreate, AccountOut, JournalEntryCreate, JournalEntryOut, TrialBalanceLine
from backend.app.modules.accounting.service import AccountingError, create_journal_entry, trial_balance
from backend.app.modules.auth.models import User


router = APIRouter()


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[Account]:
    return (
        db.query(Account)
        .filter(Account.company_id == current_user.company_id)
        .order_by(Account.code)
        .all()
    )


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> Account:
    account = Account(company_id=current_user.company_id, **payload.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


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
def post_journal_entry(
    payload: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> JournalEntry:
    try:
        return create_journal_entry(db, current_user.company_id, payload, current_user.id)
    except AccountingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/trial-balance", response_model=list[TrialBalanceLine])
def get_trial_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> list[TrialBalanceLine]:
    return trial_balance(db, current_user.company_id)
