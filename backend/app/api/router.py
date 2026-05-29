from fastapi import APIRouter

from backend.app.modules.accounting.router import router as accounting_router
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.hr.router import router as hr_router
from backend.app.modules.inventory.router import router as inventory_router
from backend.app.modules.parties.router import router as parties_router
from backend.app.modules.sales.router import router as sales_router
from backend.app.modules.system.router import router as system_router


api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(accounting_router, prefix="/accounting", tags=["accounting"])
api_router.include_router(parties_router, prefix="/parties", tags=["parties"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
api_router.include_router(sales_router, prefix="/sales", tags=["sales"])
api_router.include_router(hr_router, prefix="/hr", tags=["hr"])
api_router.include_router(system_router, prefix="/system", tags=["system"])
