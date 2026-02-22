"""Add review fields to BasicInfo model

Revision ID: add_review_fields
Revises: add_role_to_user
Create Date: 2025-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_review_fields'
down_revision = 'add_role_to_user'
branch_labels = None
depends_on = None


def upgrade():
    # Add review fields to basic_info table
    with op.batch_alter_table('basic_info', schema=None) as batch_op:
        batch_op.add_column(sa.Column('considered', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('selected', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('remarks', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('user.id'), nullable=True))
        batch_op.create_index('ix_basic_info_considered', ['considered'])
        batch_op.create_index('ix_basic_info_selected', ['selected'])
        batch_op.create_index('ix_basic_info_reviewed_by', ['reviewed_by'])
        batch_op.create_index('idx_review_status', ['considered', 'selected'])


def downgrade():
    with op.batch_alter_table('basic_info', schema=None) as batch_op:
        batch_op.drop_index('idx_review_status')
        batch_op.drop_index('ix_basic_info_reviewed_by')
        batch_op.drop_index('ix_basic_info_selected')
        batch_op.drop_index('ix_basic_info_considered')
        batch_op.drop_column('reviewed_by')
        batch_op.drop_column('remarks')
        batch_op.drop_column('selected')
        batch_op.drop_column('considered')
