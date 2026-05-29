import re

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            raise ValueError("Invalid email address")
        return value


class UserCreate(LoginRequest):
    full_name: str = Field(min_length=2, max_length=255)
    company_code: str | None = None


class UserProfile(BaseModel):
    id: int
    full_name: str
    email: str
    company_id: int
    preferred_language: str
    roles: list[str]
    permissions: list[str]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile
