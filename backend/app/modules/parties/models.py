from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, UniqueConstraint

from backend.app.db.base import Base


class BusinessPartner(Base):
    __tablename__ = "business_partners"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_partner_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    partner_type = Column(String(16), nullable=False, default="CUSTOMER")
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    tax_number = Column(String(64), nullable=True)
    phone = Column(String(64), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    receivable_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    payable_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
