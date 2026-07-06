from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.core.config import get_settings


settings = get_settings()

connect_args = {}
engine_options = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    engine_options["pool_pre_ping"] = True

engine = create_engine(settings.database_url, connect_args=connect_args, future=True, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
