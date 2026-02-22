"""Add email_verified fields to BasicInfo

Revision ID: add_email_verified
Revises: b420d2429902
Create Date: 2026-02-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_verified'
down_revision = 'b420d2429902'
branch_labels = None
depends_on = None


def upgrade():
    # Add email verification fields to basic_info
    op.add_column('basic_info', sa.Column('email_verified', sa.Boolean(), nullable=True))
    op.add_column('basic_info', sa.Column('email_sent_at', sa.DateTime(), nullable=True))
    op.add_column('basic_info', sa.Column('email_verified_at', sa.DateTime(), nullable=True))
    op.add_column('basic_info', sa.Column('email_error', sa.String(500), nullable=True))

    # Add index for email_verified
    op.create_index('ix_basic_info_email_verified', 'basic_info', ['email_verified'], unique=False)


def downgrade():
    # Drop index
    op.drop_index('ix_basic_info_email_verified', table_name='basic_info')

    # Drop columns
    op.drop_column('basic_info', 'email_error')
    op.drop_column('basic_info', 'email_verified_at')
    op.drop_column('basic_info', 'email_sent_at')
    op.drop_column('basic_info', 'email_verified')
