# Vanatvam — Hosting & Database Manual

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Frontend — Firebase Hosting](#2-frontend--firebase-hosting)
3. [Backend — Google Cloud Run](#3-backend--google-cloud-run)
4. [Database — Neon PostgreSQL](#4-database--neon-postgresql)
5. [Image Storage — Google Cloud Storage](#5-image-storage--google-cloud-storage)
6. [Environment Variables](#6-environment-variables)
7. [CI/CD — Cloud Build](#7-cicd--cloud-build)
8. [Deployment Procedures](#8-deployment-procedures)
9. [Monitoring & Logs](#9-monitoring--logs)
10. [Cost Summary](#10-cost-summary)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Infrastructure Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION INFRASTRUCTURE                      │
│                                                                        │
│  ┌─────────────────┐   HTTPS    ┌──────────────────────────────────┐ │
│  │    End Users     │ ─────────► │  Firebase Hosting (Google)       │ │
│  │  (Browser/Phone) │           │  vanatvam-booking-app.web.app    │ │
│  └─────────────────┘            │  React SPA (static files)        │ │
│                                  └──────────────┬───────────────────┘ │
│                                                 │ REST API /api/*     │
│                                                 ▼                     │
│                                  ┌──────────────────────────────────┐ │
│                                  │  Google Cloud Run                 │ │
│                                  │  Project: vanatvam-booking-app   │ │
│                                  │  Region:  asia-south1            │ │
│                                  │  Service: vanatvam-backend       │ │
│                                  │  Image:   FastAPI Python 3.11    │ │
│                                  │  Min instances: 1                │ │
│                                  │  Max instances: 10               │ │
│                                  │  Memory: 512Mi  CPU: 1           │ │
│                                  └──────────────┬───────────────────┘ │
│                                                 │ PostgreSQL           │
│                                                 ▼                     │
│                                  ┌──────────────────────────────────┐ │
│                                  │  Neon PostgreSQL                  │ │
│                                  │  Region: ap-southeast-1 (AWS)    │ │
│                                  │  Database: vanatvam              │ │
│                                  │  Pooler endpoint (connection     │ │
│                                  │  pooling enabled)                │ │
│                                  └──────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Google Cloud Storage — Cottage Images                            │ │
│  │  Project: vanatvam-booking-app  |  Bucket: auto-managed          │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─────────────────────┐   ┌────────────────────────────────────────┐ │
│  │  Artifact Registry  │   │  Cloud Build (CI/CD)                   │ │
│  │  Docker Images      │   │  Trigger: push to main branch          │ │
│  │  asia-south1        │   │  Builds backend + deploys frontend     │ │
│  └─────────────────────┘   └────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend — Firebase Hosting

### Service Details

| Property      | Value                                          |
|---------------|------------------------------------------------|
| Provider      | Google Firebase Hosting                        |
| Project ID    | `vanatvam-booking-app`                         |
| Live URL      | `https://vanatvam-booking-app.web.app`         |
| Alternate URL | `https://vanatvam-booking-app.firebaseapp.com` |
| Plan          | Spark (Free tier)                              |
| Region        | Global CDN                                     |
| Serve dir     | `frontend/build/` (React production build)     |

### Configuration (`frontend/firebase.json`)

```json
{
  "hosting": {
    "public": "build",
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      }
    ]
  }
}
```

**Key settings:**
- All routes rewrite to `/index.html` — required for React Router (SPA)
- Static assets (`/static/js/`, `/static/css/`) cached 1 year (immutable)
- Firebase serves on global CDN — fast worldwide

### Deploy Command

```bash
# Build React app
cd frontend
npm run build

# Deploy to Firebase
npx firebase-tools deploy --only hosting --project vanatvam-booking-app
```

### Firebase Free Tier Limits

| Resource           | Free Limit        |
|--------------------|-------------------|
| Storage            | 10 GB             |
| Data transfer      | 360 MB/day        |
| Custom domain      | Supported         |
| SSL certificate    | Automatic (free)  |

---

## 3. Backend — Google Cloud Run

### Service Details

| Property         | Value                                                                        |
|------------------|------------------------------------------------------------------------------|
| Provider         | Google Cloud Run (Serverless containers)                                     |
| GCP Project      | `vanatvam-booking-app`                                                       |
| Project Number   | `57399834436`                                                                |
| Region           | `asia-south1` (Mumbai)                                                       |
| Service Name     | `vanatvam-backend`                                                           |
| Service URL      | `https://vanatvam-backend-57399834436.asia-south1.run.app`                  |
| Docker Image     | `asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest` |
| Port             | `8000`                                                                       |
| Min Instances    | `1` (always warm, no cold start)                                             |
| Max Instances    | `10`                                                                         |
| Memory           | `512Mi`                                                                      |
| CPU              | `1 vCPU`                                                                     |
| Request Timeout  | `300 seconds`                                                                |
| Concurrency      | `80 requests/instance`                                                       |
| Auth             | Unauthenticated (public, app-level JWT)                                      |

### Runtime Environment Variables

```
DATABASE_URL=postgresql://neondb_owner:***@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require
SECRET_KEY=<jwt-signing-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> ⚠️ These are stored as **plain environment variables** directly on the Cloud Run service (not Secret Manager). To change them, redeploy with updated `--update-env-vars`.

### Startup Probe

```yaml
startupProbe:
  initialDelaySeconds: 30   # Wait 30s before first check
  failureThreshold: 3        # Allow 3 failures before killing
  periodSeconds: 10
  tcpSocket:
    port: 8000
  timeoutSeconds: 10
```

The 30-second initial delay gives FastAPI time to:
1. Import all modules
2. Connect to Neon PostgreSQL
3. Run `Base.metadata.create_all()` (schema sync)
4. Start uvicorn on port 8000

### Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### CORS Allowed Origins

```python
allow_origins = [
    "http://localhost:3000",                     # Local development
    "https://vanatvam-booking.web.app",          # Firebase (legacy)
    "https://vanatvam-booking.firebaseapp.com",  # Firebase (legacy alt)
    "https://vanatvam-booking-app.web.app",      # Firebase (current)
    "https://vanatvam-booking-app.firebaseapp.com",
]
```

### Redeploy Backend Command

```bash
# Build and push image (requires Docker Desktop running)
docker build -t asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest ./backend
docker push asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest

# OR build using Cloud Build (no local Docker needed)
gcloud builds submit ./backend \
  --tag asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --project=vanatvam-booking-app \
  --region=asia-south1

# Deploy to Cloud Run
gcloud run deploy vanatvam-backend \
  --image=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --region=asia-south1 \
  --project=vanatvam-booking-app
```

### Update Environment Variables

```bash
gcloud run services update vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --update-env-vars="KEY=VALUE"
```

---

## 4. Database — Neon PostgreSQL

### Service Details

| Property        | Value                                                            |
|-----------------|------------------------------------------------------------------|
| Provider        | Neon (neon.tech) — Serverless PostgreSQL                        |
| Host Region     | AWS ap-southeast-1 (Singapore)                                  |
| Database Name   | `vanatvam`                                                       |
| Username        | `neondb_owner`                                                   |
| Connection Type | Pooler (PgBouncer) — optimised for serverless                   |
| Pooler Host     | `ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech`   |
| SSL             | Required (`sslmode=require`)                                     |
| Plan            | Free tier                                                        |

### Full Connection String

```
postgresql://neondb_owner:<password>@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require
```

> 🔒 Store the actual password securely. Do not commit it to the repository.

### Why Neon?

- **Serverless**: Database scales to zero when idle (cost-efficient)
- **Connection pooling**: Built-in PgBouncer handles many concurrent connections from Cloud Run instances
- **Branching**: Supports database branches for testing (Git-like)
- **Free tier**: Sufficient for current load

### Database Schema (Tables)

| Table               | Purpose                                           |
|---------------------|---------------------------------------------------|
| `users`             | All system users (admins and owners)              |
| `properties`        | Sanctuaries/properties grouping cottages          |
| `cottages`          | Individual bookable cottage units                 |
| `bookings`          | All booking records with status                   |
| `maintenance_blocks`| Cottage unavailability periods for maintenance    |
| `system_calendar`   | Holiday and peak season date flags                |
| `peak_seasons`      | Named peak season date ranges                     |
| `quota_transactions`| Full audit log of all credit movements            |
| `email_configs`     | SMTP configuration for transactional email        |
| `email_templates`   | HTML/text templates for each email type           |

### SQLAlchemy Connection Pool Settings (`backend/database.py`)

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,         # Maintain 5 persistent connections
    max_overflow=10,     # Allow up to 10 additional connections
    pool_recycle=300,    # Recycle connections every 5 minutes
    pool_pre_ping=True,  # Test connection health before use
)
```

### Schema Management

The backend auto-syncs the schema on startup:
```python
Base.metadata.create_all(bind=engine)
```
This creates any missing tables but does NOT drop existing ones. For schema changes (new columns), use migration scripts (`add_email_columns.py`, `add_email_tables.py`).

### Backup Strategy

Neon Free tier provides:
- Point-in-time restore (limited window on free tier)
- For additional backup, run periodic `pg_dump`:

```bash
pg_dump "postgresql://neondb_owner:<password>@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require" > backup_$(date +%Y%m%d).sql
```

### Accessing the Database (Admin Console)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select the `vanatvam` project
3. Use the SQL editor for direct queries
4. Or connect with `psql`:
```bash
psql "postgresql://neondb_owner:<password>@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require"
```

---

## 5. Image Storage — Google Cloud Storage

| Property     | Value                                  |
|--------------|----------------------------------------|
| Provider     | Google Cloud Storage                   |
| Project      | `vanatvam-booking-app`                 |
| Access       | Managed via Cloud Run service account  |
| Usage        | Cottage images uploaded by admin       |
| Upload API   | `POST /api/admin/cottages/{id}/upload-image` |

Images are uploaded from the admin UI → FastAPI backend → GCS. The resulting public URL is stored in the `cottages.image_url` column.

---

## 6. Environment Variables

### Local Development (`backend/.env`)

```env
DATABASE_URL=postgresql://neondb_owner:<password>@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require
SECRET_KEY=<your-jwt-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend Production (`frontend/.env.production`)

```env
REACT_APP_API_URL=https://vanatvam-backend-57399834436.asia-south1.run.app
```

### Frontend Local Development (`frontend/.env` — create if missing)

```env
REACT_APP_API_URL=http://localhost:8000
```

### Cloud Run Environment (set via gcloud)

All `backend/.env` variables are set directly on the Cloud Run service as environment variables. There is no Secret Manager in use.

---

## 7. CI/CD — Cloud Build

### Pipeline (`cloudbuild.yaml`)

```
Push to main branch
        │
        ▼
Cloud Build triggered
        │
        ├─► Build Backend Docker image
        │   Tag: asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:<SHA>
        │
        ├─► Push to Artifact Registry
        │
        ├─► Deploy to Cloud Run (vanatvam-backend)
        │
        ├─► Build Frontend (npm ci && npm run build)
        │
        └─► Deploy to Firebase Hosting
```

### Artifact Registry

| Property   | Value                                                           |
|------------|-----------------------------------------------------------------|
| Location   | `asia-south1`                                                   |
| Repository | `vanatvam-repo`                                                 |
| Format     | Docker                                                          |
| Full path  | `asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend` |

---

## 8. Deployment Procedures

### Deploy Frontend Only

```bash
cd frontend
npm run build
npx firebase-tools deploy --only hosting --project vanatvam-booking-app
```

### Deploy Backend Only (no local Docker)

```bash
# Build on Cloud Build (uploads code, builds in cloud)
gcloud builds submit ./backend \
  --tag asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --project=vanatvam-booking-app \
  --region=asia-south1

# Deploy new revision
gcloud run deploy vanatvam-backend \
  --image=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --region=asia-south1 \
  --project=vanatvam-booking-app
```

### Update Backend Config (env vars only, no rebuild)

```bash
gcloud run services update vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --update-env-vars="DATABASE_URL=<new-url>,SECRET_KEY=<new-key>"
```

### Reset Admin Password

```bash
cd backend
py reset_password.py
# Edit the script first to set email and new password
```

Or run against the Neon DB directly:
```python
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@vanatvam.com").first()
user.password_hash = get_password_hash("newpassword")
db.commit()
db.close()
```

---

## 9. Monitoring & Logs

### Cloud Run Logs

```bash
# Stream live logs
gcloud run services logs tail vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app

# Read last 50 log entries
gcloud run services logs read vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --limit=50
```

### GCP Console Links

| Resource         | URL |
|------------------|-----|
| Cloud Run        | https://console.cloud.google.com/run?project=vanatvam-booking-app |
| Artifact Registry| https://console.cloud.google.com/artifacts?project=vanatvam-booking-app |
| Cloud Build      | https://console.cloud.google.com/cloud-build/builds?project=vanatvam-booking-app |
| Firebase Console | https://console.firebase.google.com/project/vanatvam-booking-app |

### Health Check

```bash
curl https://vanatvam-backend-57399834436.asia-south1.run.app/
# Expected: {"message": "Vanatvam API is running"}
```

### API Docs (FastAPI Swagger UI)

```
https://vanatvam-backend-57399834436.asia-south1.run.app/docs
```

---

## 10. Cost Summary

| Service              | Tier / Usage               | Estimated Monthly Cost |
|----------------------|----------------------------|------------------------|
| Firebase Hosting     | Spark (Free)               | **Free**               |
| Cloud Run            | Min 1 instance, ~512Mi     | ~$5–8/month            |
| Artifact Registry    | <0.5GB storage             | **Free**               |
| Cloud Build          | <120 min/day               | **Free**               |
| Neon PostgreSQL      | Free tier                  | **Free**               |
| Cloud Storage (images)| Small volume              | ~$0–1/month            |
| **Total**            |                            | **~$5–9/month**        |

> ⚠️ **Billing must be enabled** on GCP project `vanatvam-booking-app` for Cloud Run to function. Firebase Hosting and Neon remain free regardless.

---

## 11. Troubleshooting

### Backend returns 429 "Rate exceeded"

**Cause:** Cloud Run startup probe fires before FastAPI finishes initializing.
**Fix:** Already resolved — startup probe has `initialDelaySeconds: 30`.
If it recurs after a redeploy:
```bash
gcloud run services replace cloudrun-service.yaml --region=asia-south1 --project=vanatvam-booking-app
```

### CORS error in browser

**Symptom:** `No 'Access-Control-Allow-Origin' header`
**Check:**
1. Is the backend URL correct in `frontend/.env.production`?
2. Is the frontend URL in `backend/main.py` `allow_origins` list?
3. Is the backend running? Test: `curl <backend-url>/`

### Backend 500 on startup

**Most likely causes:**
1. `DATABASE_URL` env var missing or wrong → check Cloud Run env vars
2. Neon database is paused (free tier auto-pauses) → visit Neon console to wake it

```bash
# Check current env vars on Cloud Run
gcloud run services describe vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --format="yaml(spec.template.spec.containers[0].env)"
```

### Database connection refused

**Symptom:** `connection to server at "localhost" refused`
**Cause:** `DATABASE_URL` env var not set on Cloud Run — fallback to `localhost:5432` being used.
**Fix:** Set the env var:
```bash
gcloud run services update vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --update-env-vars="DATABASE_URL=postgresql://neondb_owner:<password>@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require"
```

### Firebase deploy fails: "No currently active project"

```bash
npx firebase-tools deploy --only hosting --project vanatvam-booking-app
# Always pass --project explicitly
```

### Cannot login to admin

Admin password can be reset by running `reset_password.py` locally (connects to Neon DB using `backend/.env`):
```bash
cd backend
py reset_password.py
```

---

*Vanatvam Hosting & Database Manual*
*Last updated: May 2026*
