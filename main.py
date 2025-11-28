from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from passlib.context import CryptContext

# 1. SECURITY & DATABASE CONFIGURATION
# Replace with your actual PostgreSQL connection string
DATABASE_URL = "postgresql://postgres:admin123@localhost/maccData"

# Password hashing context (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. SQLALCHEMY USER MODEL (The Database Table)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Accountant") # e.g., Admin, Accountant, Viewer
    is_active = Column(Boolean, default=True)

# Create the table if it doesn't exist
Base.metadata.create_all(bind=engine)

# 3. PYDANTIC SCHEMAS (Validation)
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6, description="Password must be at least 6 chars")

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

# 4. HELPER FUNCTIONS
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 5. API ENDPOINTS
app = FastAPI(title="Macc Auth API")

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user.
    1. Checks if email exists.
    2. Hashes the password.
    3. Saves to DB.
    """
    # Check for existing user
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )

    # Hash the password
    hashed_pwd = get_password_hash(user.password)

    # Create new User object
    new_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_pwd,
        role="Accountant" # Default role
    )

    # Add to DB
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@app.post("/auth/login")
def login_user(user_data: dict, db: Session = Depends(get_db)):
    """
    Simple Login Check (For testing connection)
    In a real app, this would return a JWT Token.
    """
    email = user_data.get("email")
    password = user_data.get("password")

    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "name": user.full_name,
            "role": user.role
        }
    }

# Run with: uvicorn auth:app --reload