import os
import sys
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_initial_admin():
    from database import SessionLocal
    from models import User
    import auth

    logger.info("Initializing DB session for admin creation...")
    db = SessionLocal()
    try:
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "admin@admin.com")
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")

        logger.info(f"Checking if admin user '{admin_username}' exists...")
        existing_admin = db.query(User).filter(User.username == admin_username).first()
        if existing_admin:
            logger.info(f"Admin '{admin_username}' already exists (ID: {existing_admin.id}). Skipping creation.")
            return

        logger.info(f"Creating initial admin user: {admin_username}")

        new_admin = User(
            username=admin_username,
            email=admin_email,
            hashed_password=auth.get_password_hash(admin_pass),
            full_name="Administrador do Sistema",
            role="admin",
            is_active=True,
            approval_status="approved",
            can_generate_report=True,
            can_view_processes=True,
            can_view_dashboard=True,
            can_view_reports=True,
        )
        db.add(new_admin)
        db.commit()
        logger.info(f"Successfully created admin user: {admin_username}")
    except Exception as e:
        logger.error(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()
        logger.info("DB session closed after admin creation attempt.")


if __name__ == "__main__":
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    create_initial_admin()
