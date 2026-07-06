from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.sales.schemas import InvoiceCancel, InvoiceCreate, InvoiceOut
from backend.app.modules.sales.service import (
    InvoiceError,
    cancel_invoice,
    create_invoice,
    get_invoice,
    list_invoices,
    post_invoice,
)


router = APIRouter()


def _invoice_http_error(exc: InvoiceError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/invoices", response_model=list[InvoiceOut])
def list_purchase_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[InvoiceOut]:
    return list_invoices(db, current_user.company_id, "PURCHASE")


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def read_purchase_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> InvoiceOut:
    try:
        return get_invoice(db, current_user.company_id, invoice_id, "PURCHASE")
    except InvoiceError as exc:
        raise _invoice_http_error(exc) from exc


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def add_purchase_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("sales.write")),
) -> InvoiceOut:
    try:
        return create_invoice(db, current_user.company_id, "PURCHASE", payload, current_user.id)
    except InvoiceError as exc:
        raise _invoice_http_error(exc) from exc


@router.post("/invoices/{invoice_id}/post", response_model=InvoiceOut)
def post_purchase_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("sales.write")),
) -> InvoiceOut:
    try:
        return post_invoice(db, current_user.company_id, invoice_id, "PURCHASE", current_user.id)
    except InvoiceError as exc:
        raise _invoice_http_error(exc) from exc


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_purchase_invoice(
    invoice_id: int,
    payload: InvoiceCancel,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("sales.write")),
) -> InvoiceOut:
    try:
        return cancel_invoice(db, current_user.company_id, invoice_id, "PURCHASE", payload, current_user.id)
    except InvoiceError as exc:
        raise _invoice_http_error(exc) from exc
