from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserStatus, UserRole, EmailConfig
from schemas import UserRegister, UserLogin, Token, UserResponse, ForgotPassword, ResetPassword
from auth import verify_password, get_password_hash, create_access_token, get_current_user
from datetime import timedelta, datetime
import secrets
from email_service import send_registration_confirmation_email, send_email_verified_notification
from sqlalchemy.orm import Session

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)
    verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        phone=user_data.phone,
        name=user_data.name,
        password_hash=hashed_password,
        status="pending",
        email_verified=False,
        verification_token=verification_token,
        verification_token_expires=verification_expires
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send confirmation email
    try:
        email_config = db.query(EmailConfig).filter(EmailConfig.enabled == True).first()
        if email_config:
            send_registration_confirmation_email(
                db_user.email, 
                db_user.name, 
                verification_token,
                frontend_url=email_config.frontend_url,
                smtp_server=email_config.smtp_server,
                smtp_port=email_config.smtp_port,
                smtp_username=email_config.smtp_username,
                smtp_password=email_config.smtp_password,
                from_email=email_config.from_email
            )
        else:
            # Fall back to environment variables
            send_registration_confirmation_email(db_user.email, db_user.name, verification_token)
    except Exception as e:
        # Log error but don't fail registration
        print(f"Error sending confirmation email: {str(e)}")
    
    return db_user

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == user_credentials.email).first()
    except Exception as e:
        # If query fails due to missing columns, provide helpful error message
        error_msg = str(e).lower()
        if 'email_verified' in error_msg or 'verification_token' in error_msg or 'column' in error_msg:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database schema needs to be updated. Please run: cd backend && python add_email_columns.py"
            )
        raise
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Admin users can always login (bypass email verification and status checks)
    if user.role == UserRole.ADMIN:
        # For admin users, try to set email_verified if column exists
        try:
            if hasattr(user, 'email_verified'):
                if user.email_verified is None:
                    user.email_verified = True
                    db.commit()
        except (AttributeError, Exception):
            # Column might not exist yet, ignore and allow login
            pass
    else:
        # For non-admin users, check email verification
        # Handle case where email_verified column might not exist yet (backward compatibility)
        try:
            if hasattr(user, 'email_verified'):
                email_verified = user.email_verified
                if email_verified is None or email_verified is False:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Please verify your email address before logging in. Check your inbox for the confirmation link.",
                    )
        except HTTPException:
            raise
        except (AttributeError, Exception):
            # If column doesn't exist in database, allow login for backward compatibility
            # This should be fixed by running the migration script
            pass
        
        # Check if user is active (only active users can login)
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending admin approval. You will receive an email notification once your account is approved.",
            )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(forgot_data: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == forgot_data.email).first()
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If the email exists, a password reset link has been sent."}
    
    # Generate reset token (valid for 1 hour)
    reset_token = secrets.token_urlsafe(32)
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    # In production, send email with reset link
    # For now, return the token (in production, this would be sent via email)
    return {
        "message": "Password reset token generated",
        "reset_token": reset_token,  # Remove this in production - send via email
        "reset_url": f"/reset-password?token={reset_token}"
    }

@router.post("/reset-password")
def reset_password(reset_data: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == reset_data.token).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Update password
    user.password_hash = get_password_hash(reset_data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email address using verification token"""
    from urllib.parse import unquote
    from datetime import timezone
    
    print(f"=== Email Verification Request ===")
    print(f"Token received: {token}")
    print(f"Token length: {len(token)}")
    
    # FastAPI automatically URL-decodes query parameters, but handle both cases
    # Try with the token as-is first (FastAPI should have decoded it)
    user = db.query(User).filter(User.verification_token == token).first()
    print(f"User found with original token: {user is not None}")
    
    # If not found, try URL decoding (in case it wasn't decoded)
    if not user:
        decoded_token = unquote(token)
        print(f"Trying decoded token: {decoded_token[:30]}... (different: {decoded_token != token})")
        if decoded_token != token:
            user = db.query(User).filter(User.verification_token == decoded_token).first()
            print(f"User found with decoded token: {user is not None}")
    
    # Also try double-decoding in case it was encoded twice
    if not user:
        double_decoded = unquote(unquote(token))
        if double_decoded != token and double_decoded != decoded_token:
            print(f"Trying double-decoded token: {double_decoded[:30]}...")
            user = db.query(User).filter(User.verification_token == double_decoded).first()
            print(f"User found with double-decoded token: {user is not None}")
    
    if not user:
        # Check if there are any users with tokens at all
        users_with_tokens = db.query(User).filter(User.verification_token.isnot(None)).all()
        print(f"Total users with tokens in DB: {len(users_with_tokens)}")
        if users_with_tokens:
            sample_token = users_with_tokens[0].verification_token
            print(f"Sample token from DB: {sample_token[:30]}... (length: {len(sample_token)})")
            print(f"Tokens match: {token == sample_token}")
        
        # Log for debugging
        print(f"Verification failed: Token not found. Token received: {token[:20]}... (length: {len(token)})")
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    if user.email_verified:
        return {
            "message": "Email already verified",
            "success": True,
            "email_verified": True
        }
    
    # Handle timezone-aware datetime comparison
    if user.verification_token_expires:
        expires = user.verification_token_expires
        # Make both datetimes timezone-aware for comparison
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        
        if expires < now:
            print(f"Verification failed: Token expired. Expires: {expires}, Now: {now}")
            raise HTTPException(status_code=400, detail="Verification token has expired. Please register again.")
    
    # Mark email as verified
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    # User status remains "pending" until admin approval
    db.commit()
    
    print(f"Email verified successfully for user: {user.email}")
    
    # Send email notification that verification is complete
    try:
        email_config = db.query(EmailConfig).filter(EmailConfig.enabled == True).first()
        if email_config:
            send_email_verified_notification(
                user.email, 
                user.name,
                smtp_server=email_config.smtp_server,
                smtp_port=email_config.smtp_port,
                smtp_username=email_config.smtp_username,
                smtp_password=email_config.smtp_password,
                from_email=email_config.from_email
            )
        else:
            send_email_verified_notification(user.email, user.name)
    except Exception as e:
        print(f"Error sending verification notification email: {str(e)}")
    
    return {
        "message": "Email verified successfully. Your registration is now pending admin approval.",
        "success": True,
        "email_verified": True
    }

