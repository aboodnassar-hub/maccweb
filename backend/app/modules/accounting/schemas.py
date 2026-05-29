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
    children_count: int = 0
    transaction_count: int = 0

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


class JournalEntryReverse(BaseModel):
    entry_number: str | None = Field(default=None, max_length=50)
    entry_date: date
    description: str | None = None


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
    reversal_of_id: int | None = None
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


class FiscalYearCreate(BaseModel):
    code: str = Field(min_length=1, max_length=16)
    starts_on: date
    ends_on: date
    status: str = "OPEN"
    generate_periods: bool = True


class FiscalYearOut(BaseModel):
    id: int
    company_id: int
    code: str
    starts_on: date
    ends_on: date
    status: str

    class Config:
        from_attributes = True


class AccountingPeriodOut(BaseModel):
    id: int
    company_id: int
    financial_year_id: int
    code: str
    name_en: str
    name_ar: str
    starts_on: date
    ends_on: date
    status: str

    class Config:
        from_attributes = True


class AccountingPeriodUpdate(BaseModel):
    status: str


class AccountingSummary(BaseModel):
    opening_balance: Decimal
    fiscal_year_code: str | None
    fiscal_year_status: str | None
    current_period_code: str | None
    current_period_status: str | None
    accounts_total: int
    group_accounts: int
    posting_accounts: int
    draft_entries: int
    posted_entries: int
    open_periods: int
    restricted_periods: int
    posted_debit: Decimal
    posted_credit: Decimal
    difference: Decimal
    health_status: str
