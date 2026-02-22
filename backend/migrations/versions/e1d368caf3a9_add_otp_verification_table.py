"""Add OTP verification table

Revision ID: e1d368caf3a9
Revises: add_email_queue
Create Date: 2026-02-20 10:41:00.334

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1d368caf3a9'
down_revision = 'add_email_queue'
branch_labels = None
depends_on = None


def upgrade():
    # Create otp_verifications table
    op.create_table('otp_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone_number', sa.String(length=15), nullable=False),
        sa.Column('otp_code', sa.String(length=6), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_otp_verifications_phone_number', 'otp_verifications', ['phone_number'], unique=False)
    op.create_index('ix_otp_verifications_created_at', 'otp_verifications', ['created_at'], unique=False)
    op.create_index('ix_otp_verifications_verified', 'otp_verifications', ['verified'], unique=False)
    op.create_index('idx_otp_phone_created', 'otp_verifications', ['phone_number', 'created_at'], unique=False)
    op.create_index('idx_otp_expires', 'otp_verifications', ['expires_at', 'verified'], unique=False)


def downgrade():
    op.drop_index('idx_otp_expires', table_name='otp_verifications')
    op.drop_index('idx_otp_phone_created', table_name='otp_verifications')
    op.drop_index('ix_otp_verifications_verified', table_name='otp_verifications')
    op.drop_index('ix_otp_verifications_created_at', table_name='otp_verifications')
    op.drop_index('ix_otp_verifications_phone_number', table_name='otp_verifications')
    op.drop_table('otp_verifications')
