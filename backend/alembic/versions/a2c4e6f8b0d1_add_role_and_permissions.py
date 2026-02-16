"""add role and permissions to users

Revision ID: a2c4e6f8b0d1
Revises: b1b9dfc26bc6
Create Date: 2026-02-16 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2c4e6f8b0d1'
down_revision: Union[str, None] = 'b1b9dfc26bc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(), nullable=True, server_default='user'))
    op.add_column('users', sa.Column('can_generate_report', sa.Boolean(), nullable=True, server_default='0'))
    # Set admin user to have admin role and full permissions
    op.execute("UPDATE users SET role='admin', can_generate_report=1 WHERE email='admin@reportterra.com'")


def downgrade() -> None:
    op.drop_column('users', 'can_generate_report')
    op.drop_column('users', 'role')
