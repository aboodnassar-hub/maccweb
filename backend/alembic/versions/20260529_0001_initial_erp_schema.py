"""Initial ERP schema.

Revision ID: 20260529_0001
Revises:
Create Date: 2026-05-29 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260529_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("base_currency", sa.String(length=3), nullable=False, server_default="JOD"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.Date(), server_default=sa.text("CURRENT_DATE")),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_companies_code"), "companies", ["code"])

    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_permissions_code"), "permissions", ["code"])

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_roles_code"), "roles", ["code"])

    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "code", name="uq_branch_company_code"),
    )
    op.create_index(op.f("ix_branches_company_id"), "branches", ["company_id"])

    op.create_table(
        "financial_years",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="OPEN"),
        sa.UniqueConstraint("company_id", "code", name="uq_financial_year_company_code"),
    )
    op.create_index(op.f("ix_financial_years_company_id"), "financial_years", ["company_id"])

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("permission_id", sa.Integer(), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("preferred_language", sa.String(length=2), nullable=False, server_default="en"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("company_id", "email", name="uq_user_company_email"),
    )
    op.create_index(op.f("ix_users_company_id"), "users", ["company_id"])
    op.create_index(op.f("ix_users_email"), "users", ["email"])

    op.create_table(
        "accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("account_type", sa.String(length=24), nullable=False),
        sa.Column("normal_balance", sa.String(length=8), nullable=False),
        sa.Column("is_group", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("company_id", "code", name="uq_account_company_code"),
    )
    op.create_index(op.f("ix_accounts_code"), "accounts", ["code"])
    op.create_index(op.f("ix_accounts_company_id"), "accounts", ["company_id"])

    op.create_table(
        "cost_centers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "code", name="uq_cost_center_company_code"),
    )
    op.create_index(op.f("ix_cost_centers_company_id"), "cost_centers", ["company_id"])

    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "code", name="uq_department_company_code"),
    )
    op.create_index(op.f("ix_departments_company_id"), "departments", ["company_id"])

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=80)),
        sa.Column("ip_address", sa.String(length=64)),
        sa.Column("metadata_json", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(op.f("ix_activity_logs_company_id"), "activity_logs", ["company_id"])

    op.create_table(
        "business_partners",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("partner_type", sa.String(length=16), nullable=False, server_default="CUSTOMER"),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("tax_number", sa.String(length=64)),
        sa.Column("phone", sa.String(length=64)),
        sa.Column("email", sa.String(length=255)),
        sa.Column("address", sa.Text()),
        sa.Column("receivable_account_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("payable_account_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "code", name="uq_partner_company_code"),
    )
    op.create_index(op.f("ix_business_partners_company_id"), "business_partners", ["company_id"])

    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id")),
        sa.Column("employee_number", sa.String(length=50), nullable=False),
        sa.Column("full_name_en", sa.String(length=255), nullable=False),
        sa.Column("full_name_ar", sa.String(length=255), nullable=False),
        sa.Column("job_title", sa.String(length=255)),
        sa.Column("hire_date", sa.Date()),
        sa.Column("base_salary", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "employee_number", name="uq_employee_company_number"),
    )
    op.create_index(op.f("ix_employees_company_id"), "employees", ["company_id"])

    op.create_table(
        "items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("sku", sa.String(length=80), nullable=False),
        sa.Column("barcode", sa.String(length=120)),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("item_type", sa.String(length=24), nullable=False, server_default="STOCK"),
        sa.Column("unit", sa.String(length=24), nullable=False, server_default="pcs"),
        sa.Column("costing_method", sa.String(length=24), nullable=False, server_default="WEIGHTED_AVERAGE"),
        sa.Column("sales_account_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("inventory_account_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("cogs_account_id", sa.Integer(), sa.ForeignKey("accounts.id")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "sku", name="uq_item_company_sku"),
    )
    op.create_index(op.f("ix_items_barcode"), "items", ["barcode"])
    op.create_index(op.f("ix_items_company_id"), "items", ["company_id"])
    op.create_index(op.f("ix_items_sku"), "items", ["sku"])

    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("entry_number", sa.String(length=50), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("reference_doc", sa.String(length=100)),
        sa.Column("source_module", sa.String(length=40), nullable=False, server_default="manual"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("company_id", "entry_number", name="uq_journal_company_number"),
    )
    op.create_index(op.f("ix_journal_entries_company_id"), "journal_entries", ["company_id"])
    op.create_index(op.f("ix_journal_entries_entry_number"), "journal_entries", ["entry_number"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("channel", sa.String(length=24), nullable=False, server_default="IN_APP"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text()),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(op.f("ix_notifications_company_id"), "notifications", ["company_id"])

    op.create_table(
        "warehouses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("warehouses.id")),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("company_id", "code", name="uq_warehouse_company_code"),
    )
    op.create_index(op.f("ix_warehouses_company_id"), "warehouses", ["company_id"])

    op.create_table(
        "journal_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("journal_entry_id", sa.Integer(), sa.ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("cost_center_id", sa.Integer(), sa.ForeignKey("cost_centers.id")),
        sa.Column("description", sa.String(length=255)),
        sa.Column("debit", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("credit", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.CheckConstraint("debit >= 0 AND credit >= 0", name="ck_journal_line_non_negative"),
        sa.CheckConstraint("NOT (debit > 0 AND credit > 0)", name="ck_journal_line_debit_credit_exclusive"),
    )
    op.create_index(op.f("ix_journal_lines_account_id"), "journal_lines", ["account_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("payment_number", sa.String(length=50), nullable=False),
        sa.Column("partner_id", sa.Integer(), sa.ForeignKey("business_partners.id")),
        sa.Column("payment_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("payment_type", sa.String(length=16), nullable=False, server_default="RECEIPT"),
        sa.Column("amount", sa.Numeric(20, 4), nullable=False),
        sa.Column("cash_bank_account_id", sa.Integer(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("journal_entry_id", sa.Integer(), sa.ForeignKey("journal_entries.id")),
        sa.Column("notes", sa.Text()),
        sa.UniqueConstraint("company_id", "payment_number", name="uq_payment_company_number"),
    )
    op.create_index(op.f("ix_payments_company_id"), "payments", ["company_id"])

    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("items.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouses.id"), nullable=False),
        sa.Column("movement_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("source_module", sa.String(length=40), nullable=False),
        sa.Column("source_id", sa.Integer()),
        sa.Column("quantity_in", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("quantity_out", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("unit_cost", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(op.f("ix_stock_movements_company_id"), "stock_movements", ["company_id"])
    op.create_index(op.f("ix_stock_movements_item_id"), "stock_movements", ["item_id"])
    op.create_index(op.f("ix_stock_movements_warehouse_id"), "stock_movements", ["warehouse_id"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("invoice_number", sa.String(length=50), nullable=False),
        sa.Column("invoice_type", sa.String(length=16), nullable=False, server_default="SALES"),
        sa.Column("partner_id", sa.Integer(), sa.ForeignKey("business_partners.id"), nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="JOD"),
        sa.Column("subtotal", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("tax_total", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("discount_total", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("grand_total", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("journal_entry_id", sa.Integer(), sa.ForeignKey("journal_entries.id")),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("company_id", "invoice_number", name="uq_invoice_company_number"),
    )
    op.create_index(op.f("ix_invoices_company_id"), "invoices", ["company_id"])
    op.create_index(op.f("ix_invoices_invoice_number"), "invoices", ["invoice_number"])
    op.create_index(op.f("ix_invoices_partner_id"), "invoices", ["partner_id"])

    op.create_table(
        "invoice_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", sa.Integer(), sa.ForeignKey("items.id")),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 4), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("tax_rate", sa.Numeric(9, 4), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(20, 4), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("invoice_lines")
    op.drop_table("invoices")
    op.drop_table("stock_movements")
    op.drop_table("payments")
    op.drop_table("journal_lines")
    op.drop_table("warehouses")
    op.drop_table("notifications")
    op.drop_table("journal_entries")
    op.drop_table("items")
    op.drop_table("employees")
    op.drop_table("business_partners")
    op.drop_table("activity_logs")
    op.drop_table("user_roles")
    op.drop_table("departments")
    op.drop_table("cost_centers")
    op.drop_table("accounts")
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_table("financial_years")
    op.drop_table("branches")
    op.drop_table("roles")
    op.drop_table("permissions")
    op.drop_table("companies")
