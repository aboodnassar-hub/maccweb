from sqlalchemy import Boolean, CheckConstraint, Column, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import DateTime

from backend.app.db.base import Base


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_account_company_code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False, index=True)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    account_type = Column(String(24), nullable=False)
    normal_balance = Column(String(8), nullable=False)
    is_group = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("Account", remote_side=[id], backref="children")


class CostCenter(Base):
    __tablename__ = "cost_centers"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_cost_center_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(32), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    __table_args__ = (UniqueConstraint("company_id", "entry_number", name="uq_journal_company_number"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entry_number = Column(String(50), nullable=False, index=True)
    entry_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    reference_doc = Column(String(100), nullable=True)
    source_module = Column(String(40), nullable=False, default="manual")
    status = Column(String(20), nullable=False, default="DRAFT")
    reversal_of_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")
    reversal_of = relationship("JournalEntry", remote_side=[id])


class JournalLine(Base):
    __tablename__ = "journal_lines"
    __table_args__ = (
        CheckConstraint("debit >= 0 AND credit >= 0", name="ck_journal_line_non_negative"),
        CheckConstraint(
            "NOT (debit > 0 AND credit > 0)",
            name="ck_journal_line_debit_credit_exclusive",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    description = Column(String(255), nullable=True)
    debit = Column(Numeric(20, 4), nullable=False, default=0)
    credit = Column(Numeric(20, 4), nullable=False, default=0)

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account")
    cost_center = relationship("CostCenter")
