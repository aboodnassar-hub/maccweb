from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.sql.sqltypes import DateTime

from backend.app.db.base import Base


class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_warehouse_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    code = Column(String(50), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (UniqueConstraint("company_id", "sku", name="uq_item_company_sku"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    sku = Column(String(80), nullable=False, index=True)
    barcode = Column(String(120), nullable=True, index=True)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    item_type = Column(String(24), nullable=False, default="STOCK")
    unit = Column(String(24), nullable=False, default="pcs")
    costing_method = Column(String(24), nullable=False, default="WEIGHTED_AVERAGE")
    sales_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    inventory_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    cogs_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    movement_date = Column(Date, nullable=False, server_default=func.current_date())
    source_module = Column(String(40), nullable=False)
    source_id = Column(Integer, nullable=True)
    quantity_in = Column(Numeric(20, 4), nullable=False, default=0)
    quantity_out = Column(Numeric(20, 4), nullable=False, default=0)
    unit_cost = Column(Numeric(20, 4), nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
