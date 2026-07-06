from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.inventory.models import Warehouse
from backend.app.modules.inventory.schemas import ItemCreate, ItemOut, ItemUpdate
from backend.app.modules.inventory.service import (
    InventoryError,
    create_item,
    delete_item,
    list_items as list_items_service,
    set_item_active,
    update_item,
)


router = APIRouter()


def _inventory_http_error(exc: InventoryError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/warehouses")
def list_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.read")),
) -> list[dict]:
    rows = (
        db.query(Warehouse)
        .filter(Warehouse.company_id == current_user.company_id)
        .order_by(Warehouse.code)
        .all()
    )
    return [{"id": row.id, "code": row.code, "name_en": row.name_en, "name_ar": row.name_ar} for row in rows]


@router.get("/items", response_model=list[ItemOut])
def list_items(
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.read")),
) -> list[ItemOut]:
    return list_items_service(db, current_user.company_id, is_active, search)


@router.post("/items", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def add_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.write")),
) -> ItemOut:
    try:
        return create_item(db, current_user.company_id, payload)
    except InventoryError as exc:
        raise _inventory_http_error(exc) from exc


@router.patch("/items/{item_id}", response_model=ItemOut)
def patch_item(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.write")),
) -> ItemOut:
    try:
        return update_item(db, current_user.company_id, item_id, payload)
    except InventoryError as exc:
        raise _inventory_http_error(exc) from exc


@router.post("/items/{item_id}/activate", response_model=ItemOut)
def activate_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.write")),
) -> ItemOut:
    try:
        return set_item_active(db, current_user.company_id, item_id, True)
    except InventoryError as exc:
        raise _inventory_http_error(exc) from exc


@router.post("/items/{item_id}/deactivate", response_model=ItemOut)
def deactivate_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.write")),
) -> ItemOut:
    try:
        return set_item_active(db, current_user.company_id, item_id, False)
    except InventoryError as exc:
        raise _inventory_http_error(exc) from exc


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.write")),
) -> None:
    try:
        delete_item(db, current_user.company_id, item_id)
    except InventoryError as exc:
        raise _inventory_http_error(exc) from exc
