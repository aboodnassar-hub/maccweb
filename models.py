from sqlalchemy import Column, Integer, String, Boolean, Date, Text, DECIMAL, ForeignKey, CheckConstraint, TIMESTAMP
from sqlalchemy.orm import relationship
from db import Base

# 1. Accounts
class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    account_type = Column(String(20), nullable=True)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    is_group = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default="CURRENT_TIMESTAMP")

    parent = relationship("Account", remote_side=[id], backref="children")


# 2. Cost Centers
class CostCenter(Base):
    __tablename__ = "cost_centers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=True)


# 3. Journal Entries
class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    entry_number = Column(String(50), unique=True, nullable=False)
    entry_date = Column(Date, nullable=False)
    description = Column(Text)
    reference_doc = Column(String(100))
    status = Column(String(20), default="POSTED")
    created_at = Column(TIMESTAMP, server_default="CURRENT_TIMESTAMP")

    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")


# 4. Journal Lines
class JournalLine(Base):
    __tablename__ = "journal_lines"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    
    description = Column(String(255))
    debit = Column(DECIMAL(20, 4), default=0.0000)
    credit = Column(DECIMAL(20, 4), default=0.0000)

    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account")
    cost_center = relationship("CostCenter")

    __table_args__ = (
        CheckConstraint(
            "(debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)",
            name="check_debit_credit_exclusive"
        ),
        CheckConstraint("debit >= 0 AND credit >= 0", name="check_non_negative"),
    )
