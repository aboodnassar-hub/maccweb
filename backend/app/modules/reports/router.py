from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.accounting.service import trial_balance
from backend.app.modules.auth.models import User


router = APIRouter()


@router.get("/overview")
def reports_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("reports.read")),
) -> dict:
    return {
        "trial_balance": [line.model_dump(mode="json") for line in trial_balance(db, current_user.company_id)],
        "available_reports": [
            {"code": "trial_balance", "name_en": "Trial Balance", "name_ar": "ميزان المراجعة"},
            {"code": "general_ledger", "name_en": "General Ledger", "name_ar": "الأستاذ العام"},
            {"code": "inventory_movement", "name_en": "Inventory Movement", "name_ar": "حركة المخزون"},
            {"code": "customer_aging", "name_en": "Customer Aging", "name_ar": "أعمار الذمم المدينة"},
        ],
    }
