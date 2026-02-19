# 🌿 Vanatvam-Booking — GCP Setup Log

> **Date:** 19 February 2026  
> **Account:** rohith.mps@gmail.com  
> **Project ID:** `vanatvam-booking-app`  
> **Region:** `asia-south1` (Mumbai)  
> **Database:** Neon PostgreSQL (Free Tier)

---

## 1. Install Google Cloud SDK

The SDK was already downloaded and extracted at `/Users/rohithkumar/Documents/GCP/google-cloud-sdk`.

```bash
# Run the install script (quiet mode, with path update and shell completions)
/Users/rohithkumar/Documents/GCP/google-cloud-sdk/install.sh \
  --usage-reporting false \
  --command-completion true \
  --path-update true \
  --quiet

# Reload shell to pick up gcloud in PATH
source ~/.zshrc

# Verify installation
gcloud --version
# Output:
# Google Cloud SDK 557.0.0
# bq 2.1.28
# core 2026.02.17
# gcloud-crc32c 1.0.0
# gsutil 5.35
```

---

## 2. Initialize gcloud & Create Project

```bash
# Initialize gcloud (opens browser for Google account login)
gcloud init
# Signed in as: rohith.mps@gmail.com
# Selected: Create a new project

# Create the GCP project
gcloud projects create vanatvam-booking-app

# Set it as the active project
gcloud config set project vanatvam-booking-app
```

---

## 3. Set Default Region

```bash
# Set default region to Mumbai (asia-south1)
# This auto-enabled compute.googleapis.com API
gcloud config set compute/region asia-south1
gcloud config set run/region asia-south1
```

---

## 4. Enable Billing

Billing was linked manually via browser:
```
https://console.cloud.google.com/billing/linkedaccount?project=vanatvam-booking-app
```

---

## 5. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  --project=vanatvam-booking-app
```

### APIs Enabled:
| API | Name |
|-----|------|
| `run.googleapis.com` | Cloud Run Admin API |
| `sql-component.googleapis.com` | Cloud SQL |
| `sqladmin.googleapis.com` | Cloud SQL Admin API |
| `artifactregistry.googleapis.com` | Artifact Registry API |
| `cloudbuild.googleapis.com` | Cloud Build API |
| `secretmanager.googleapis.com` | Secret Manager API |
| `firebase.googleapis.com` | Firebase Management API |
| `firebasehosting.googleapis.com` | Firebase Hosting API |
| `compute.googleapis.com` | Compute Engine API (auto-enabled) |
| `cloudresourcemanager.googleapis.com` | Cloud Resource Manager API (auto-enabled) |

---

## 6. Create Artifact Registry (Docker Repository)

```bash
gcloud artifacts repositories create vanatvam-repo \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Vanatvam Docker images" \
  --project=vanatvam-booking-app

# Configure Docker to authenticate with GCP Artifact Registry
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

---

## 7. Set Up Neon PostgreSQL (Free Alternative to Cloud SQL)

Instead of Cloud SQL (~$7-10/month), we used **Neon** (free tier, 512MB).

### 7.1 Create Neon Database
- Signed up at: https://console.neon.tech/signup
- **Project name:** vanatvam-booking
- **Region:** Asia (Singapore)
- **Database name:** vanatvam

### 7.2 Connection String
```
postgresql://neondb_owner:npg_KcizJ6GeU2lt@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require
```

---

## 8. Store Secrets in GCP Secret Manager

```bash
# Store Database URL
echo -n "postgresql://neondb_owner:npg_KcizJ6GeU2lt@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require" | \
  gcloud secrets create DATABASE_URL --data-file=- --project=vanatvam-booking-app

# Generate and store JWT Secret Key
python3 -c "import secrets; print(secrets.token_hex(32), end='')" | \
  gcloud secrets create JWT_SECRET_KEY --data-file=- --project=vanatvam-booking-app
```

---

## 9. Grant IAM Permissions

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe vanatvam-booking-app --format="value(projectNumber)")
# Project Number: 57399834436

# Grant Cloud Run service account access to Secret Manager
gcloud projects add-iam-policy-binding vanatvam-booking-app \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" --quiet
```

---

## 10. Code Changes for GCP Deployment

### 10.1 Updated `backend/database.py`
Added connection pool settings for Neon's serverless PostgreSQL:

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

### 10.2 Updated `backend/main.py` — CORS Origins
Added Firebase Hosting domains:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",                         # Local dev
        "https://vanatvam-booking.web.app",              # Firebase Hosting (primary)
        "https://vanatvam-booking.firebaseapp.com",      # Firebase Hosting (alternate)
        "https://vanatvam-booking-app.web.app",          # Firebase Hosting (new project)
        "https://vanatvam-booking-app.firebaseapp.com",  # Firebase Hosting (new project alt)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 10.3 Created `backend/.dockerignore`

```
venv/
__pycache__/
*.pyc
*.pyo
.env
.git/
.DS_Store
*.sh
```

### 10.4 Updated `cloudbuild.yaml`
Removed `--add-cloudsql-instances` from Cloud Run deploy step (using Neon instead of Cloud SQL).

### 10.5 Created `frontend/.env.production`

```env
REACT_APP_API_URL=https://vanatvam-backend-57399834436.asia-south1.run.app
```

### 10.6 Created `frontend/firebase.json`

```json
{
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      }
    ]
  }
}
```

### 10.7 Created `frontend/.firebaserc`

```json
{
  "projects": {
    "default": "vanatvam-booking-app"
  }
}
```

### 10.8 Updated `backend/.env` (local dev)

```env
DATABASE_URL=postgresql://neondb_owner:npg_KcizJ6GeU2lt@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require
SECRET_KEY=j5uaRVtNbg1dmZLKkoETt03a6Z2YLBMWb8QJyzAndpc
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 11. Build & Push Docker Image (via Cloud Build)

```bash
# Build backend image remotely using Cloud Build
# (No Docker Desktop needed — builds in the cloud)
gcloud builds submit \
  --tag=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --project=vanatvam-booking-app \
  ./backend

# Build output:
# Successfully built 8e2c49124afc
# Successfully tagged asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest
# STATUS: SUCCESS
```

---

## 12. Deploy Backend to Cloud Run

```bash
gcloud run deploy vanatvam-backend \
  --image=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,JWT_SECRET_KEY=JWT_SECRET_KEY:latest" \
  --project=vanatvam-booking-app

# Service URL: https://vanatvam-backend-57399834436.asia-south1.run.app
```

### 12.1 Fix Secret Key Mapping
The backend code uses `SECRET_KEY` (not `JWT_SECRET_KEY`), so updated the mapping:

```bash
gcloud run services update vanatvam-backend \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,SECRET_KEY=JWT_SECRET_KEY:latest" \
  --quiet
```

### 12.2 Verify Backend API

```bash
curl -s https://vanatvam-backend-57399834436.asia-south1.run.app/
# {"message":"Vanatvam API is running"}
```

---

## 13. Deploy Frontend to Firebase Hosting

### 13.1 Login to Firebase

```bash
# Firebase login (opens browser for authentication)
npx -y firebase-tools login:ci --interactive
# ✔ Success! Logged in as rohith.mps@gmail.com
```

### 13.2 Add Firebase to GCP Project

```bash
npx -y firebase-tools projects:addfirebase vanatvam-booking-app
# 🎉 Your Firebase project is ready!
```

### 13.3 Build Frontend for Production

```bash
cd frontend
npm run build
# File sizes after gzip:
#   293.3 kB  build/static/js/main.083e673b.js
#   5.14 kB   build/static/css/main.c86f87fe.css
```

### 13.4 Deploy to Firebase Hosting

```bash
npx -y firebase-tools deploy --only hosting --project vanatvam-booking-app
# ✔ Deploy complete!
# Hosting URL: https://vanatvam-booking-app.web.app
```

---

## 14. Rebuild & Redeploy Backend (with updated CORS)

After adding Firebase Hosting domains to CORS, rebuilt and redeployed:

```bash
# Rebuild image (includes updated main.py with new CORS origins)
gcloud builds submit \
  --tag=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --project=vanatvam-booking-app \
  ./backend

# Redeploy to Cloud Run
gcloud run deploy vanatvam-backend \
  --image=asia-south1-docker.pkg.dev/vanatvam-booking-app/vanatvam-repo/backend:latest \
  --region=asia-south1 \
  --project=vanatvam-booking-app \
  --quiet
```

---

## 15. Create Database Tables & Admin User

```bash
cd backend
source venv/bin/activate

# Create all database tables in Neon
DATABASE_URL="postgresql://neondb_owner:npg_KcizJ6GeU2lt@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require" python -c "
from database import Base
from models import User
from sqlalchemy import create_engine, inspect
import os

engine = create_engine(os.environ['DATABASE_URL'])
Base.metadata.create_all(bind=engine)
print('Tables created:', inspect(engine).get_table_names())
"
# Tables: system_calendars, peak_seasons, email_config, email_templates,
#          properties, users, cottages, maintenance_blocks, bookings, quota_transactions

# Create admin user
DATABASE_URL="postgresql://neondb_owner:npg_KcizJ6GeU2lt@ep-plain-king-a1mv0lof-pooler.ap-southeast-1.aws.neon.tech/vanatvam?sslmode=require" python -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, UserRole, UserStatus
from auth import get_password_hash
import os

engine = create_engine(os.environ['DATABASE_URL'])
Session = sessionmaker(bind=engine)
db = Session()

admin = User(
    email='admin@vanatvam.com',
    password_hash=get_password_hash('admin1234'),
    name='Admin',
    phone='999999999',
    role=UserRole.ADMIN,
    status=UserStatus.ACTIVE,
    email_verified=True,
    weekday_quota=0, weekend_quota=0,
    weekday_balance=0, weekend_balance=0
)
db.add(admin)
db.commit()
print(f'Admin created: {admin.email} (ID: {admin.id})')
db.close()
"
```

### Verify Admin Login

```bash
curl -s -X POST https://vanatvam-backend-57399834436.asia-south1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vanatvam.com","password":"admin1234"}'
# {"access_token":"eyJhbG...","token_type":"bearer"}
```

---

## 16. Run App Locally

```bash
# Start backend (port 8000)
cd backend && source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start frontend (port 3000) — in a separate terminal
cd frontend
npm start
```

---

## ✅ Final Configuration Summary

```bash
gcloud config list
# [compute]
# region = asia-south1
# [core]
# account = rohith.mps@gmail.com
# disable_usage_reporting = True
# project = vanatvam-booking-app
# [run]
# region = asia-south1
```

---

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://vanatvam-booking-app.web.app |
| **Backend API** | https://vanatvam-backend-57399834436.asia-south1.run.app |
| **API Docs** | https://vanatvam-backend-57399834436.asia-south1.run.app/docs |
| **Firebase Console** | https://console.firebase.google.com/project/vanatvam-booking-app/overview |
| **GCP Console** | https://console.cloud.google.com/home/dashboard?project=vanatvam-booking-app |

## 🔑 Admin Credentials

| Field | Value |
|-------|-------|
| Email | admin@vanatvam.com |
| Password | admin1234 |

## 💰 Monthly Cost: $0

| Service | Tier | Cost |
|---------|------|------|
| Cloud Run | Free tier (2M req/month) | **Free** |
| Firebase Hosting | Spark plan (10GB/month) | **Free** |
| Neon PostgreSQL | Free tier (512MB) | **Free** |
| Artifact Registry | First 0.5GB | **Free** |
| Secret Manager | First 6 secrets | **Free** |
| Cloud Build | First 120 min/day | **Free** |

---

## 📁 Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `backend/database.py` | Modified | Added connection pool settings for Neon |
| `backend/main.py` | Modified | Added Firebase CORS origins |
| `backend/.dockerignore` | Created | Excludes venv from Docker builds |
| `backend/.env` | Modified | Points to Neon database |
| `frontend/.env.production` | Created | Production API URL (Cloud Run) |
| `frontend/firebase.json` | Created | Firebase Hosting config (SPA rewrites, caching) |
| `frontend/.firebaserc` | Created | Links to vanatvam-booking-app project |
| `cloudbuild.yaml` | Modified | Removed Cloud SQL dependency |

---

*Setup completed on 19 February 2026*
