from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@vanatvam.com").first()

if not user:
    print("User not found!")
else:
    user.password_hash = get_password_hash("admin@123")
    db.commit()
    print(f"Password reset successfully for {user.email}")

db.close()
