from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.inventory.models import Item, Warehouse


router = APIRouter()


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


@router.get("/items")
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("inventory.read")),
) -> list[dict]:
    rows = (
        db.query(Item)
        .filter(Item.company_id == current_user.company_id)
        .order_by(Item.sku)
        .limit(100)
        .all()
    )
    return [{"id": row.id, "sku": row.sku, "name_en": row.name_en, "name_ar": row.name_ar} for row in rows]
