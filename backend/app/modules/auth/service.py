from sqlalchemy.orm import Session

from backend.app.core.config import get_settings
from backend.app.core.security import create_access_token, hash_password, verify_password
from backend.app.modules.auth.models import Permission, Role, User
from backend.app.modules.auth.schemas import LoginRequest, TokenResponse, UserCreate, UserProfile
from backend.app.modules.companies.models import Company


DEFAULT_PERMISSIONS = [
    ("system.admin", "System administrator", "مدير النظام"),
    ("accounting.read", "Read accounting", "قراءة المحاسبة"),
    ("accounting.write", "Write accounting", "إدارة المحاسبة"),
    ("inventory.read", "Read inventory", "قراءة المخزون"),
    ("inventory.write", "Write inventory", "إدارة المخزون"),
    ("sales.write", "Write sales and purchases", "إدارة المبيعات والمشتريات"),
    ("hr.write", "Write HR", "إدارة الموارد البشرية"),
    ("reports.read", "Read reports", "قراءة التقارير"),
]

DEFAULT_ROLES = [
    ("admin", "Administrator", "مدير", ["system.admin"]),
    (
        "head_accountant",
        "Head Accountant",
        "رئيس الحسابات",
        ["accounting.read", "accounting.write", "inventory.read", "sales.write", "reports.read"],
    ),
    ("viewer", "Viewer", "مستعرض", ["accounting.read", "inventory.read", "reports.read"]),
]


def ensure_default_roles(db: Session) -> None:
    permissions_by_code: dict[str, Permission] = {}
    for code, name_en, name_ar in DEFAULT_PERMISSIONS:
        permission = db.query(Permission).filter(Permission.code == code).first()
        if not permission:
            permission = Permission(code=code, name_en=name_en, name_ar=name_ar)
            db.add(permission)
        permissions_by_code[code] = permission

    db.flush()

    for code, name_en, name_ar, permission_codes in DEFAULT_ROLES:
        role = db.query(Role).filter(Role.code == code).first()
        if not role:
            role = Role(code=code, name_en=name_en, name_ar=name_ar, is_system=True)
            db.add(role)
        role.permissions = [permissions_by_code[item] for item in permission_codes]

    db.commit()


def _profile(user: User) -> UserProfile:
    permissions = sorted({permission.code for role in user.roles for permission in role.permissions})
    return UserProfile(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        company_id=user.company_id,
        preferred_language=user.preferred_language,
        roles=[role.code for role in user.roles],
        permissions=permissions,
    )


def _resolve_company(db: Session, code: str | None) -> Company:
    company_code = code or get_settings().default_company_code
    company = db.query(Company).filter(Company.code == company_code).first()
    if not company:
        company = Company(
            code=company_code,
            name_en=company_code.title(),
            name_ar=company_code,
            base_currency="JOD",
        )
        db.add(company)
        db.commit()
        db.refresh(company)
    return company


def register_user(db: Session, payload: UserCreate) -> TokenResponse:
    ensure_default_roles(db)
    company = _resolve_company(db, payload.company_code)
    existing = (
        db.query(User)
        .filter(User.company_id == company.id, User.email == payload.email)
        .first()
    )
    if existing:
        raise ValueError("Email already registered for this company")

    role = db.query(Role).filter(Role.code == "head_accountant").first()
    user = User(
        company_id=company.id,
        full_name=payload.full_name.strip(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        roles=[role] if role else [],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return issue_token(user)


def authenticate_user(db: Session, payload: LoginRequest) -> TokenResponse | None:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        return None
    return issue_token(user)


def issue_token(user: User) -> TokenResponse:
    profile = _profile(user)
    return TokenResponse(
        access_token=create_access_token(str(user.id), profile.permissions),
        user=profile,
    )
