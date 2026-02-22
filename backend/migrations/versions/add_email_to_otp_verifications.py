"""Add email column to otp_verifications

Revision ID: add_email_to_otp
Revises: e1d368caf3a9
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_to_otp'
down_revision = 'e1d368caf3a9'
branch_labels = None
depends_on = None


def upgrade():
    # Add email column to otp_verifications table
    op.add_column('otp_verifications', sa.Column('email', sa.String(length=255), nullable=True))
    op.create_index('ix_otp_verifications_email', 'otp_verifications', ['email'], unique=False)
    op.create_index('idx_otp_email_created', 'otp_verifications', ['email', 'created_at'], unique=False)

    # Make phone_number nullable since we now use email
    op.alter_column('otp_verifications', 'phone_number',
                    existing_type=sa.String(length=15),
                    nullable=True)


def downgrade():
    op.drop_index('idx_otp_email_created', table_name='otp_verifications')
    op.drop_index('ix_otp_verifications_email', table_name='otp_verifications')
    op.drop_column('otp_verifications', 'email')

    # Revert phone_number to not nullable
    op.alter_column('otp_verifications', 'phone_number',
                    existing_type=sa.String(length=15),
                    nullable=False)
