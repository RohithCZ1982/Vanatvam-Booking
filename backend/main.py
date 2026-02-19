from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, admin, owner

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vanatvam API", version="1.0.0")

# CORS middleware
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

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(owner.router, prefix="/api/owner", tags=["Owner"])

@app.get("/")
def root():
    return {"message": "Vanatvam API is running"}

