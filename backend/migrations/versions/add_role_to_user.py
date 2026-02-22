"""Add role field to User model, replacing is_admin

Revision ID: add_role_to_user
Revises: 1cd87caafcc2
Create Date: 2025-01-31

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_role_to_user'
down_revision = '1cd87caafcc2'
branch_labels = None
depends_on = None


def upgrade():
    # Add role column with default 'volunteer'
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(20), nullable=False, server_default='volunteer'))
        batch_op.create_index('ix_user_role', ['role'])

    # Migrate existing is_admin values to role
    # Users with is_admin=True become 'admin', others become 'volunteer'
    op.execute("UPDATE \"user\" SET role = 'admin' WHERE is_admin = true")
    op.execute("UPDATE \"user\" SET role = 'volunteer' WHERE is_admin = false")

    # Drop the is_admin column
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('is_admin')


def downgrade():
    # Re-add is_admin column
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))

    # Migrate role back to is_admin
    op.execute("UPDATE \"user\" SET is_admin = true WHERE role = 'admin'")
    op.execute("UPDATE \"user\" SET is_admin = false WHERE role != 'admin'")

    # Drop role column and index
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_index('ix_user_role')
        batch_op.drop_column('role')
