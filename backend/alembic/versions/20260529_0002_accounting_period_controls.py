"""Add accounting period controls.

Revision ID: 20260529_0002
Revises: 20260529_0001
Create Date: 2026-05-29 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260529_0002"
down_revision: str | None = "20260529_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "accounting_periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("financial_year_id", sa.Integer(), sa.ForeignKey("financial_years.id"), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ar", sa.String(length=255), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="OPEN"),
        sa.UniqueConstraint("company_id", "code", name="uq_accounting_period_company_code"),
    )
    op.create_index(op.f("ix_accounting_periods_company_id"), "accounting_periods", ["company_id"])
    op.create_index(op.f("ix_accounting_periods_financial_year_id"), "accounting_periods", ["financial_year_id"])

    with op.batch_alter_table("journal_entries") as batch_op:
        batch_op.add_column(sa.Column("reversal_of_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_journal_entries_reversal_of_id",
            "journal_entries",
            ["reversal_of_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("journal_entries") as batch_op:
        batch_op.drop_constraint("fk_journal_entries_reversal_of_id", type_="foreignkey")
        batch_op.drop_column("reversal_of_id")
    op.drop_index(op.f("ix_accounting_periods_financial_year_id"), table_name="accounting_periods")
    op.drop_index(op.f("ix_accounting_periods_company_id"), table_name="accounting_periods")
    op.drop_table("accounting_periods")
