from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.parties.models import BusinessPartner


router = APIRouter()


@router.get("/partners")
def list_partners(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[dict]:
    rows = (
        db.query(BusinessPartner)
        .filter(BusinessPartner.company_id == current_user.company_id)
        .order_by(BusinessPartner.code)
        .limit(100)
        .all()
    )
    return [
        {
            "id": row.id,
            "code": row.code,
            "type": row.partner_type,
            "name_en": row.name_en,
            "name_ar": row.name_ar,
            "is_active": row.is_active,
        }
        for row in rows
    ]
