from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.parties.schemas import BusinessPartnerCreate, BusinessPartnerOut, BusinessPartnerUpdate
from backend.app.modules.parties.service import (
    PartnerError,
    create_partner,
    delete_partner,
    get_partner,
    list_partners as list_partners_service,
    set_partner_active,
    update_partner,
)


router = APIRouter()


def _partner_http_error(exc: PartnerError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/partners", response_model=list[BusinessPartnerOut])
def list_partners(
    partner_type: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[BusinessPartnerOut]:
    return list_partners_service(db, current_user.company_id, partner_type, is_active, search)


@router.get("/partners/{partner_id}", response_model=BusinessPartnerOut)
def read_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> BusinessPartnerOut:
    try:
        return get_partner(db, current_user.company_id, partner_id)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc


@router.post("/partners", response_model=BusinessPartnerOut, status_code=status.HTTP_201_CREATED)
def add_partner(
    payload: BusinessPartnerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> BusinessPartnerOut:
    try:
        return create_partner(db, current_user.company_id, payload)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc


@router.patch("/partners/{partner_id}", response_model=BusinessPartnerOut)
def patch_partner(
    partner_id: int,
    payload: BusinessPartnerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> BusinessPartnerOut:
    try:
        return update_partner(db, current_user.company_id, partner_id, payload)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc


@router.post("/partners/{partner_id}/activate", response_model=BusinessPartnerOut)
def activate_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> BusinessPartnerOut:
    try:
        return set_partner_active(db, current_user.company_id, partner_id, True)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc


@router.post("/partners/{partner_id}/deactivate", response_model=BusinessPartnerOut)
def deactivate_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> BusinessPartnerOut:
    try:
        return set_partner_active(db, current_user.company_id, partner_id, False)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc


@router.delete("/partners/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_partner(
    partner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.write")),
) -> None:
    try:
        delete_partner(db, current_user.company_id, partner_id)
    except PartnerError as exc:
        raise _partner_http_error(exc) from exc
