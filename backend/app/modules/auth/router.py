from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.auth.schemas import LoginRequest, TokenResponse, UserCreate, UserProfile
from backend.app.modules.auth.service import authenticate_user, register_user


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        return register_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    token = authenticate_user(db, payload)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return token


@router.get("/me", response_model=UserProfile)
def me(current_user: User = Depends(get_current_user)) -> UserProfile:
    permissions = sorted(
        {permission.code for role in current_user.roles for permission in role.permissions}
    )
    return UserProfile(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        company_id=current_user.company_id,
        preferred_language=current_user.preferred_language,
        roles=[role.code for role in current_user.roles],
        permissions=permissions,
    )
