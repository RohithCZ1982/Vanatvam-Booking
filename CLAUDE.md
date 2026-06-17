# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vanatvam is a property booking management system where property owners reserve cottages using a quota-based credit system (weekday/weekend credits). Two roles exist: **Admin** (manages members, properties, bookings, quotas) and **Owner** (books cottages, views trips/transactions).

## Development Commands

### Backend (FastAPI + Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload       # Runs on :8000
python create_admin.py          # Interactive admin user creation
```

### Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm start          # Runs on :3000
npm run build      # Production build
npm test           # Jest tests
```

### Database (PostgreSQL)
```bash
docker-compose up -d   # Starts Postgres on :5432 (user: postgres, pass: postgres, db: vanatvam)
```
Tables are auto-created by SQLAlchemy on backend startup via `Base.metadata.create_all()` in `main.py`.

### Environment Variables
- `backend/.env`: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `frontend/.env`: `REACT_APP_API_URL` (defaults to `http://localhost:8000`)

## Architecture

### Backend
- **`main.py`** — FastAPI app entry point, CORS config, mounts three routers
- **`database.py`** — SQLAlchemy engine/session setup, `get_db()` dependency
- **`models.py`** — All SQLAlchemy models (User, Property, Cottage, Booking, MaintenanceBlock, SystemCalendar, PeakSeason, QuotaTransaction, EmailConfig, EmailTemplate)
- **`schemas.py`** — Pydantic request/response schemas with validators
- **`auth.py`** — JWT auth helpers, password hashing (bcrypt), `get_current_user`/`get_current_admin_user` dependencies
- **`email_service.py`** — SMTP email sending for registration confirmation, approval notifications
- **Routers** (`routers/`):
  - `auth.py` — `/api/auth/*` — register, login, email verification, password reset
  - `admin.py` — `/api/admin/*` — member management, properties, cottages, bookings, quotas, holidays, reports
  - `owner.py` — `/api/owner/*` — dashboard, booking CRUD, availability, sanctuary calendar, trips, transactions

### Frontend
- **`App.tsx`** — Route definitions with role-based `PrivateRoute` (admin → `/admin/*`, owner → `/owner/*`)
- **`contexts/AuthContext.tsx`** — Auth state, JWT token in localStorage, axios interceptor for auto-attach
- **`services/api.ts`** — Axios instance with Bearer token injection and 401 auto-logout
- **Components mirror backend roles:**
  - `Auth/` — Login, Register, ForgotPassword, ResetPassword, VerifyEmail
  - `Admin/` — AdminDashboard (shell with sidebar nav), plus ~20 feature components
  - `Owner/` — OwnerDashboard (shell), Dashboard (Airbnb-style cottage grid + detail view), BookingCalendar, MyTrips, QuotaStatus, TransactionHistory

### Key Domain Concepts
- **Credit system**: Owners have `weekday_quota`/`weekend_quota` (annual allocation) and `weekday_balance`/`weekend_balance` (running balance). Bookings deduct credits; holidays and peak seasons cost weekend credits regardless of day.
- **Booking flow**: Owner submits → status `pending` (credits escrowed) → Admin approves (`confirmed`) or rejects (`rejected`, credits refunded).
- **Sanctuary Calendar**: Property-wide calendar modal showing all bookings, maintenance blocks, holidays/peak seasons across all cottages. Rendered via `ReactDOM.createPortal` to `document.body`.
- **Cottage images**: Stored in GCP bucket or served from `/uploads/` on the backend.

### Styling
All styling is inline React `style={{}}` objects — there is no CSS framework. Global CSS files exist per module (`Auth.css`, `AdminDashboard.css`, `OwnerDashboard.css`) for layout scaffolding only. The owner Dashboard uses an Airbnb-inspired design with responsive `@media` queries embedded in `<style>` tags.

## Security — Never Commit Secrets
- **NEVER commit files containing database credentials, API keys, JWT secrets, or passwords to git.**
- Files like `backend/.env`, `cloudrun-service.yaml` are in `.gitignore` — keep them there.
- For GCP Cloud Run, set env vars via `gcloud run services update --update-env-vars` or GCP Secret Manager — not in checked-in YAML files.
- If a secret is accidentally committed, rotate it immediately (change the password/key at the source).

## Deployment
- **Backend**: Dockerized, deployed to GCP Cloud Run (see `cloudbuild.yaml`) or AWS EC2
- **Frontend**: Firebase Hosting (`firebase.json`) or AWS Amplify (`amplify.yml`)
- Allowed CORS origins are hardcoded in `main.py` — update when adding new deployment targets
- **Environment variables on Cloud Run** are managed via `gcloud run services update --update-env-vars` — never hardcode secrets in deployment files.
