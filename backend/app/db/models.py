"""Import all SQLAlchemy models so metadata is complete for migrations."""

from backend.app.modules.accounting import models as accounting_models  # noqa: F401
from backend.app.modules.audit import models as audit_models  # noqa: F401
from backend.app.modules.auth import models as auth_models  # noqa: F401
from backend.app.modules.companies import models as company_models  # noqa: F401
from backend.app.modules.hr import models as hr_models  # noqa: F401
from backend.app.modules.inventory import models as inventory_models  # noqa: F401
from backend.app.modules.notifications import models as notification_models  # noqa: F401
from backend.app.modules.parties import models as party_models  # noqa: F401
from backend.app.modules.sales import models as sales_models  # noqa: F401
