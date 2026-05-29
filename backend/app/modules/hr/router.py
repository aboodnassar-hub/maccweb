from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.hr.models import Employee


router = APIRouter()


@router.get("/employees")
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("hr.write")),
) -> list[dict]:
    rows = (
        db.query(Employee)
        .filter(Employee.company_id == current_user.company_id)
        .order_by(Employee.employee_number)
        .limit(100)
        .all()
    )
    return [
        {
            "id": row.id,
            "employee_number": row.employee_number,
            "full_name_en": row.full_name_en,
            "full_name_ar": row.full_name_ar,
        }
        for row in rows
    ]
