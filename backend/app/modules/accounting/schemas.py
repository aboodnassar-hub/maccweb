from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name_en: str = Field(min_length=1, max_length=255)
    name_ar: str = Field(min_length=1, max_length=255)
    account_type: str
    normal_balance: str
    parent_id: int | None = None
    is_group: bool = False


class AccountOut(AccountCreate):
    id: int
    company_id: int
    is_active: bool

    class Config:
        from_attributes = True


class JournalLineCreate(BaseModel):
    account_id: int
    cost_center_id: int | None = None
    description: str | None = None
    debit: Decimal = Decimal("0")
    credit: Decimal = Decimal("0")


class JournalEntryCreate(BaseModel):
    entry_number: str = Field(min_length=1, max_length=50)
    entry_date: date
    description: str | None = None
    reference_doc: str | None = None
    post: bool = False
    lines: list[JournalLineCreate] = Field(min_length=2)


class JournalLineOut(JournalLineCreate):
    id: int

    class Config:
        from_attributes = True


class JournalEntryOut(BaseModel):
    id: int
    company_id: int
    entry_number: str
    entry_date: date
    description: str | None
    reference_doc: str | None
    source_module: str
    status: str
    lines: list[JournalLineOut]

    class Config:
        from_attributes = True


class TrialBalanceLine(BaseModel):
    account_id: int
    account_code: str
    name_en: str
    name_ar: str
    debit: Decimal
    credit: Decimal
    balance: Decimal
