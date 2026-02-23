from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid
import shutil
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date, datetime, timedelta
from database import get_db
from models import User, Property, Cottage, Booking, MaintenanceBlock, SystemCalendar, PeakSeason, QuotaTransaction, BookingStatus, UserStatus, UserRole, EmailConfig, EmailTemplate
from schemas import (
    UserResponse, PropertyCreate, PropertyResponse, CottageCreate, CottageResponse,
    MaintenanceBlockCreate, MaintenanceBlockResponse, BookingResponse, MemberActivation,
    QuotaAdjustment, BookingDecision, HolidayDate, PeakSeasonCreate, QuotaTransactionResponse,
    MemberEdit, RevokeBookingRequest, AdminCreate, MemberRejection,
    EmailConfigCreate, EmailConfigResponse, EmailTemplateCreate, EmailTemplateUpdate,
    EmailTemplateResponse, TestEmailRequest
)
from auth import get_current_admin_user, get_password_hash
from email_service import send_approval_email, send_rejection_email, send_booking_approved_email, send_booking_rejected_email
import calendar

router = APIRouter()

# ADM-01: Pending Member Queue
@router.get("/pending-members", response_model=List[UserResponse])
def get_pending_members(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # Only show users who have verified their email and are pending admin approval
    pending_users = db.query(User).filter(
        User.status == UserStatus.PENDING,
        User.email_verified == True
    ).all()
    return pending_users

# ADM-02: Member Activation & Assignment
@router.post("/activate-member")
def activate_member(
    activation: MemberActivation,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == activation.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail="User is not in pending status")
    
    if not user.email_verified:
        raise HTTPException(status_code=400, detail="User email has not been verified yet")
    
    property_obj = db.query(Property).filter(Property.id == activation.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    
    user.status = UserStatus.ACTIVE
    user.property_id = activation.property_id
    user.weekday_quota = activation.weekday_quota
    user.weekend_quota = activation.weekend_quota
    user.weekday_balance = activation.weekday_quota
    user.weekend_balance = activation.weekend_quota
    
    # Create transaction record
    transaction = QuotaTransaction(
        user_id=user.id,
        transaction_type="activation",
        weekday_change=activation.weekday_quota,
        weekend_change=activation.weekend_quota,
        description=f"Account activated with initial quota"
    )
    db.add(transaction)
    db.commit()
    db.refresh(user)
    
    # Send approval email
    try:
        email_config = db.query(EmailConfig).filter(EmailConfig.enabled == True).first()
        if email_config:
            send_approval_email(
                user.email, 
                user.name, 
                property_obj.name, 
                activation.weekday_quota, 
                activation.weekend_quota,
                frontend_url=email_config.frontend_url,
                smtp_server=email_config.smtp_server,
                smtp_port=email_config.smtp_port,
                smtp_username=email_config.smtp_username,
                smtp_password=email_config.smtp_password,
                from_email=email_config.from_email
            )
        else:
            send_approval_email(user.email, user.name, property_obj.name, activation.weekday_quota, activation.weekend_quota)
    except Exception as e:
        print(f"Error sending approval email: {str(e)}")
    
    return user

@router.post("/reject-member")
def reject_member(
    rejection: MemberRejection,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Reject a pending member registration"""
    user = db.query(User).filter(User.id == rejection.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != UserStatus.PENDING:
        raise HTTPException(status_code=400, detail="User is not in pending status")
    
    # Update user status to indicate rejection (we can use SUSPENDED or keep as PENDING but mark somehow)
    # For now, we'll delete the user or mark them as rejected
    # Since we don't have a rejected status, we'll delete the user record
    user_email = user.email
    user_name = user.name
    rejection_reason = rejection.reason
    
    # Delete the user record
    db.delete(user)
    db.commit()
    
    # Send rejection email
    try:
        email_config = db.query(EmailConfig).filter(EmailConfig.enabled == True).first()
        if email_config:
            send_rejection_email(
                user_email, 
                user_name, 
                rejection_reason,
                smtp_server=email_config.smtp_server,
                smtp_port=email_config.smtp_port,
                smtp_username=email_config.smtp_username,
                smtp_password=email_config.smtp_password,
                from_email=email_config.from_email
            )
        else:
            send_rejection_email(user_email, user_name, rejection_reason)
    except Exception as e:
        print(f"Error sending rejection email: {str(e)}")
    
    return {"message": "Member registration rejected and notification sent"}

# ADM-03: Member Lookup & History
@router.get("/member/{user_id}")
def get_member_details(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    transactions = db.query(QuotaTransaction).filter(QuotaTransaction.user_id == user_id).all()
    
    return {
        "user": user,
        "bookings": bookings,
        "transactions": transactions
    }

@router.get("/search-members")
def search_members(
    query: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # Search by user fields and property name
    users = db.query(User).join(
        Property, User.property_id == Property.id, isouter=True
    ).filter(
        or_(
            User.name.ilike(f"%{query}%"),
            User.email.ilike(f"%{query}%"),
            User.phone.ilike(f"%{query}%"),
            Property.name.ilike(f"%{query}%")
        )
    ).all()
    return users

@router.get("/all-members", response_model=List[UserResponse])
def get_all_members(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all active owner members (excluding admins) with their property information"""
    users = db.query(User).filter(
        User.status == UserStatus.ACTIVE,
        User.role == UserRole.OWNER
    ).all()
    return users

# Edit Member Credentials
@router.put("/member/{user_id}")
def edit_member(
    user_id: int,
    member_data: MemberEdit,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if member_data.name is not None:
        user.name = member_data.name
    if member_data.email is not None:
        # Check if email is already taken by another user
        existing = db.query(User).filter(User.email == member_data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = member_data.email
    if member_data.phone is not None:
        user.phone = member_data.phone
    if member_data.password is not None:
        user.password_hash = get_password_hash(member_data.password)
    
    db.commit()
    db.refresh(user)
    return user

# ADM-04: Manual Quota Adjustment
@router.post("/adjust-quota")
def adjust_quota(
    adjustment: QuotaAdjustment,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == adjustment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.weekday_balance += adjustment.weekday_change
    user.weekend_balance += adjustment.weekend_change
    
    # Ensure balances don't go negative
    user.weekday_balance = max(0, user.weekday_balance)
    user.weekend_balance = max(0, user.weekend_balance)
    
    transaction = QuotaTransaction(
        user_id=user.id,
        transaction_type="manual_adjustment",
        weekday_change=adjustment.weekday_change,
        weekend_change=adjustment.weekend_change,
        description=adjustment.description or "Manual quota adjustment by admin"
    )
    db.add(transaction)
    db.commit()
    db.refresh(user)
    return user

@router.get("/quota-adjustments")
def get_quota_adjustments(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all manual quota adjustments"""
    adjustments = db.query(QuotaTransaction).filter(
        QuotaTransaction.transaction_type == "manual_adjustment"
    ).order_by(QuotaTransaction.created_at.desc()).all()
    
    result = []
    for adj in adjustments:
        user = db.query(User).filter(User.id == adj.user_id).first()
        property_obj = None
        if user and user.property_id:
            property_obj = db.query(Property).filter(Property.id == user.property_id).first()
        
        result.append({
            "id": adj.id,
            "user_id": adj.user_id,
            "user_name": user.name if user else "Unknown",
            "property_name": property_obj.name if property_obj else "No Property",
            "weekday_change": adj.weekday_change,
            "weekend_change": adj.weekend_change,
            "description": adj.description,
            "created_at": adj.created_at
        })
    
    return result

# ADM-05: Member Deactivation
@router.post("/deactivate-member/{user_id}")
def deactivate_member(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot deactivate admin users")
    
    user.status = UserStatus.SUSPENDED
    db.commit()
    db.refresh(user)
    return user

# Reactivate Suspended Member
@router.post("/reactivate-member/{user_id}")
def reactivate_member(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != UserStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="User is not suspended")
    
    user.status = UserStatus.ACTIVE
    db.commit()
    db.refresh(user)
    return user

# Delete Member and Related Records
@router.delete("/member/{user_id}")
def delete_member(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    user_name = user.name
    
    # Delete related records in correct order (respecting foreign key constraints)
    # 1. Delete quota transactions (references user_id)
    db.query(QuotaTransaction).filter(QuotaTransaction.user_id == user_id).delete()
    
    # 2. Delete bookings (references user_id)
    db.query(Booking).filter(Booking.user_id == user_id).delete()
    
    # 3. Delete the user
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user_name} and all related records (bookings, transactions) deleted successfully"}

# ADM-06: Property Management
@router.post("/properties", response_model=PropertyResponse)
def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_property = Property(**property_data.dict())
    db.add(db_property)
    db.commit()
    db.refresh(db_property)
    return db_property

@router.get("/properties", response_model=List[PropertyResponse])
def get_properties(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(Property).all()

@router.put("/properties/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_property = db.query(Property).filter(Property.id == property_id).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    for key, value in property_data.dict().items():
        setattr(db_property, key, value)
    
    db.commit()
    db.refresh(db_property)
    return db_property

# ADM-07: Cottage Inventory
@router.post("/cottages", response_model=CottageResponse)
def create_cottage(
    cottage_data: CottageCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_cottage = Cottage(**cottage_data.dict())
    db.add(db_cottage)
    db.commit()
    db.refresh(db_cottage)
    return db_cottage

@router.get("/cottages", response_model=List[CottageResponse])
def get_cottages(
    property_id: int = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    query = db.query(Cottage)
    if property_id:
        query = query.filter(Cottage.property_id == property_id)
    return query.all()

@router.put("/cottages/{cottage_id}", response_model=CottageResponse)
def update_cottage(
    cottage_id: int,
    cottage_data: CottageCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_cottage = db.query(Cottage).filter(Cottage.id == cottage_id).first()
    if not db_cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    for key, value in cottage_data.dict().items():
        setattr(db_cottage, key, value)
    
    db.commit()
    db.refresh(db_cottage)
    return db_cottage

# Cottage Image Upload
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "cottages")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/cottages/{cottage_id}/upload-image")
async def upload_cottage_image(
    cottage_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_cottage = db.query(Cottage).filter(Cottage.id == cottage_id).first()
    if not db_cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
    
    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Delete old image if exists
    if db_cottage.image_url:
        old_filename = db_cottage.image_url.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"cottage_{cottage_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update database
    image_url = f"/uploads/cottages/{filename}"
    db_cottage.image_url = image_url
    db.commit()
    db.refresh(db_cottage)
    
    return {"image_url": image_url, "message": "Image uploaded successfully"}

@router.delete("/cottages/{cottage_id}/image")
def delete_cottage_image(
    cottage_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    db_cottage = db.query(Cottage).filter(Cottage.id == cottage_id).first()
    if not db_cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    if db_cottage.image_url:
        old_filename = db_cottage.image_url.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
        db_cottage.image_url = None
        db.commit()
        db.refresh(db_cottage)
    
    return {"message": "Image deleted successfully"}

# ADM-08: Maintenance Blocking
@router.post("/maintenance-blocks", response_model=MaintenanceBlockResponse)
def create_maintenance_block(
    block_data: MaintenanceBlockCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # Check for overlapping bookings and reject pending ones
    pending_bookings = db.query(Booking).filter(
        Booking.cottage_id == block_data.cottage_id,
        Booking.status == BookingStatus.PENDING,
        Booking.check_in <= block_data.end_date,
        Booking.check_out >= block_data.start_date
    ).all()
    
    for booking in pending_bookings:
        booking.status = BookingStatus.REJECTED
        # Refund credits
        user = db.query(User).filter(User.id == booking.user_id).first()
        if user:
            user.weekday_balance += booking.weekday_credits_used
            user.weekend_balance += booking.weekend_credits_used
    
    db_block = MaintenanceBlock(**block_data.dict())
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block

@router.get("/maintenance-blocks", response_model=List[MaintenanceBlockResponse])
def get_maintenance_blocks(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    return db.query(MaintenanceBlock).all()

@router.get("/maintenance-blocks/{block_id}/bookings")
def get_maintenance_block_bookings(
    block_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all bookings that overlap with a maintenance block date range"""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")
    
    # Find bookings that overlap with maintenance block dates
    bookings = db.query(Booking).filter(
        Booking.cottage_id == block.cottage_id,
        Booking.check_in < block.end_date,
        Booking.check_out > block.start_date,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).all()
    
    result = []
    for booking in bookings:
        user = db.query(User).filter(User.id == booking.user_id).first()
        cottage = db.query(Cottage).filter(Cottage.id == booking.cottage_id).first()
        property_obj = None
        if cottage and cottage.property_id:
            property_obj = db.query(Property).filter(Property.id == cottage.property_id).first()
        
        result.append({
            "id": booking.id,
            "user_id": booking.user_id,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "property_name": property_obj.name if property_obj else "No Property",
            "cottage_id": booking.cottage_id,
            "cottage_name": cottage.cottage_id if cottage else "Unknown",
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "weekday_credits_used": booking.weekday_credits_used,
            "weekend_credits_used": booking.weekend_credits_used,
            "status": booking.status,
            "created_at": booking.created_at
        })
    
    return result

@router.put("/maintenance-blocks/{block_id}", response_model=MaintenanceBlockResponse)
def update_maintenance_block(
    block_id: int,
    block_data: MaintenanceBlockCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")
    
    # Check for overlapping bookings and reject pending ones
    # Get existing bookings that overlap with the new date range
    pending_bookings = db.query(Booking).filter(
        Booking.cottage_id == block_data.cottage_id,
        Booking.status == BookingStatus.PENDING,
        Booking.check_in <= block_data.end_date,
        Booking.check_out >= block_data.start_date
    ).all()
    
    for booking in pending_bookings:
        booking.status = BookingStatus.REJECTED
        # Refund credits
        user = db.query(User).filter(User.id == booking.user_id).first()
        if user:
            user.weekday_balance += booking.weekday_credits_used
            user.weekend_balance += booking.weekend_credits_used
    
    # Update block
    block.cottage_id = block_data.cottage_id
    block.start_date = block_data.start_date
    block.end_date = block_data.end_date
    block.reason = block_data.reason
    
    db.commit()
    db.refresh(block)
    return block

@router.delete("/maintenance-blocks/{block_id}")
def delete_maintenance_block(
    block_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")
    
    db.delete(block)
    db.commit()
    return {"message": "Maintenance block deleted successfully"}

# ADM-09: Inventory Health View
@router.get("/inventory-health")
def get_inventory_health(
    start_date: date,
    end_date: date,
    property_id: int = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    query = db.query(Cottage)
    if property_id:
        query = query.filter(Cottage.property_id == property_id)
    cottages = query.all()
    
    result = []
    current_date = start_date
    while current_date <= end_date:
        for cottage in cottages:
            # Check if booked
            booking = db.query(Booking).filter(
                Booking.cottage_id == cottage.id,
                Booking.check_in <= current_date,
                Booking.check_out > current_date,
                Booking.status == BookingStatus.CONFIRMED
            ).first()
            
            # Check if maintenance
            maintenance = db.query(MaintenanceBlock).filter(
                MaintenanceBlock.cottage_id == cottage.id,
                MaintenanceBlock.start_date <= current_date,
                MaintenanceBlock.end_date >= current_date
            ).first()
            
            status = "available"
            if maintenance:
                status = "maintenance"
            elif booking:
                status = "booked"
            
            # Get property name
            property_name = None
            if cottage.property_id:
                property = db.query(Property).filter(Property.id == cottage.property_id).first()
                property_name = property.name if property else None
            
            result.append({
                "date": current_date,
                "cottage_id": cottage.id,
                "cottage_name": cottage.cottage_id,
                "property_id": cottage.property_id,
                "property_name": property_name,
                "status": status
            })
        
        # Move to next day
        current_date += timedelta(days=1)
    
    return result

# ADM-10: The Approval Queue
@router.get("/approval-queue")
def get_approval_queue(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    pending_bookings = db.query(Booking).filter(
        Booking.status == BookingStatus.PENDING
    ).order_by(Booking.created_at).all()
    
    result = []
    for booking in pending_bookings:
        user = db.query(User).filter(User.id == booking.user_id).first()
        cottage = db.query(Cottage).filter(Cottage.id == booking.cottage_id).first()
        property_obj = None
        if cottage and cottage.property_id:
            property_obj = db.query(Property).filter(Property.id == cottage.property_id).first()
        
        result.append({
            "id": booking.id,
            "user_id": booking.user_id,
            "user_name": user.name if user else "Unknown",
            "property_name": property_obj.name if property_obj else "No Property",
            "cottage_id": booking.cottage_id,
            "cottage_name": cottage.cottage_id if cottage else "Unknown",
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "weekday_credits_used": booking.weekday_credits_used,
            "weekend_credits_used": booking.weekend_credits_used,
            "created_at": booking.created_at,
            "status": booking.status
        })
    
    return result

# ADM-11: Decision Workflow
@router.post("/booking-decision")
def make_booking_decision(
    decision: BookingDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    booking = db.query(Booking).filter(Booking.id == decision.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if decision.action == "approve":
        booking.status = BookingStatus.CONFIRMED
        booking.decision_notes = decision.notes
        # Credits already deducted during request creation
    elif decision.action == "reject":
        booking.status = BookingStatus.REJECTED
        booking.decision_notes = decision.notes
        # Refund credits
        user = db.query(User).filter(User.id == booking.user_id).first()
        if user:
            user.weekday_balance += booking.weekday_credits_used
            user.weekend_balance += booking.weekend_credits_used
            
            transaction = QuotaTransaction(
                user_id=user.id,
                transaction_type="refund",
                weekday_change=booking.weekday_credits_used,
                weekend_change=booking.weekend_credits_used,
                booking_id=booking.id,
                description="Booking rejected - quota refunded"
            )
            db.add(transaction)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")
    
    db.commit()
    db.refresh(booking)
    
    # Send email notification to the owner
    try:
        booking_user = db.query(User).filter(User.id == booking.user_id).first()
        cottage = db.query(Cottage).filter(Cottage.id == booking.cottage_id).first()
        property_obj = None
        if cottage and cottage.property_id:
            property_obj = db.query(Property).filter(Property.id == cottage.property_id).first()
        
        email_config = db.query(EmailConfig).filter(EmailConfig.enabled == True).first()
        email_kwargs = {}
        if email_config:
            email_kwargs = {
                "smtp_server": email_config.smtp_server,
                "smtp_port": email_config.smtp_port,
                "smtp_username": email_config.smtp_username,
                "smtp_password": email_config.smtp_password,
                "from_email": email_config.from_email,
                "frontend_url": email_config.frontend_url,
            }
        
        if booking_user and cottage:
            if decision.action == "approve":
                template = db.query(EmailTemplate).filter(EmailTemplate.template_type == "booking_approved").first()
                if template:
                    email_kwargs["subject_template"] = template.subject
                    email_kwargs["html_template"] = template.html_body
                    email_kwargs["text_template"] = template.text_body
                    
                send_booking_approved_email(
                    email=booking_user.email,
                    name=booking_user.name,
                    cottage_name=cottage.cottage_id,
                    property_name=property_obj.name if property_obj else "Unknown",
                    check_in=str(booking.check_in),
                    check_out=str(booking.check_out),
                    weekday_credits=booking.weekday_credits_used,
                    weekend_credits=booking.weekend_credits_used,
                    notes=decision.notes,
                    **email_kwargs
                )
            elif decision.action == "reject":
                send_booking_rejected_email(
                    email=booking_user.email,
                    name=booking_user.name,
                    cottage_name=cottage.cottage_id,
                    property_name=property_obj.name if property_obj else "Unknown",
                    check_in=str(booking.check_in),
                    check_out=str(booking.check_out),
                    weekday_credits=booking.weekday_credits_used,
                    weekend_credits=booking.weekend_credits_used,
                    notes=decision.notes,
                    **email_kwargs
                )
    except Exception as e:
        print(f"Error sending booking decision email: {str(e)}")
    
    return booking

# ADM-12: Emergency Revocation
@router.post("/revoke-booking/{booking_id}")
def revoke_booking(
    booking_id: int,
    request: RevokeBookingRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    
    reason = request.reason or "Booking revoked by admin"
    booking.status = BookingStatus.CANCELLED
    booking.decision_notes = reason
    
    # Full refund
    user = db.query(User).filter(User.id == booking.user_id).first()
    if user:
        user.weekday_balance += booking.weekday_credits_used
        user.weekend_balance += booking.weekend_credits_used
        
        transaction = QuotaTransaction(
            user_id=user.id,
            transaction_type="refund",
            weekday_change=booking.weekday_credits_used,
            weekend_change=booking.weekend_credits_used,
            booking_id=booking.id,
            description=f"Booking revoked by admin - {reason}"
        )
        db.add(transaction)
    
    db.commit()
    db.refresh(booking)
    return booking

@router.post("/revoke-maintenance-bookings/{block_id}")
def revoke_all_maintenance_bookings(
    block_id: int,
    request: RevokeBookingRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Revoke all bookings that overlap with a maintenance block"""
    block = db.query(MaintenanceBlock).filter(MaintenanceBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Maintenance block not found")
    
    reason = request.reason or "Booking revoked due to maintenance block"
    
    # Find bookings that overlap with maintenance block dates
    bookings = db.query(Booking).filter(
        Booking.cottage_id == block.cottage_id,
        Booking.check_in < block.end_date,
        Booking.check_out > block.start_date,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ).all()
    
    revoked_count = 0
    for booking in bookings:
        if booking.status == BookingStatus.CANCELLED:
            continue
            
        booking.status = BookingStatus.CANCELLED
        booking.decision_notes = reason
        
        # Full refund
        user = db.query(User).filter(User.id == booking.user_id).first()
        if user:
            user.weekday_balance += booking.weekday_credits_used
            user.weekend_balance += booking.weekend_credits_used
            
            transaction = QuotaTransaction(
                user_id=user.id,
                transaction_type="refund",
                weekday_change=booking.weekday_credits_used,
                weekend_change=booking.weekend_credits_used,
                booking_id=booking.id,
                description=f"{reason} - quota refunded"
            )
            db.add(transaction)
            revoked_count += 1
    
    db.commit()
    return {"message": f"Successfully revoked {revoked_count} booking(s)", "revoked_count": revoked_count}

# ADM-13: Admin Override Booking
@router.post("/override-booking")
def create_override_booking(
    booking_data: dict,  # Will accept full booking details
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # Create booking bypassing standard checks
    db_booking = Booking(
        user_id=booking_data["user_id"],
        cottage_id=booking_data["cottage_id"],
        check_in=booking_data["check_in"],
        check_out=booking_data["check_out"],
        status=BookingStatus.CONFIRMED,
        weekday_credits_used=booking_data.get("weekday_credits_used", 0),
        weekend_credits_used=booking_data.get("weekend_credits_used", 0)
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

# ADM-14: Holiday Configuration
@router.get("/holidays")
def get_holidays(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all configured holidays"""
    holidays = db.query(SystemCalendar).filter(
        SystemCalendar.is_holiday == True
    ).order_by(SystemCalendar.date).all()
    return [
        {
            "date": str(holiday.date),
            "holiday_name": holiday.holiday_name or "Holiday"
        }
        for holiday in holidays
    ]

@router.post("/holidays")
def set_holidays(
    holidays: List[HolidayDate],
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    created = []
    for holiday in holidays:
        existing = db.query(SystemCalendar).filter(SystemCalendar.date == holiday.date).first()
        if existing:
            existing.is_holiday = True
            existing.holiday_name = holiday.holiday_name
        else:
            calendar_entry = SystemCalendar(
                date=holiday.date,
                is_holiday=True,
                holiday_name=holiday.holiday_name
            )
            db.add(calendar_entry)
            created.append(calendar_entry)
    
    db.commit()
    return {"message": f"Set {len(holidays)} holiday dates", "holidays": created}

@router.delete("/holidays/{date}")
def delete_holiday(
    date: date,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete a holiday by date"""
    calendar_entry = db.query(SystemCalendar).filter(
        SystemCalendar.date == date,
        SystemCalendar.is_holiday == True
    ).first()
    
    if not calendar_entry:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # If it's only a holiday (not peak season), delete the entry
    # Otherwise, just remove the holiday flag
    if calendar_entry.is_peak_season:
        calendar_entry.is_holiday = False
        calendar_entry.holiday_name = None
    else:
        db.delete(calendar_entry)
    
    db.commit()
    return {"message": f"Holiday on {date} deleted successfully"}

@router.put("/holidays/{date}")
def update_holiday(
    date: date,
    holiday_data: HolidayDate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update a holiday"""
    calendar_entry = db.query(SystemCalendar).filter(
        SystemCalendar.date == date,
        SystemCalendar.is_holiday == True
    ).first()
    
    if not calendar_entry:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # If date is being changed, need to handle it
    if holiday_data.date != date:
        # Create new entry with new date
        new_entry = db.query(SystemCalendar).filter(
            SystemCalendar.date == holiday_data.date
        ).first()
        
        if new_entry:
            new_entry.is_holiday = True
            new_entry.holiday_name = holiday_data.holiday_name
        else:
            new_entry = SystemCalendar(
                date=holiday_data.date,
                is_holiday=True,
                holiday_name=holiday_data.holiday_name
            )
            db.add(new_entry)
        
        # Remove old entry if not peak season
        if not calendar_entry.is_peak_season:
            db.delete(calendar_entry)
        else:
            calendar_entry.is_holiday = False
            calendar_entry.holiday_name = None
    else:
        # Just update the name
        calendar_entry.holiday_name = holiday_data.holiday_name
    
    db.commit()
    return {"message": "Holiday updated successfully"}

# ADM-15: Peak Season Definition
@router.get("/peak-seasons")
def get_peak_seasons(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all configured peak seasons"""
    peak_seasons = db.query(PeakSeason).order_by(PeakSeason.start_date).all()
    return [
        {
            "id": season.id,
            "name": season.name,
            "start_date": str(season.start_date),
            "end_date": str(season.end_date),
            "created_at": season.created_at
        }
        for season in peak_seasons
    ]

@router.post("/peak-seasons", response_model=PeakSeasonCreate)
def create_peak_season(
    peak_season: PeakSeasonCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    # Mark all dates in range as peak season
    current_date = peak_season.start_date
    while current_date <= peak_season.end_date:
        existing = db.query(SystemCalendar).filter(SystemCalendar.date == current_date).first()
        if existing:
            existing.is_peak_season = True
        else:
            calendar_entry = SystemCalendar(
                date=current_date,
                is_peak_season=True
            )
            db.add(calendar_entry)
        
        current_date += timedelta(days=1)
    
    # Also create peak season record
    db_peak_season = PeakSeason(**peak_season.dict())
    db.add(db_peak_season)
    db.commit()
    db.refresh(db_peak_season)
    return db_peak_season

@router.put("/peak-seasons/{season_id}")
def update_peak_season(
    season_id: int,
    peak_season: PeakSeasonCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update a peak season"""
    db_season = db.query(PeakSeason).filter(PeakSeason.id == season_id).first()
    if not db_season:
        raise HTTPException(status_code=404, detail="Peak season not found")
    
    # Remove old dates from SystemCalendar
    old_start = db_season.start_date
    old_end = db_season.end_date
    current_date = old_start
    while current_date <= old_end:
        calendar_entry = db.query(SystemCalendar).filter(
            SystemCalendar.date == current_date
        ).first()
        if calendar_entry:
            # Only remove peak season flag if it's not also a holiday
            if not calendar_entry.is_holiday:
                db.delete(calendar_entry)
            else:
                calendar_entry.is_peak_season = False
        current_date += timedelta(days=1)
    
    # Update peak season record
    db_season.name = peak_season.name
    db_season.start_date = peak_season.start_date
    db_season.end_date = peak_season.end_date
    
    # Mark new dates as peak season
    current_date = peak_season.start_date
    while current_date <= peak_season.end_date:
        existing = db.query(SystemCalendar).filter(SystemCalendar.date == current_date).first()
        if existing:
            existing.is_peak_season = True
        else:
            calendar_entry = SystemCalendar(
                date=current_date,
                is_peak_season=True
            )
            db.add(calendar_entry)
        current_date += timedelta(days=1)
    
    db.commit()
    db.refresh(db_season)
    return db_season

@router.delete("/peak-seasons/{season_id}")
def delete_peak_season(
    season_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete a peak season"""
    db_season = db.query(PeakSeason).filter(PeakSeason.id == season_id).first()
    if not db_season:
        raise HTTPException(status_code=404, detail="Peak season not found")
    
    # Remove dates from SystemCalendar
    current_date = db_season.start_date
    while current_date <= db_season.end_date:
        calendar_entry = db.query(SystemCalendar).filter(
            SystemCalendar.date == current_date
        ).first()
        if calendar_entry:
            # Only remove peak season flag if it's not also a holiday
            if not calendar_entry.is_holiday:
                db.delete(calendar_entry)
            else:
                calendar_entry.is_peak_season = False
        current_date += timedelta(days=1)
    
    db.delete(db_season)
    db.commit()
    return {"message": "Peak season deleted successfully"}

# Calendar View - All Bookings
@router.get("/bookings-calendar")
def get_bookings_calendar(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all bookings with cottage names for calendar display"""
    from sqlalchemy.orm import joinedload
    
    bookings = db.query(Booking).options(
        joinedload(Booking.cottage).joinedload(Cottage.property),
        joinedload(Booking.user)
    ).filter(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING])
    ).all()
    
    result = []
    for booking in bookings:
        result.append({
            "id": booking.id,
            "cottage_name": booking.cottage.cottage_id if booking.cottage else "Unknown",
            "cottage_id": booking.cottage.id if booking.cottage else None,
            "check_in": str(booking.check_in),
            "check_out": str(booking.check_out),
            "status": booking.status.value,
            "user_name": booking.user.name if booking.user else "Unknown",
            "property_name": booking.cottage.property.name if booking.cottage and booking.cottage.property else None
        })
    
    return result

# Get all rejected and revoked bookings
@router.get("/rejected-bookings")
def get_rejected_bookings(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all rejected and cancelled (revoked) bookings with owner, sanctuary, and cottage details"""
    from sqlalchemy.orm import joinedload
    
    bookings = db.query(Booking).options(
        joinedload(Booking.cottage).joinedload(Cottage.property),
        joinedload(Booking.user)
    ).filter(
        Booking.status.in_([BookingStatus.REJECTED, BookingStatus.CANCELLED])
    ).order_by(Booking.created_at.desc()).all()
    
    result = []
    for booking in bookings:
        result.append({
            "id": booking.id,
            "user_name": booking.user.name if booking.user else "Unknown",
            "property_name": booking.cottage.property.name if booking.cottage and booking.cottage.property else "No Sanctuary",
            "cottage_name": booking.cottage.cottage_id if booking.cottage else "Unknown",
            "check_in": str(booking.check_in),
            "check_out": str(booking.check_out),
            "status": booking.status.value,
            "created_at": booking.created_at,
            "decision_notes": booking.decision_notes
        })
    
    return result

# ADM-16: Global Quota Reset Trigger
@router.post("/reset-all-quotas")
def reset_all_quotas(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    users = db.query(User).filter(User.status == UserStatus.ACTIVE).all()
    
    for user in users:
        # Reset balances to quotas
        user.weekday_balance = user.weekday_quota
        user.weekend_balance = user.weekend_quota
        
        transaction = QuotaTransaction(
            user_id=user.id,
            transaction_type="reset",
            weekday_change=user.weekday_quota,
            weekend_change=user.weekend_quota,
            description="Annual quota reset"
        )
        db.add(transaction)
    
    db.commit()
    return {"message": f"Reset quotas for {len(users)} users"}

# Audit Trail - Get all system activities
@router.get("/audit-trail")
def get_audit_trail(
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get comprehensive audit trail including transactions, bookings, activations, etc."""
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_
    
    audit_entries = []
    
    # Get all quota transactions
    transaction_query = db.query(QuotaTransaction).options(
        joinedload(QuotaTransaction.user)
    )
    if start_date:
        transaction_query = transaction_query.filter(QuotaTransaction.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        transaction_query = transaction_query.filter(QuotaTransaction.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    transactions = transaction_query.order_by(QuotaTransaction.created_at.desc()).all()
    
    for trans in transactions:
        user = trans.user
        property_name = "N/A"
        if user and user.property_id:
            property_obj = db.query(Property).filter(Property.id == user.property_id).first()
            property_name = property_obj.name if property_obj else "N/A"
        
        audit_entries.append({
            "id": trans.id,
            "timestamp": trans.created_at.isoformat() if trans.created_at else datetime.now().isoformat(),
            "type": "Transaction",
            "action": trans.transaction_type.upper(),
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "property_name": property_name,
            "description": trans.description or f"{trans.transaction_type} transaction",
            "weekday_change": trans.weekday_change,
            "weekend_change": trans.weekend_change,
            "booking_id": trans.booking_id,
            "details": f"Weekday: {trans.weekday_change:+d}, Weekend: {trans.weekend_change:+d}"
        })
    
    # Get all bookings with status changes (rejected, cancelled, confirmed)
    booking_query = db.query(Booking).options(
        joinedload(Booking.user),
        joinedload(Booking.cottage).joinedload(Cottage.property)
    ).filter(
        Booking.status.in_([BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.CONFIRMED])
    )
    if start_date:
        booking_query = booking_query.filter(Booking.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        booking_query = booking_query.filter(Booking.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    bookings = booking_query.order_by(Booking.created_at.desc()).all()
    
    for booking in bookings:
        user = booking.user
        cottage = booking.cottage
        property_name = cottage.property.name if cottage and cottage.property else "N/A"
        
        action_map = {
            BookingStatus.REJECTED: "Booking Rejected",
            BookingStatus.CANCELLED: "Booking Revoked",
            BookingStatus.CONFIRMED: "Booking Confirmed"
        }
        
        timestamp = booking.updated_at or booking.created_at
        audit_entries.append({
            "id": booking.id,
            "timestamp": timestamp.isoformat() if timestamp else datetime.now().isoformat(),
            "type": "Booking",
            "action": action_map.get(booking.status, booking.status.value.upper()),
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "property_name": property_name,
            "description": booking.decision_notes or f"Booking {booking.status.value}",
            "weekday_change": -booking.weekday_credits_used if booking.status == BookingStatus.CONFIRMED else booking.weekday_credits_used,
            "weekend_change": -booking.weekend_credits_used if booking.status == BookingStatus.CONFIRMED else booking.weekend_credits_used,
            "booking_id": booking.id,
            "details": f"Cottage: {cottage.cottage_id if cottage else 'Unknown'}, Dates: {booking.check_in} to {booking.check_out}"
        })
    
    # Get member activations (from transactions with type "activation")
    activation_transactions = [t for t in transactions if t.transaction_type == "activation"]
    for trans in activation_transactions:
        user = trans.user
        property_name = "N/A"
        if user and user.property_id:
            property_obj = db.query(Property).filter(Property.id == user.property_id).first()
            property_name = property_obj.name if property_obj else "N/A"
        
        # Check if this activation entry already exists (might be duplicate with transaction)
        if not any(e["id"] == trans.id and e["type"] == "Activation" for e in audit_entries):
            audit_entries.append({
                "id": f"act_{trans.id}",
                "timestamp": trans.created_at.isoformat() if trans.created_at else datetime.now().isoformat(),
                "type": "Activation",
                "action": "Member Activated",
                "user_name": user.name if user else "Unknown",
                "user_email": user.email if user else "Unknown",
                "property_name": property_name,
                "description": trans.description or "Member account activated",
                "weekday_change": trans.weekday_change,
                "weekend_change": trans.weekend_change,
                "booking_id": None,
                "details": f"Initial quota: Weekday {trans.weekday_change}, Weekend {trans.weekend_change}"
            })
    
    # Sort all entries by timestamp
    audit_entries.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return audit_entries

# Create Admin User
@router.post("/create-admin", response_model=UserResponse)
def create_admin_user(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create a new admin user. Only existing admins can create other admins."""
    # Check if user with this email already exists
    existing = db.query(User).filter(User.email == admin_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new admin user
    admin_user = User(
        email=admin_data.email,
        password_hash=get_password_hash(admin_data.password),
        name=admin_data.name,
        phone=admin_data.phone,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        weekday_quota=0,
        weekend_quota=0,
        weekday_balance=0,
        weekend_balance=0,
        property_id=None
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    return admin_user

# Get All Admin Users
@router.get("/admins", response_model=List[UserResponse])
def get_all_admins(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all admin users"""
    admins = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.created_at.desc()).all()
    return admins

# Deactivate Admin User
@router.post("/deactivate-admin/{admin_id}")
def deactivate_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Deactivate an admin user. Cannot deactivate yourself."""
    if admin_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    admin_user = db.query(User).filter(User.id == admin_id, User.role == UserRole.ADMIN).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    admin_user.status = UserStatus.SUSPENDED
    db.commit()
    db.refresh(admin_user)
    return admin_user

# Reactivate Admin User
@router.post("/reactivate-admin/{admin_id}")
def reactivate_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Reactivate a suspended admin user"""
    admin_user = db.query(User).filter(User.id == admin_id, User.role == UserRole.ADMIN).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    if admin_user.status != UserStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="Admin user is not suspended")
    
    admin_user.status = UserStatus.ACTIVE
    db.commit()
    db.refresh(admin_user)
    return admin_user

# Delete Admin User
@router.delete("/admin/{admin_id}")
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Delete an admin user. Cannot delete yourself."""
    if admin_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    admin_user = db.query(User).filter(User.id == admin_id, User.role == UserRole.ADMIN).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    admin_name = admin_user.name
    
    # Delete related records in correct order (respecting foreign key constraints)
    # 1. Delete quota transactions (references user_id)
    db.query(QuotaTransaction).filter(QuotaTransaction.user_id == admin_id).delete()
    
    # 2. Delete bookings (references user_id)
    db.query(Booking).filter(Booking.user_id == admin_id).delete()
    
    # 3. Delete the admin user
    db.delete(admin_user)
    db.commit()
    
    return {"message": f"Admin {admin_name} and all related records deleted successfully"}

# Reports and Statistics
@router.get("/reports/statistics")
def get_reports_statistics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get statistics data for reports and graphs"""
    from sqlalchemy import func, extract
    
    # Total users by status
    total_users = db.query(User).filter(User.role == UserRole.OWNER).count()
    active_users = db.query(User).filter(User.role == UserRole.OWNER, User.status == UserStatus.ACTIVE).count()
    pending_users = db.query(User).filter(User.role == UserRole.OWNER, User.status == UserStatus.PENDING).count()
    suspended_users = db.query(User).filter(User.role == UserRole.OWNER, User.status == UserStatus.SUSPENDED).count()
    
    # Total bookings by status
    total_bookings = db.query(Booking).count()
    confirmed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CONFIRMED).count()
    pending_bookings = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    rejected_bookings = db.query(Booking).filter(Booking.status == BookingStatus.REJECTED).count()
    cancelled_bookings = db.query(Booking).filter(Booking.status == BookingStatus.CANCELLED).count()
    
    # Users registered over last 12 months
    twelve_months_ago = datetime.now() - timedelta(days=365)
    users_over_time = db.query(
        extract('year', User.created_at).label('year'),
        extract('month', User.created_at).label('month'),
        func.count(User.id).label('count')
    ).filter(
        User.created_at >= twelve_months_ago,
        User.role == UserRole.OWNER
    ).group_by(
        extract('year', User.created_at),
        extract('month', User.created_at)
    ).order_by(
        extract('year', User.created_at),
        extract('month', User.created_at)
    ).all()
    
    users_timeline = []
    for row in users_over_time:
        month_name = datetime(int(row.year), int(row.month), 1).strftime('%b %Y')
        users_timeline.append({
            'month': month_name,
            'count': row.count
        })
    
    # Bookings created over last 12 months
    bookings_over_time = db.query(
        extract('year', Booking.created_at).label('year'),
        extract('month', Booking.created_at).label('month'),
        func.count(Booking.id).label('count')
    ).filter(
        Booking.created_at >= twelve_months_ago
    ).group_by(
        extract('year', Booking.created_at),
        extract('month', Booking.created_at)
    ).order_by(
        extract('year', Booking.created_at),
        extract('month', Booking.created_at)
    ).all()
    
    bookings_timeline = []
    for row in bookings_over_time:
        month_name = datetime(int(row.year), int(row.month), 1).strftime('%b %Y')
        bookings_timeline.append({
            'month': month_name,
            'count': row.count
        })
    
    # Bookings by status for pie chart
    bookings_by_status = [
        {'name': 'Confirmed', 'value': confirmed_bookings},
        {'name': 'Pending', 'value': pending_bookings},
        {'name': 'Rejected', 'value': rejected_bookings},
        {'name': 'Cancelled', 'value': cancelled_bookings}
    ]
    
    # Users by status for pie chart
    users_by_status = [
        {'name': 'Active', 'value': active_users},
        {'name': 'Pending', 'value': pending_users},
        {'name': 'Suspended', 'value': suspended_users}
    ]
    
    return {
        'users': {
            'total': total_users,
            'active': active_users,
            'pending': pending_users,
            'suspended': suspended_users,
            'by_status': users_by_status,
            'over_time': users_timeline
        },
        'bookings': {
            'total': total_bookings,
            'confirmed': confirmed_bookings,
            'pending': pending_bookings,
            'rejected': rejected_bookings,
            'cancelled': cancelled_bookings,
            'by_status': bookings_by_status,
            'over_time': bookings_timeline
        }
    }

# Email Configuration Endpoints
@router.get("/email-config", response_model=EmailConfigResponse)
def get_email_config(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get email configuration (password is not returned for security)"""
    config = db.query(EmailConfig).first()
    if not config:
        # Return default values if no config exists
        return EmailConfigResponse(
            id=None,
            smtp_server="smtp.gmail.com",
            smtp_port=587,
            smtp_username="",
            smtp_password=None,  # Don't return password
            from_email="",
            frontend_url="http://localhost:3000",
            enabled=True,
            created_at=None,
            updated_at=None
        )
    # Return config without password for security
    return EmailConfigResponse(
        id=config.id,
        smtp_server=config.smtp_server,
        smtp_port=config.smtp_port,
        smtp_username=config.smtp_username,
        smtp_password=None,  # Don't return actual password
        from_email=config.from_email,
        frontend_url=config.frontend_url,
        enabled=config.enabled,
        created_at=config.created_at,
        updated_at=config.updated_at
    )

@router.post("/email-config", response_model=EmailConfigResponse)
def create_or_update_email_config(
    config_data: EmailConfigCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create or update email configuration"""
    existing_config = db.query(EmailConfig).first()
    
    if existing_config:
        # Update existing config
        existing_config.smtp_server = config_data.smtp_server
        existing_config.smtp_port = config_data.smtp_port
        existing_config.smtp_username = config_data.smtp_username
        # Only update password if provided (not empty/None)
        if config_data.smtp_password is not None and config_data.smtp_password != "":
            existing_config.smtp_password = config_data.smtp_password
        existing_config.from_email = config_data.from_email
        existing_config.frontend_url = config_data.frontend_url
        existing_config.enabled = config_data.enabled
        existing_config.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_config)
        # Return without password for security
        return EmailConfigResponse(
            id=existing_config.id,
            smtp_server=existing_config.smtp_server,
            smtp_port=existing_config.smtp_port,
            smtp_username=existing_config.smtp_username,
            smtp_password=None,
            from_email=existing_config.from_email,
            frontend_url=existing_config.frontend_url,
            enabled=existing_config.enabled,
            created_at=existing_config.created_at,
            updated_at=existing_config.updated_at
        )
    else:
        # Create new config - password is required for new config
        if not config_data.smtp_password:
            raise HTTPException(status_code=400, detail="SMTP password is required for new configuration")
        new_config = EmailConfig(**config_data.dict(exclude_none=True))
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        # Return without password for security
        return EmailConfigResponse(
            id=new_config.id,
            smtp_server=new_config.smtp_server,
            smtp_port=new_config.smtp_port,
            smtp_username=new_config.smtp_username,
            smtp_password=None,
            from_email=new_config.from_email,
            frontend_url=new_config.frontend_url,
            enabled=new_config.enabled,
            created_at=new_config.created_at,
            updated_at=new_config.updated_at
        )

@router.get("/email-templates", response_model=List[EmailTemplateResponse])
def get_email_templates(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get all email templates"""
    templates = db.query(EmailTemplate).all()
    return templates

@router.get("/email-templates/{template_type}", response_model=EmailTemplateResponse)
def get_email_template(
    template_type: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Get specific email template"""
    template = db.query(EmailTemplate).filter(EmailTemplate.template_type == template_type).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/email-templates/{template_type}", response_model=EmailTemplateResponse)
def update_email_template(
    template_type: str,
    template_data: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Update or create email template (upsert)"""
    template = db.query(EmailTemplate).filter(EmailTemplate.template_type == template_type).first()
    
    if not template:
        # Create new template if it doesn't exist
        # For PUT, require subject and html_body
        if not template_data.subject or not template_data.html_body:
            raise HTTPException(status_code=400, detail="Subject and HTML body are required")
        new_template = EmailTemplate(
            template_type=template_type,
            subject=template_data.subject,
            html_body=template_data.html_body,
            text_body=template_data.text_body or None
        )
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        return new_template
    
    # Update existing template - only update fields that are provided
    if template_data.subject is not None:
        template.subject = template_data.subject
    if template_data.html_body is not None:
        template.html_body = template_data.html_body
    if template_data.text_body is not None:
        template.text_body = template_data.text_body
    elif template_data.text_body == "":
        template.text_body = None
    
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return template

@router.post("/email-templates", response_model=EmailTemplateResponse)
def create_email_template(
    template_data: EmailTemplateCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Create email template"""
    existing = db.query(EmailTemplate).filter(EmailTemplate.template_type == template_data.template_type).first()
    if existing:
        raise HTTPException(status_code=400, detail="Template already exists. Use PUT to update.")
    
    new_template = EmailTemplate(**template_data.dict())
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.post("/email-config/test")
def test_email_config(
    test_data: TestEmailRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    """Send a test email to verify configuration"""
    config = db.query(EmailConfig).first()
    if not config:
        raise HTTPException(status_code=400, detail="Email configuration not found. Please configure email settings first.")
    
    if not config.enabled:
        raise HTTPException(status_code=400, detail="Email sending is disabled. Enable it in email configuration.")
    
    # Import email service functions
    from email_service import send_email
    
    test_subject = "Vanatvam - Test Email"
    test_html = """
    <html>
    <body>
        <h2>Test Email from Vanatvam</h2>
        <p>This is a test email to verify your email configuration.</p>
        <p>If you received this email, your SMTP settings are configured correctly!</p>
    </body>
    </html>
    """
    test_text = "Test Email from Vanatvam\n\nThis is a test email to verify your email configuration.\n\nIf you received this email, your SMTP settings are configured correctly!"
    
    # Temporarily update email service config
    import email_service
    original_smtp_server = email_service.SMTP_SERVER
    original_smtp_port = email_service.SMTP_PORT
    original_smtp_username = email_service.SMTP_USERNAME
    original_smtp_password = email_service.SMTP_PASSWORD
    original_from_email = email_service.FROM_EMAIL
    
    try:
        email_service.SMTP_SERVER = config.smtp_server
        email_service.SMTP_PORT = config.smtp_port
        email_service.SMTP_USERNAME = config.smtp_username
        email_service.SMTP_PASSWORD = config.smtp_password
        email_service.FROM_EMAIL = config.from_email
        
        success = send_email(test_data.to_email, test_subject, test_html, test_text)
        
        if success:
            return {"message": "Test email sent successfully!"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email. Check your SMTP settings.")
    finally:
        # Restore original values
        email_service.SMTP_SERVER = original_smtp_server
        email_service.SMTP_PORT = original_smtp_port
        email_service.SMTP_USERNAME = original_smtp_username
        email_service.SMTP_PASSWORD = original_smtp_password
        email_service.FROM_EMAIL = original_from_email
