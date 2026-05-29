from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import DateTime

from backend.app.db.base import Base


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("company_id", "invoice_number", name="uq_invoice_company_number"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invoice_number = Column(String(50), nullable=False, index=True)
    invoice_type = Column(String(16), nullable=False, default="SALES")
    partner_id = Column(Integer, ForeignKey("business_partners.id"), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False, server_default=func.current_date())
    status = Column(String(20), nullable=False, default="DRAFT")
    currency = Column(String(3), nullable=False, default="JOD")
    subtotal = Column(Numeric(20, 4), nullable=False, default=0)
    tax_total = Column(Numeric(20, 4), nullable=False, default=0)
    discount_total = Column(Numeric(20, 4), nullable=False, default=0)
    grand_total = Column(Numeric(20, 4), nullable=False, default=0)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(20, 4), nullable=False, default=1)
    unit_price = Column(Numeric(20, 4), nullable=False, default=0)
    tax_rate = Column(Numeric(9, 4), nullable=False, default=0)
    line_total = Column(Numeric(20, 4), nullable=False, default=0)

    invoice = relationship("Invoice", back_populates="lines")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("company_id", "payment_number", name="uq_payment_company_number"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    payment_number = Column(String(50), nullable=False)
    partner_id = Column(Integer, ForeignKey("business_partners.id"), nullable=True)
    payment_date = Column(Date, nullable=False, server_default=func.current_date())
    payment_type = Column(String(16), nullable=False, default="RECEIPT")
    amount = Column(Numeric(20, 4), nullable=False)
    cash_bank_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    notes = Column(Text, nullable=True)
