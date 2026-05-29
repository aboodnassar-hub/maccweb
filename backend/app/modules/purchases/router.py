from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import require_permissions
from backend.app.db.session import get_db
from backend.app.modules.auth.models import User
from backend.app.modules.sales.models import Invoice


router = APIRouter()


@router.get("/invoices")
def list_purchase_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permissions("accounting.read")),
) -> list[dict]:
    rows = (
        db.query(Invoice)
        .filter(Invoice.company_id == current_user.company_id, Invoice.invoice_type == "PURCHASE")
        .order_by(Invoice.invoice_date.desc(), Invoice.id.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": row.id,
            "invoice_number": row.invoice_number,
            "invoice_type": row.invoice_type,
            "status": row.status,
            "invoice_date": row.invoice_date.isoformat(),
            "grand_total": str(row.grand_total),
        }
        for row in rows
    ]
