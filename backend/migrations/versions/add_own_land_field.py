"""Add own_land boolean field to IncomeInfo model

Revision ID: add_own_land
Revises: add_edit_tokens
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_own_land'
down_revision = 'add_edit_tokens'
branch_labels = None
depends_on = None


def upgrade():
    # Add own_land boolean column to income_info table
    with op.batch_alter_table('income_info', schema=None) as batch_op:
        batch_op.add_column(sa.Column('own_land', sa.Boolean(), nullable=True, default=False))


def downgrade():
    with op.batch_alter_table('income_info', schema=None) as batch_op:
        batch_op.drop_column('own_land')
