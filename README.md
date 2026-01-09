# Vanatvam - Property Booking Management System

A comprehensive booking management system for property owners to reserve cottages with quota-based credits.

## Tech Stack
- **Frontend**: React with TypeScript
- **Backend**: Python (FastAPI)
- **Database**: PostgreSQL

## Project Structure
```
Vanatvam/
├── backend/          # Python FastAPI backend
├── frontend/         # React TypeScript frontend
├── database/         # Database migrations and schema
└── docker-compose.yml
```

## Features

### Admin Module
- Member Management (Activation, Lookup, Deactivation)
- Property & Cottage Management
- Booking Approval Workflow
- Quota Management
- Holiday Configuration

### Owner Module
- Self-Registration & Authentication
- Booking Calendar with Real-Time Availability
- Quota Dashboard & Transaction History
- Trip Management

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ (or use Docker)

### Quick Start with Docker

1. **Start PostgreSQL database:**
```bash
docker-compose up -d
```

2. **Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env with your database credentials

# Start backend server
uvicorn main:app --reload
```

3. **Create Admin User:**
```bash
cd backend
python create_admin.py
# Follow prompts to create admin account
```

4. **Frontend Setup:**
```bash
cd frontend
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# Start frontend
npm start
```

### Manual Database Setup (without Docker)

```bash
# Create database
createdb vanatvam

# Or using psql:
psql -U postgres
CREATE DATABASE vanatvam;
\q
```

The database tables will be created automatically when you start the backend server (using SQLAlchemy's `create_all`).

### Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Swagger UI)

### First Steps

1. Create an admin account using `create_admin.py`
2. Login as admin
3. Create a Property (e.g., "Madhuvana")
4. Add Cottages to the property
5. Register owner accounts (they will be pending)
6. Activate owner accounts from Admin Dashboard
7. Owners can now book cottages!

## Environment Variables

Create `.env` files in both backend and frontend directories:

**backend/.env**
```
DATABASE_URL=postgresql://user:password@localhost:5432/vanatvam
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**frontend/.env**
```
REACT_APP_API_URL=http://localhost:8000
```

