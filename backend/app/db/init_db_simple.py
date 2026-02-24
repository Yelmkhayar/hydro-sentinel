"""
Simple DB initialization script that only creates the User table
and seeds it with admin user. This script assumes the api.* views
already exist in your PostgreSQL database.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.models.user import User
from app.db.base_class import Base
from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db():
    # Create engine directly with PostgreSQL URL
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    # Create only the User table (not the views)
    async with engine.begin() as conn:
        # Drop and recreate only the user table
        await conn.execute(text('DROP TABLE IF EXISTS "user" CASCADE'))
        await conn.run_sync(User.metadata.create_all)
        logger.info("User table created")
    
    # Create session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as db:
        # Create admin user
        user = User(
            email="admin@hydro.com",
            hashed_password=security.get_password_hash("admin"),
            full_name="Admin User",
            is_superuser=True,
            is_active=True,
            role="admin"
        )
        db.add(user)
        
        # Create analyst user
        analyst = User(
            email="analyst@hydro.com",
            hashed_password=security.get_password_hash("analyst"),
            full_name="Analyst User",
            is_superuser=False,
            is_active=True,
            role="analyst"
        )
        db.add(analyst)
        
        # Create observer user
        observer = User(
            email="observer@hydro.com",
            hashed_password=security.get_password_hash("observer"),
            full_name="Observer User",
            is_superuser=False,
            is_active=True,
            role="observer"
        )
        db.add(observer)
        
        await db.commit()
        logger.info("✅ Users created successfully!")
        logger.info("   - admin@hydro.com / admin (superuser)")
        logger.info("   - analyst@hydro.com / analyst")
        logger.info("   - observer@hydro.com / observer")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
