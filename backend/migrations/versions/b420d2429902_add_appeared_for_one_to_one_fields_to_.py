"""Add appeared_for_one_to_one fields to BasicInfo

Revision ID: b420d2429902
Revises: add_total_family_income
Create Date: 2026-02-15 11:48:02.229061

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b420d2429902'
down_revision = 'add_total_family_income'
branch_labels = None
depends_on = None


def upgrade():
    # Add appeared_for_one_to_one fields to basic_info
    op.add_column('basic_info', sa.Column('appeared_for_one_to_one', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('basic_info', sa.Column('appeared_marked_by', sa.Integer(), nullable=True))
    op.add_column('basic_info', sa.Column('appeared_marked_at', sa.DateTime(), nullable=True))

    # Add indexes
    op.create_index('ix_basic_info_appeared_for_one_to_one', 'basic_info', ['appeared_for_one_to_one'], unique=False)
    op.create_index('ix_basic_info_appeared_marked_by', 'basic_info', ['appeared_marked_by'], unique=False)

    # Add foreign key
    op.create_foreign_key('fk_basic_info_appeared_marked_by', 'basic_info', 'user', ['appeared_marked_by'], ['id'])


def downgrade():
    # Drop foreign key
    op.drop_constraint('fk_basic_info_appeared_marked_by', 'basic_info', type_='foreignkey')

    # Drop indexes
    op.drop_index('ix_basic_info_appeared_marked_by', table_name='basic_info')
    op.drop_index('ix_basic_info_appeared_for_one_to_one', table_name='basic_info')

    # Drop columns
    op.drop_column('basic_info', 'appeared_marked_at')
    op.drop_column('basic_info', 'appeared_marked_by')
    op.drop_column('basic_info', 'appeared_for_one_to_one')
