## Railway Deployment Guide (Backend + Frontend)

This guide explains, step by step, how to deploy the **Vanatvam Booking** app to **Railway** using your GitHub repo:

`https://github.com/RohithCZ1982/Vanatvam-Booking`

We will:
- Deploy the **backend (FastAPI)** as one Railway service.
- Deploy the **frontend (React)** as another Railway service.
- Configure environment variables, CORS, and API URLs.

---

## 1. Prerequisites

- A **GitHub** account with the repo pushed:  
  `RohithCZ1982/Vanatvam-Booking`
- A **Railway** account: `https://railway.app`
- Working PostgreSQL URL (can be Railway Postgres or another DB).

Make sure your latest local changes are committed and pushed:

```bash
cd /Users/rohithkumar/Documents/MySites/Vanatvam-Booking
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## 2. Deploy the Backend (FastAPI) on Railway

### 2.1 Create a new Railway project

1. Go to `https://railway.app` and log in.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo**.
4. Select `Vanatvam-Booking` from your GitHub account.

Railway will create a new project and an initial service.

### 2.2 Configure the backend service

In the created service:

1. Open the **Settings** (gear icon) for the service.
2. Set **Root Directory** to:

```text
backend
```

3. Set **Build Command** to:

```bash
pip install -r requirements.txt
```

4. Set **Start Command** to:

```bash

sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

5. Save / redeploy the service.

Railway will now:
- Install Python dependencies from `requirements.txt`.
- Start FastAPI using `uvicorn`.

### 2.3 Configure backend environment variables

In the same backend service:

1. Go to the **Variables** tab.
2. Add the variables you use in `backend/.env`, for example:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/vanatvam
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email configuration (example - adjust to your setup)
SMTP_SERVER=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-user
SMTP_PASSWORD=your-smtp-pass
EMAIL_FROM=no-reply@yourdomain.com
FRONTEND_URL=https://your-frontend-url
```

3. Click **Deploy** (or **Re-deploy**) if needed.

### 2.4 Get the backend URL

After the backend deploys successfully:

1. Click on the service.
2. Look for the **Public URL**, e.g.:

```text
https://vanatvam-backend.up.railway.app
```

We will call this **BACKEND_URL**.

Your API endpoints will be:

- `https://vanatvam-backend.up.railway.app/api/auth/...`
- `https://vanatvam-backend.up.railway.app/api/admin/...`
- `https://vanatvam-backend.up.railway.app/api/owner/...`

---

## 3. Deploy the Frontend (React) on Railway

We will deploy the React build as a static site served by a simple Node server.

### 3.1 Create a frontend service in the same Railway project

1. Open your existing Railway project (the one with the backend).
2. Click **New** → **Service**.
3. Choose **Deploy from GitHub** again.
4. Select the same repo: `Vanatvam-Booking`.

This creates a second service for the frontend.

### 3.2 Configure the frontend service

In the frontend service:

1. Go to **Settings** for this service.
2. Set **Root Directory** to:

```text
frontend
```

3. Set **Build Command** to:

```bash
npm install && npm run build
```

4. Set **Start Command** to:

```bash
npx serve -s build -l $PORT

sh -c "npx serve -s build -l ${PORT:-3000}"
```

> Note: `serve` is a small static file server. Railway will run it on the port it provides.
> If `serve` is not installed, Railway will automatically install it via `npx`.

### 3.3 Configure frontend environment variables

In the frontend service:

1. Go to the **Variables** tab.
2. Add:

```text
REACT_APP_API_URL=https://vanatvam-backend.up.railway.app
```

Replace the URL with your actual **BACKEND_URL** from step 2.4.

3. Save variables and re-deploy if needed.

### 3.4 Get the frontend URL

Once the frontend deploys:

1. Click on the frontend service.
2. Note the **Public URL**, e.g.:

```text
https://vanatvam-frontend.up.railway.app
```

This is the URL you and your users will open in the browser.

---

## 4. Update CORS in Backend for Railway Frontend

Your backend uses CORS middleware in `backend/main.py`.  
Update the allowed origins to include your Railway frontend URL.

Example:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://vanatvam-frontend.up.railway.app",  # Railway frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Steps:

1. Edit `backend/main.py` as above (replace with your actual frontend URL).
2. Commit and push:

```bash
cd /Users/rohithkumar/Documents/MySites/Vanatvam-Booking
git add backend/main.py
git commit -m "Allow Railway frontend origin in CORS"
git push origin main
```

3. Railway will detect the push and automatically redeploy the backend.

---

## 5. Verify the Deployment

### 5.1 Check backend health

From your local machine:

```bash
curl https://vanatvam-backend.up.railway.app/
```

You should see a JSON response similar to:

```json
{ "message": "Vanatvam API is running" }
```

You can also open:

```text
https://vanatvam-backend.up.railway.app/docs
```

to see the FastAPI Swagger UI.

### 5.2 Check frontend

Open the frontend URL in your browser:

```text
https://vanatvam-frontend.up.railway.app
```

Try:
- Registering a user.
- Logging in as admin.
- Creating bookings, etc.

If you see CORS errors in the browser console, double-check:
- `allow_origins` in `backend/main.py`.
- `REACT_APP_API_URL` in frontend service variables.

---

## 6. Common Issues and Fixes

### 6.1 Backend fails to connect to database

Symptoms:
- Errors in Railway logs like **connection refused** or **timeout**.

Checklist:

- Ensure `DATABASE_URL` is **correct** and reachable from Railway.
- If you use Railway Postgres:
  - Add the Postgres plugin in your project.
  - Use the connection string provided by Railway as `DATABASE_URL`.
- Make sure the DB exists and is migrated/initialized.

### 6.2 CORS errors in the browser

Symptoms:
- Network requests in browser fail with **CORS** related messages.

Fix:

- Ensure the backend `allow_origins` includes the exact frontend origin, e.g.:

```python
allow_origins=[
    "https://vanatvam-frontend.up.railway.app",
]
```

Do **not** include a trailing slash and do not include paths.

### 6.3 Frontend cannot reach backend

Symptoms:
- API calls return **404** or **network error**.

Checklist:

- Confirm `REACT_APP_API_URL` matches the backend URL:

```text
REACT_APP_API_URL=https://vanatvam-backend.up.railway.app
```

- Remember that React reads `REACT_APP_...` variables at **build time**:
  - If you change `REACT_APP_API_URL`, you must redeploy the frontend so it rebuilds.

### 6.4 Environment variable changes not applied

If you change variables in Railway:

- Click **Deploy** / **Re-deploy** to restart the service with new vars.
- For frontend, any change to `REACT_APP_...` requires a **rebuild** (`npm run build`), which Railway does automatically on redeploy.

---

## 7. Summary of Key Values to Set

### Backend Service (Root: `backend`)

- **Build Command**:

```bash
pip install -r requirements.txt
```

- **Start Command**:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

- **Important Variables**:
  - `DATABASE_URL`
  - `SECRET_KEY`
  - `ALGORITHM`
  - `ACCESS_TOKEN_EXPIRE_MINUTES`
  - Email-related vars, if used.

### Frontend Service (Root: `frontend`)

- **Build Command**:

```bash
npm install && npm run build
```

- **Start Command**:

```bash
npx serve -s build -l $PORT
```

- **Important Variables**:

```text
REACT_APP_API_URL=https://vanatvam-backend.up.railway.app
```

---

With these steps, you will have:

- **Backend API** running on Railway (FastAPI + PostgreSQL).
- **Frontend React app** also running on Railway, talking to that API.

You can update the app in the future by:

1. Making code changes locally.
2. Committing and pushing to `main` on GitHub.
3. Letting Railway automatically rebuild and redeploy both services.

