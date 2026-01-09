"""
Script to create an admin user
Usage: python create_admin.py
"""
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, UserRole, UserStatus
from auth import get_password_hash

def create_admin():
    db: Session = SessionLocal()
    
    email = input("Enter admin email: ")
    password = input("Enter admin password: ")
    name = input("Enter admin name: ")
    phone = input("Enter admin phone: ")
    
    # Check if admin already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"User with email {email} already exists!")
        db.close()
        return
    
    # Create admin user
    admin = User(
        email=email,
        password_hash=get_password_hash(password),
        name=name,
        phone=phone,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        weekday_quota=0,
        weekend_quota=0,
        weekday_balance=0,
        weekend_balance=0
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    print(f"Admin user created successfully!")
    print(f"Email: {admin.email}")
    print(f"Name: {admin.name}")
    
    db.close()

if __name__ == "__main__":
    create_admin()

