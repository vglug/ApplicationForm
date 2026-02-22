"""Add total_family_income to IncomeInfo model

Revision ID: add_total_family_income
Revises: add_review_fields
Create Date: 2025-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_total_family_income'
down_revision = 'add_review_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add total_family_income column to income_info table
    with op.batch_alter_table('income_info', schema=None) as batch_op:
        batch_op.add_column(sa.Column('total_family_income', sa.String(100), nullable=True))
        batch_op.create_index('ix_income_info_total_family_income', ['total_family_income'])


def downgrade():
    with op.batch_alter_table('income_info', schema=None) as batch_op:
        batch_op.drop_index('ix_income_info_total_family_income')
        batch_op.drop_column('total_family_income')
