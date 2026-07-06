from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class InvoiceLineCreate(BaseModel):
    item_id: int | None = None
    warehouse_id: int | None = None
    description: str = Field(min_length=1, max_length=255)
    quantity: Decimal = Field(default=Decimal("1"), gt=0)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    discount_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class InvoiceCreate(BaseModel):
    invoice_number: str | None = Field(default=None, max_length=50)
    partner_id: int
    warehouse_id: int | None = None
    invoice_date: date
    due_date: date | None = None
    currency: str = Field(default="JOD", min_length=3, max_length=3)
    tax_inclusive: bool = False
    notes: str | None = None
    post: bool = False
    lines: list[InvoiceLineCreate] = Field(min_length=1)


class InvoiceLineOut(BaseModel):
    id: int
    item_id: int | None
    warehouse_id: int | None
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    discount_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    net_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id: int
    company_id: int
    invoice_number: str
    invoice_type: str
    partner_id: int
    partner_code: str | None = None
    partner_name_en: str | None = None
    partner_name_ar: str | None = None
    warehouse_id: int | None
    invoice_date: date
    due_date: date | None
    status: str
    currency: str
    tax_inclusive: bool
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    journal_entry_id: int | None
    notes: str | None
    lines: list[InvoiceLineOut] = []


class InvoiceCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=255)
    reversal_date: date | None = None
