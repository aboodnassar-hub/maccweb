from sqlalchemy.orm import Session

from backend.app.modules.accounting.models import Account


DEFAULT_ACCOUNTS = [
    ("1", "Assets", "الأصول", "ASSET", "DEBIT", None, True),
    ("11", "Current Assets", "الأصول المتداولة", "ASSET", "DEBIT", "1", True),
    ("111", "Cash and Banks", "النقد والبنوك", "ASSET", "DEBIT", "11", True),
    ("1111", "Main Cash Box", "الصندوق الرئيسي", "ASSET", "DEBIT", "111", False),
    ("1112", "Petty Cash", "العهدة النقدية", "ASSET", "DEBIT", "111", False),
    ("112", "Accounts Receivable", "الذمم المدينة", "ASSET", "DEBIT", "11", False),
    ("12", "Fixed Assets", "الأصول الثابتة", "ASSET", "DEBIT", "1", True),
    ("2", "Liabilities", "الخصوم", "LIABILITY", "CREDIT", None, True),
    ("21", "Current Liabilities", "الخصوم المتداولة", "LIABILITY", "CREDIT", "2", True),
    ("211", "Accounts Payable", "الذمم الدائنة", "LIABILITY", "CREDIT", "21", False),
    ("3", "Equity", "حقوق الملكية", "EQUITY", "CREDIT", None, True),
    ("4", "Revenue", "الإيرادات", "REVENUE", "CREDIT", None, True),
    ("41", "Sales Revenue", "إيرادات المبيعات", "REVENUE", "CREDIT", "4", False),
    ("5", "Expenses", "المصروفات", "EXPENSE", "DEBIT", None, True),
    ("51", "Operating Expenses", "المصروفات التشغيلية", "EXPENSE", "DEBIT", "5", True),
    ("511", "Rent Expense", "مصروف الإيجار", "EXPENSE", "DEBIT", "51", False),
]


def seed_chart_of_accounts(db: Session, company_id: int) -> None:
    existing = db.query(Account).filter(Account.company_id == company_id).first()
    if existing:
        return

    accounts_by_code: dict[str, Account] = {}
    for code, name_en, name_ar, account_type, normal_balance, parent_code, is_group in DEFAULT_ACCOUNTS:
        account = Account(
            company_id=company_id,
            code=code,
            name_en=name_en,
            name_ar=name_ar,
            account_type=account_type,
            normal_balance=normal_balance,
            parent=accounts_by_code.get(parent_code),
            is_group=is_group,
        )
        db.add(account)
        accounts_by_code[code] = account

    db.commit()
