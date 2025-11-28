from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://postgres:admin123@localhost:5432/maccData"

engine = create_engine(DATABASE_URL, echo=True)  # echo=True لطباعة الاستعلامات أثناء التطوير
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
