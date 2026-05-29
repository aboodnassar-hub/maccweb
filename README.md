# Macc ERP / Accounting Platform

Macc is being transformed from a small accounting app into a modular web ERP/accounting platform with Arabic and English support, RTL/LTR layouts, a React frontend, and a FastAPI backend.

## Current Architecture

```text
backend/
  app/
    api/                 FastAPI router composition and dependencies
    core/                Configuration and security helpers
    db/                  SQLAlchemy base, session, model registry, seed helpers
    modules/
      accounting/        Chart of accounts, journals, trial balance
      auth/              Users, roles, permissions, signed tokens
      companies/         Company, branch, financial year boundaries
      inventory/         Warehouses, items, stock movements
      parties/           Customers, vendors, business partners
      sales/             Invoices, invoice lines, payments
      hr/                Departments and employees
      audit/             Activity log tables
      notifications/     In-app notification tables
  alembic/               Database migrations
src/
  app/                   React shell and navigation registry
  data/                  Demo ERP data used by the frontend workspace
  features/              Auth, dashboard, accounting, and module workspaces
  i18n/                  English/Arabic translations and direction handling
  services/              API client
```

Backend entry points, models, and database configuration live under `backend/app`. The old project-root backend shims have been removed.

## Frontend

```powershell
npm install
npm start
```

The React app runs on [http://localhost:3000](http://localhost:3000). By default the login uses local demo mode. To connect it to the backend auth API, start the backend and run the frontend with:

```powershell
$env:REACT_APP_USE_API="true"
$env:REACT_APP_API_URL="http://127.0.0.1:8000/api/v1"
npm start
```

## Backend Environment

Required for production:

```powershell
$env:MACC_DATABASE_URL="postgresql://user:password@host:5432/database"
$env:MACC_SECRET_KEY="replace-with-a-long-random-secret"
$env:MACC_ENV="production"
$env:MACC_ALLOWED_ORIGINS="https://your-frontend-domain.example"
$env:MACC_AUTO_CREATE_TABLES="false"
```

Optional:

```powershell
$env:MACC_API_PREFIX="/api/v1"
$env:MACC_APP_NAME="Macc ERP API"
$env:MACC_ACCESS_TOKEN_EXPIRE_MINUTES="720"
$env:MACC_DEFAULT_COMPANY_CODE="MAIN"
```

Render may expose the database URL as `DATABASE_URL`; the backend accepts that too. If Render provides a `postgres://` URL, the backend normalizes it to `postgresql://`.

## Backend Local Development

Install backend dependencies:

```powershell
venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Run migrations and seed default company, roles, permissions, and chart of accounts:

```powershell
venv\Scripts\alembic.exe upgrade head
venv\Scripts\python.exe -m backend.app.db.seed
```

Start the API:

```powershell
venv\Scripts\uvicorn.exe backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

The API runs on [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Render Deployment

Recommended Render build command:

```bash
pip install -r backend/requirements.txt
```

Recommended Render start command:

```bash
alembic upgrade head && python -m backend.app.db.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Set `MACC_AUTO_CREATE_TABLES=false` in Render so production schema changes only happen through Alembic.

## Verification

```powershell
npm run build
npm test -- --watchAll=false --runInBand
venv\Scripts\python.exe -c "from backend.app.main import app; print(app.title)"
```

## ERP Direction

The first foundation slice includes module boundaries, multi-company-ready data models, role-based permissions, bilingual labels, RTL/LTR support, chart of accounts seeding, journal balancing validation, and starter records for inventory, sales, purchases, HR, reports, audit logs, and notifications.

Next backend milestones:

1. Expand service-layer posting flows for invoices, payments, payroll, and stock movements.
2. Add report endpoints for general ledger, trial balance, account statements, inventory movement, AR/AP aging, and tax summaries.
3. Add permission-aware frontend API integration.
4. Add activity-log middleware and notification events.
5. Add automated backend tests around posting, permissions, and migration integrity.
