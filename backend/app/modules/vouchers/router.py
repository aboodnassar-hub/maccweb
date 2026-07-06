from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.sales.schemas import PaymentCreate, PaymentOut
from backend.app.modules.sales.service import InvoiceError, create_payment, list_payments


router = APIRouter()


def _voucher_http_error(exc: InvoiceError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/receipts", response_model=list[PaymentOut])
def list_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[PaymentOut]:
    return list_payments(db, current_user.company_id, "RECEIPT")


@router.post("/receipts", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def add_receipt(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> PaymentOut:
    try:
        return create_payment(db, current_user.company_id, "RECEIPT", payload, current_user.id)
    except InvoiceError as exc:
        raise _voucher_http_error(exc) from exc


@router.get("/payments", response_model=list[PaymentOut])
def list_payment_vouchers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[PaymentOut]:
    return list_payments(db, current_user.company_id, "PAYMENT")


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def add_payment_voucher(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> PaymentOut:
    try:
        return create_payment(db, current_user.company_id, "PAYMENT", payload, current_user.id)
    except InvoiceError as exc:
        raise _voucher_http_error(exc) from exc
