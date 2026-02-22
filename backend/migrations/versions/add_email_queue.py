"""Add EmailQueue table for background email processing

Revision ID: add_email_queue
Revises: add_email_verified
Create Date: 2026-02-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_email_queue'
down_revision = 'add_email_verified'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_queue table
    op.create_table('email_queue',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('candidate_id', sa.String(20), nullable=False),
        sa.Column('to_email', sa.String(255), nullable=False),
        sa.Column('recipient_name', sa.String(255), nullable=False),
        sa.Column('email_type', sa.String(50), nullable=False, server_default='verification'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_retries', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('last_error_at', sa.DateTime(), nullable=True),
        sa.Column('celery_task_id', sa.String(100), nullable=True),
        sa.ForeignKeyConstraint(['candidate_id'], ['application.candidate_id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_email_queue_candidate_id', 'email_queue', ['candidate_id'], unique=False)
    op.create_index('ix_email_queue_email_type', 'email_queue', ['email_type'], unique=False)
    op.create_index('ix_email_queue_status', 'email_queue', ['status'], unique=False)
    op.create_index('ix_email_queue_created_at', 'email_queue', ['created_at'], unique=False)
    op.create_index('ix_email_queue_celery_task_id', 'email_queue', ['celery_task_id'], unique=False)
    op.create_index('idx_email_queue_status_created', 'email_queue', ['status', 'created_at'], unique=False)
    op.create_index('idx_email_queue_retry', 'email_queue', ['status', 'retry_count'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index('idx_email_queue_retry', table_name='email_queue')
    op.drop_index('idx_email_queue_status_created', table_name='email_queue')
    op.drop_index('ix_email_queue_celery_task_id', table_name='email_queue')
    op.drop_index('ix_email_queue_created_at', table_name='email_queue')
    op.drop_index('ix_email_queue_status', table_name='email_queue')
    op.drop_index('ix_email_queue_email_type', table_name='email_queue')
    op.drop_index('ix_email_queue_candidate_id', table_name='email_queue')

    # Drop table
    op.drop_table('email_queue')
