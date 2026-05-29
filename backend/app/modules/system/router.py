from fastapi import APIRouter


router = APIRouter()


@router.get("/modules")
def module_registry() -> list[dict]:
    return [
        {"code": "accounting", "status": "foundation", "dependencies": []},
        {"code": "parties", "status": "foundation", "dependencies": ["accounting"]},
        {"code": "inventory", "status": "foundation", "dependencies": ["accounting"]},
        {"code": "sales", "status": "foundation", "dependencies": ["parties", "inventory", "accounting"]},
        {"code": "hr", "status": "foundation", "dependencies": ["accounting"]},
        {"code": "reports", "status": "foundation", "dependencies": ["accounting", "inventory", "sales"]},
    ]
