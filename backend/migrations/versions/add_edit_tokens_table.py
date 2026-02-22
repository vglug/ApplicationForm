"""Add edit_tokens table

Revision ID: add_edit_tokens
Revises: add_email_to_otp
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_edit_tokens'
down_revision = 'add_email_to_otp'
branch_labels = None
depends_on = None


def upgrade():
    # Create edit_tokens table
    op.create_table('edit_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('candidate_id', sa.String(length=20), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=True),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['application.candidate_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_edit_tokens_token', 'edit_tokens', ['token'], unique=True)
    op.create_index('ix_edit_tokens_candidate_id', 'edit_tokens', ['candidate_id'], unique=False)
    op.create_index('ix_edit_tokens_email', 'edit_tokens', ['email'], unique=False)
    op.create_index('idx_edit_token_expires', 'edit_tokens', ['expires_at', 'used'], unique=False)


def downgrade():
    op.drop_index('idx_edit_token_expires', table_name='edit_tokens')
    op.drop_index('ix_edit_tokens_email', table_name='edit_tokens')
    op.drop_index('ix_edit_tokens_candidate_id', table_name='edit_tokens')
    op.drop_index('ix_edit_tokens_token', table_name='edit_tokens')
    op.drop_table('edit_tokens')
