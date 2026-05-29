from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.system_admin.schemas import CompanyAccountCreate, CompanyAccountOut, ManagedUserOut
from backend.app.modules.system_admin.service import (
    SystemAdminError,
    create_company_account,
    delete_company_account,
    list_company_accounts,
    list_managed_users,
    set_company_active,
    set_user_active,
)


router = APIRouter()


@router.get("/companies", response_model=list[CompanyAccountOut])
def companies(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> list[CompanyAccountOut]:
    return list_company_accounts(db)


@router.post("/companies", response_model=CompanyAccountOut, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyAccountCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> CompanyAccountOut:
    try:
        return create_company_account(db, payload)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/companies/{company_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
def activate_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> None:
    try:
        set_company_active(db, company_id, True)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/companies/{company_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> None:
    try:
        set_company_active(db, company_id, False)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> None:
    try:
        delete_company_account(db, company_id)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/users", response_model=list[ManagedUserOut])
def users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> list[ManagedUserOut]:
    return list_managed_users(db)


@router.post("/users/{user_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> None:
    try:
        set_user_active(db, user_id, True)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/users/{user_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions("system.admin")),
) -> None:
    try:
        set_user_active(db, user_id, False)
    except SystemAdminError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
