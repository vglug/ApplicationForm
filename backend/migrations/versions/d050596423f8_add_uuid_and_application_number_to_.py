"""Add uuid and application_number to Submission

Revision ID: d050596423f8
Revises: 9dbd46294de6
Create Date: 2025-12-16 01:06:11.749872

"""
from alembic import op
import sqlalchemy as sa
import uuid as uuid_lib
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'd050596423f8'
down_revision = '9dbd46294de6'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns as nullable first
    with op.batch_alter_table('submission', schema=None) as batch_op:
        batch_op.add_column(sa.Column('uuid', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('application_number', sa.String(length=20), nullable=True))

    # Populate existing rows with UUID and application numbers
    connection = op.get_bind()

    # Get all existing submissions
    result = connection.execute(sa.text("SELECT id, created_at FROM submission ORDER BY id"))
    rows = result.fetchall()

    for idx, row in enumerate(rows):
        submission_uuid = str(uuid_lib.uuid4())
        # Generate application number based on created_at if available, otherwise use current date
        if row[1]:  # created_at
            date_str = row[1].strftime('%Y%m%d')
        else:
            date_str = datetime.utcnow().strftime('%Y%m%d')
        app_number = f'APP{date_str}{idx + 1:04d}'

        connection.execute(
            sa.text("UPDATE submission SET uuid = :uuid, application_number = :app_num WHERE id = :id"),
            {"uuid": submission_uuid, "app_num": app_number, "id": row[0]}
        )

    # Now make columns non-nullable and add unique constraints
    with op.batch_alter_table('submission', schema=None) as batch_op:
        batch_op.alter_column('uuid', nullable=False)
        batch_op.alter_column('application_number', nullable=False)
        batch_op.create_unique_constraint('uq_submission_uuid', ['uuid'])
        batch_op.create_unique_constraint('uq_submission_application_number', ['application_number'])


def downgrade():
    with op.batch_alter_table('submission', schema=None) as batch_op:
        batch_op.drop_constraint('uq_submission_application_number', type_='unique')
        batch_op.drop_constraint('uq_submission_uuid', type_='unique')
        batch_op.drop_column('application_number')
        batch_op.drop_column('uuid')
