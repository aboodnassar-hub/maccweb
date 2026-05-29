import re

from pydantic import BaseModel, Field, field_validator


class CompanyAccountCreate(BaseModel):
    company_code: str = Field(min_length=2, max_length=32)
    company_name_en: str = Field(min_length=2, max_length=255)
    company_name_ar: str = Field(min_length=2, max_length=255)
    base_currency: str = Field(default="JOD", min_length=3, max_length=3)
    admin_full_name: str = Field(min_length=2, max_length=255)
    admin_email: str
    admin_password: str = Field(min_length=8)

    @field_validator("company_code")
    @classmethod
    def normalize_company_code(cls, value: str) -> str:
        return re.sub(r"[^A-Z0-9_-]", "", value.strip().upper())

    @field_validator("base_currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("admin_email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Invalid email address")
        return value


class CompanyAccountOut(BaseModel):
    id: int
    code: str
    name_en: str
    name_ar: str
    base_currency: str
    is_active: bool
    users_count: int
    active_users_count: int


class ManagedUserOut(BaseModel):
    id: int
    company_id: int
    company_code: str
    full_name: str
    email: str
    is_active: bool
    roles: list[str]
