# backend/app/db/init_db_final.py
"""
Final DB initialization script for Hydro Sentinel.

- Creates schema auth if missing
- Ensures table auth.user exists (NO impact on api.* views)
- Upserts 3 users: admin / analyst / observer

Run (PowerShell):
  $env:PYTHONPATH="C:\dev\detection_inondation\hydro_sentinel\backend"
  python backend\app\db\init_db_final.py

Optional reset:
  $env:RESET_AUTH="1"
  python backend\app\db\init_db_final.py
"""

import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.user import User
from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db_final")


def _load_env_best_effort() -> None:
    """
    Charge backend/.env même si on exécute depuis la racine du repo.
    """
    # 1) si déjà défini dans l'env, on ne force pas
    if os.getenv("DATABASE_URL"):
        return

    # Ce fichier est dans backend/app/db/init_db_final.py
    # donc __file__.parent.parent.parent = backend/
    here = Path(__file__).resolve()
    backend_dir = here.parent.parent.parent  # backend/
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        logger.info(f"Loaded .env : {env_path}")
    else:
        logger.warning(f"No .env found at {env_path} (DATABASE_URL must be in env)")


def _redact_db_url(url: str) -> str:
    # masque le password si présent
    if "@" not in url:
        return url
    left, right = url.split("@", 1)
    if "://" in left and ":" in left.split("://", 1)[1]:
        scheme, rest = left.split("://", 1)
        userpass = rest
        user = userpass.split(":", 1)[0]
        return f"{scheme}://{user}:***@{right}"
    return f"***@{right}"


def _ensure_postgres_url(raw_url: str) -> str:
    """
    Accepte:
      - postgresql+asyncpg://...
      - postgresql://...   (converti en asyncpg)
    Refuse sqlite.
    """
    if not raw_url:
        raise RuntimeError("DATABASE_URL is missing. Put it in backend/.env or environment variables.")

    if raw_url.startswith("sqlite"):
        raise RuntimeError(
            "DATABASE_URL points to SQLite. This init script requires PostgreSQL "
            "(because it creates schema 'auth'). Fix DATABASE_URL in backend/.env."
        )

    if raw_url.startswith("postgresql+asyncpg://"):
        return raw_url

    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    raise RuntimeError(
        f"Unsupported DATABASE_URL scheme. Expected postgresql:// or postgresql+asyncpg://, got: {raw_url.split(':',1)[0]}:"
    )


async def _ensure_auth_schema(conn) -> None:
    await conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
    logger.info("✅ Schema 'auth' ready")


async def _ensure_user_table(conn, reset: bool) -> None:
    if reset:
        await conn.execute(text("DROP TABLE IF EXISTS auth.user CASCADE"))
        logger.warning("⚠️ RESET_AUTH=1 -> dropped auth.user")

    # Crée uniquement la table User (sans toucher api.*)
    def _create_only_user(sync_conn):
        User.__table__.create(bind=sync_conn, checkfirst=True)

    await conn.run_sync(_create_only_user)
    logger.info("✅ Table 'auth.user' ensured")


async def _upsert_user(db: AsyncSession, *, email: str, password: str, full_name: str, role: str, is_superuser: bool) -> None:
    # hash robuste (PBKDF2-SHA256 via security.py)
    hashed = security.get_password_hash(password)

    # UPSERT by email (email est unique dans le modèle)
    # 1) chercher
    res = await db.execute(select(User).where(User.email == email))
    existing = res.scalar_one_or_none()

    if existing:
        existing.hashed_password = hashed
        existing.full_name = full_name
        existing.role = role
        existing.is_superuser = is_superuser
        existing.is_active = True
    else:
        db.add(
            User(
                email=email,
                hashed_password=hashed,
                full_name=full_name,
                is_superuser=is_superuser,
                is_active=True,
                role=role,
            )
        )


async def init_db() -> None:
    _load_env_best_effort()

    raw_url = os.getenv("DATABASE_URL") or getattr(settings, "DATABASE_URL", None)
    db_url = _ensure_postgres_url(raw_url)

    reset_auth = (os.getenv("RESET_AUTH", "0").strip() in ("1", "true", "True", "YES", "yes"))

    logger.info("=================================================")
    logger.info("Hydro Sentinel - DB init (auth schema + users)")
    logger.info(f"DATABASE_URL : {_redact_db_url(db_url)}")
    logger.info(f"RESET_AUTH   : {reset_auth}")
    logger.info("=================================================")

    engine = create_async_engine(db_url, echo=False, future=True)

    async with engine.begin() as conn:
        await _ensure_auth_schema(conn)
        await _ensure_user_table(conn, reset=reset_auth)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        await _upsert_user(
            db,
            email="admin@hydro.com",
            password="admin",
            full_name="Administrateur",
            role="admin",
            is_superuser=True,
        )
        await _upsert_user(
            db,
            email="analyst@hydro.com",
            password="analyst",
            full_name="Analyste",
            role="analyst",
            is_superuser=False,
        )
        await _upsert_user(
            db,
            email="observer@hydro.com",
            password="observer",
            full_name="Observateur",
            role="observer",
            is_superuser=False,
        )

        await db.commit()

    await engine.dispose()

    logger.info("✅ Users upserted successfully!")
    logger.info("   📧 admin@hydro.com / admin (superuser)")
    logger.info("   📧 analyst@hydro.com / analyst")
    logger.info("   📧 observer@hydro.com / observer")
    logger.info("🎉 Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(init_db())
