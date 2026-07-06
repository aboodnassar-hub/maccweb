"""Add ERP invoice fields.

Revision ID: 20260706_0003
Revises: 20260529_0002
Create Date: 2026-07-06 00:00:00
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260706_0003"
down_revision: str | None = "20260529_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("invoices") as batch_op:
        batch_op.add_column(sa.Column("warehouse_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("due_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("tax_inclusive", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key("fk_invoices_warehouse_id", "warehouses", ["warehouse_id"], ["id"])

    with op.batch_alter_table("invoice_lines") as batch_op:
        batch_op.add_column(sa.Column("warehouse_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("discount_rate", sa.Numeric(9, 4), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("discount_amount", sa.Numeric(20, 4), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_amount", sa.Numeric(20, 4), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("net_amount", sa.Numeric(20, 4), nullable=False, server_default="0"))
        batch_op.create_foreign_key("fk_invoice_lines_warehouse_id", "warehouses", ["warehouse_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("invoice_lines") as batch_op:
        batch_op.drop_constraint("fk_invoice_lines_warehouse_id", type_="foreignkey")
        batch_op.drop_column("net_amount")
        batch_op.drop_column("tax_amount")
        batch_op.drop_column("discount_amount")
        batch_op.drop_column("discount_rate")
        batch_op.drop_column("warehouse_id")

    with op.batch_alter_table("invoices") as batch_op:
        batch_op.drop_constraint("fk_invoices_warehouse_id", type_="foreignkey")
        batch_op.drop_column("canceled_at")
        batch_op.drop_column("posted_at")
        batch_op.drop_column("tax_inclusive")
        batch_op.drop_column("due_date")
        batch_op.drop_column("warehouse_id")
