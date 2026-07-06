from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=80)
    name_en: str = Field(min_length=1, max_length=255)
    name_ar: str = Field(min_length=1, max_length=255)
    item_type: str = "SERVICE"
    unit: str = Field(default="pcs", max_length=24)
    sales_account_id: int | None = None
    inventory_account_id: int | None = None
    cogs_account_id: int | None = None


class ItemUpdate(BaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=255)
    name_ar: str | None = Field(default=None, min_length=1, max_length=255)
    item_type: str | None = None
    unit: str | None = Field(default=None, max_length=24)
    sales_account_id: int | None = None
    inventory_account_id: int | None = None
    cogs_account_id: int | None = None


class ItemOut(BaseModel):
    id: int
    company_id: int
    sku: str
    name_en: str
    name_ar: str
    item_type: str
    unit: str
    sales_account_id: int | None
    inventory_account_id: int | None
    cogs_account_id: int | None
    is_active: bool

    class Config:
        from_attributes = True
