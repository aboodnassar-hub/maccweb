from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account
from backend.app.modules.inventory.models import Item, StockMovement
from backend.app.modules.inventory.schemas import ItemCreate, ItemOut, ItemUpdate
from backend.app.modules.sales.models import InvoiceLine


class InventoryError(ValueError):
    pass


ITEM_TYPES = {"STOCK", "SERVICE"}


def _normalize(value: str | None) -> str:
    return (value or "").strip().upper()


def _default_account(db: Session, company_id: int, code: str) -> Account | None:
    return db.query(Account).filter(Account.company_id == company_id, Account.code == code).first()


def _validate_posting_account(db: Session, company_id: int, account_id: int | None, label: str) -> int | None:
    if not account_id:
        return None
    account = db.query(Account).filter(Account.company_id == company_id, Account.id == account_id).first()
    if not account or not account.is_active:
        raise InventoryError(f"{label} account was not found or is inactive")
    if account.is_group:
        raise InventoryError(f"{label} account must be a posting account")
    return account.id


def _prepare_item_type(value: str | None) -> str:
    item_type = _normalize(value) or "SERVICE"
    if item_type not in ITEM_TYPES:
        raise InventoryError("Product type must be STOCK or SERVICE")
    return item_type


def _apply_default_accounts(db: Session, company_id: int, item: Item) -> None:
    if not item.sales_account_id:
        account = _default_account(db, company_id, "41")
        item.sales_account_id = account.id if account else None
    if item.item_type == "STOCK":
        if not item.inventory_account_id:
            account = _default_account(db, company_id, "113")
            item.inventory_account_id = account.id if account else None
        if not item.cogs_account_id:
            account = _default_account(db, company_id, "52")
            item.cogs_account_id = account.id if account else None
    else:
        item.inventory_account_id = None
        item.cogs_account_id = None


def list_items(db: Session, company_id: int, is_active: bool | None = None, search: str | None = None) -> list[ItemOut]:
    query = db.query(Item).filter(Item.company_id == company_id)
    if is_active is not None:
        query = query.filter(Item.is_active.is_(is_active))
    if search:
        like = f"%{search.strip()}%"
        query = query.filter((Item.sku.ilike(like)) | (Item.name_en.ilike(like)) | (Item.name_ar.ilike(like)))
    return [
        ItemOut.model_validate(row, from_attributes=True)
        for row in query.order_by(Item.sku).limit(200).all()
    ]


def create_item(db: Session, company_id: int, payload: ItemCreate) -> ItemOut:
    sku = payload.sku.strip().upper()
    if db.query(Item).filter(Item.company_id == company_id, Item.sku == sku).first():
        raise InventoryError("Product/service code already exists")

    item = Item(
        company_id=company_id,
        sku=sku,
        name_en=payload.name_en.strip(),
        name_ar=payload.name_ar.strip(),
        item_type=_prepare_item_type(payload.item_type),
        unit=(payload.unit or "pcs").strip() or "pcs",
        sales_account_id=_validate_posting_account(db, company_id, payload.sales_account_id, "Sales"),
        inventory_account_id=_validate_posting_account(db, company_id, payload.inventory_account_id, "Inventory"),
        cogs_account_id=_validate_posting_account(db, company_id, payload.cogs_account_id, "Cost of goods sold"),
        is_active=True,
    )
    _apply_default_accounts(db, company_id, item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ItemOut.model_validate(item, from_attributes=True)


def update_item(db: Session, company_id: int, item_id: int, payload: ItemUpdate) -> ItemOut:
    item = db.query(Item).filter(Item.company_id == company_id, Item.id == item_id).first()
    if not item:
        raise InventoryError("Product/service not found")

    data = payload.model_dump(exclude_unset=True)
    for field in ["name_en", "name_ar", "unit"]:
        if field in data:
            value = (data[field] or "").strip()
            if field in {"name_en", "name_ar"} and not value:
                raise InventoryError("Product/service names cannot be empty")
            setattr(item, field, value or ("pcs" if field == "unit" else None))
    if "item_type" in data:
        item.item_type = _prepare_item_type(data["item_type"])
    if "sales_account_id" in data:
        item.sales_account_id = _validate_posting_account(db, company_id, data["sales_account_id"], "Sales")
    if "inventory_account_id" in data:
        item.inventory_account_id = _validate_posting_account(db, company_id, data["inventory_account_id"], "Inventory")
    if "cogs_account_id" in data:
        item.cogs_account_id = _validate_posting_account(db, company_id, data["cogs_account_id"], "Cost of goods sold")

    _apply_default_accounts(db, company_id, item)
    db.commit()
    db.refresh(item)
    return ItemOut.model_validate(item, from_attributes=True)


def set_item_active(db: Session, company_id: int, item_id: int, is_active: bool) -> ItemOut:
    item = db.query(Item).filter(Item.company_id == company_id, Item.id == item_id).first()
    if not item:
        raise InventoryError("Product/service not found")
    item.is_active = is_active
    db.commit()
    db.refresh(item)
    return ItemOut.model_validate(item, from_attributes=True)


def delete_item(db: Session, company_id: int, item_id: int) -> None:
    item = db.query(Item).filter(Item.company_id == company_id, Item.id == item_id).first()
    if not item:
        raise InventoryError("Product/service not found")
    invoice_count = db.query(InvoiceLine).join(Item, Item.id == InvoiceLine.item_id).filter(Item.company_id == company_id, InvoiceLine.item_id == item_id).count()
    movement_count = db.query(StockMovement).filter(StockMovement.company_id == company_id, StockMovement.item_id == item_id).count()
    if invoice_count or movement_count:
        raise InventoryError("Products/services used in invoices or stock movements cannot be deleted; deactivate them instead")
    db.delete(item)
    db.commit()
