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
    allow_origins=["http://localhost:3000"],  # React dev server
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

