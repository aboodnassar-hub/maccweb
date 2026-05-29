from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from backend.app.db.base import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), nullable=False, unique=True, index=True)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    base_currency = Column(String(3), nullable=False, default="JOD")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(Date, server_default=func.current_date())

    branches = relationship("Branch", back_populates="company", cascade="all, delete-orphan")


class Branch(Base):
    __tablename__ = "branches"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_branch_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(32), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    company = relationship("Company", back_populates="branches")


class FinancialYear(Base):
    __tablename__ = "financial_years"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_financial_year_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(16), nullable=False)
    starts_on = Column(Date, nullable=False)
    ends_on = Column(Date, nullable=False)
    status = Column(String(16), nullable=False, default="OPEN")

    periods = relationship("AccountingPeriod", back_populates="financial_year", cascade="all, delete-orphan")


class AccountingPeriod(Base):
    __tablename__ = "accounting_periods"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_accounting_period_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    financial_year_id = Column(Integer, ForeignKey("financial_years.id"), nullable=False, index=True)
    code = Column(String(16), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    starts_on = Column(Date, nullable=False)
    ends_on = Column(Date, nullable=False)
    status = Column(String(16), nullable=False, default="OPEN")

    financial_year = relationship("FinancialYear", back_populates="periods")
