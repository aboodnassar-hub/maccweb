from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, String, UniqueConstraint

from backend.app.db.base import Base


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_department_company_code"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_ar = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (UniqueConstraint("company_id", "employee_number", name="uq_employee_company_number"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    employee_number = Column(String(50), nullable=False)
    full_name_en = Column(String(255), nullable=False)
    full_name_ar = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=True)
    hire_date = Column(Date, nullable=True)
    base_salary = Column(Numeric(20, 4), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
