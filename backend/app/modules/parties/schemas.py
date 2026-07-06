from decimal import Decimal

from pydantic import BaseModel, Field


class BusinessPartnerCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    partner_type: str = "CUSTOMER"
    name_en: str = Field(min_length=1, max_length=255)
    name_ar: str = Field(min_length=1, max_length=255)
    tax_number: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=64)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = None
    receivable_account_id: int | None = None
    payable_account_id: int | None = None


class BusinessPartnerUpdate(BaseModel):
    partner_type: str | None = None
    name_en: str | None = Field(default=None, min_length=1, max_length=255)
    name_ar: str | None = Field(default=None, min_length=1, max_length=255)
    tax_number: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=64)
    email: str | None = Field(default=None, max_length=255)
    address: str | None = None
    receivable_account_id: int | None = None
    payable_account_id: int | None = None


class BusinessPartnerOut(BaseModel):
    id: int
    company_id: int
    code: str
    type: str
    partner_type: str
    name_en: str
    name_ar: str
    tax_number: str | None
    phone: str | None
    email: str | None
    address: str | None
    receivable_account_id: int | None
    payable_account_id: int | None
    is_active: bool
    invoice_count: int = 0
    sales_total: Decimal = Decimal("0")
    purchase_total: Decimal = Decimal("0")
