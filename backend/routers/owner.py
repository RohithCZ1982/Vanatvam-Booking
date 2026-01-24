from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List
from datetime import date, datetime, timedelta
from database import get_db
from models import (
    User, Property, Cottage, Booking, MaintenanceBlock, SystemCalendar,
    BookingStatus, UserStatus, QuotaTransaction
)
from schemas import (
    UserResponse, BookingCreate, BookingUpdate, BookingResponse, CottageResponse,
    QuotaTransactionResponse, DateAvailability, CottageAvailability
)
from auth import get_current_active_user
import calendar

router = APIRouter()

# OWN-03: Property Context
@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not current_user.property_id:
        raise HTTPException(status_code=400, detail="User not assigned to a property")
    
    property_obj = db.query(Property).filter(Property.id == current_user.property_id).first()
    cottages = db.query(Cottage).filter(Cottage.property_id == current_user.property_id).all()
    
    # Get pending bookings count
    pending_bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status == BookingStatus.PENDING
    ).all()
    
    pending_weekday = sum(b.weekday_credits_used for b in pending_bookings)
    pending_weekend = sum(b.weekend_credits_used for b in pending_bookings)
    
    return {
        "user": current_user,
        "property": property_obj,
        "cottages": cottages,
        "available_weekday": current_user.weekday_balance - pending_weekday,
        "available_weekend": current_user.weekend_balance - pending_weekend,
        "pending_weekday": pending_weekday,
        "pending_weekend": pending_weekend
    }

# OWN-04, OWN-05: Real-Time Availability & Holiday Transparency
@router.get("/availability/{cottage_id}", response_model=CottageAvailability)
def get_cottage_availability(
    cottage_id: int,
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cottage = db.query(Cottage).filter(Cottage.id == cottage_id).first()
    if not cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    # Verify user has access to this property
    if cottage.property_id != current_user.property_id:
        raise HTTPException(status_code=403, detail="Access denied to this cottage")
    
    availability = []
    current = start_date
    
    while current <= end_date:
        # Check if booked
        booking = db.query(Booking).filter(
            Booking.cottage_id == cottage_id,
            Booking.check_in <= current,
            Booking.check_out > current,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        ).first()
        
        # Check if maintenance
        maintenance = db.query(MaintenanceBlock).filter(
            MaintenanceBlock.cottage_id == cottage_id,
            MaintenanceBlock.start_date <= current,
            MaintenanceBlock.end_date >= current
        ).first()
        
        # Check if holiday or peak season
        calendar_entry = db.query(SystemCalendar).filter(
            SystemCalendar.date == current
        ).first()
        
        is_holiday = calendar_entry.is_holiday if calendar_entry else False
        is_peak_season = calendar_entry.is_peak_season if calendar_entry else False
        
        # Determine cost type (weekend pricing for holidays, peak season, or actual weekends)
        is_weekend = current.weekday() >= 5  # Saturday = 5, Sunday = 6
        cost_weekday = not (is_weekend or is_holiday or is_peak_season)
        
        availability.append(DateAvailability(
            date=current,
            is_available=not booking and not maintenance,
            is_booked=bool(booking),
            is_maintenance=bool(maintenance),
            is_holiday=is_holiday,
            is_peak_season=is_peak_season,
            cost_weekday=cost_weekday
        ))
        
        current += timedelta(days=1)
    
    return CottageAvailability(
        cottage_id=cottage.id,
        cottage_name=cottage.cottage_id,
        availability=availability
    )

# OWN-06: Cost Calculator
@router.post("/calculate-cost")
def calculate_cost(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cottage_id = booking_data.cottage_id
    check_in = booking_data.check_in
    check_out = booking_data.check_out
    cottage = db.query(Cottage).filter(Cottage.id == cottage_id).first()
    if not cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    if cottage.property_id != current_user.property_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    weekday_count = 0
    weekend_count = 0
    current = check_in
    
    while current < check_out:
        calendar_entry = db.query(SystemCalendar).filter(
            SystemCalendar.date == current
        ).first()
        
        is_holiday = calendar_entry.is_holiday if calendar_entry else False
        is_peak_season = calendar_entry.is_peak_season if calendar_entry else False
        is_weekend = current.weekday() >= 5
        
        if is_weekend or is_holiday or is_peak_season:
            weekend_count += 1
        else:
            weekday_count += 1
        
        current += timedelta(days=1)
    
    return {
        "weekday_credits": weekday_count,
        "weekend_credits": weekend_count,
        "total_credits": weekday_count + weekend_count,
        "breakdown": {
            "weekdays": weekday_count,
            "weekends": weekend_count,
            "holidays": sum(1 for d in [check_in + timedelta(days=i) for i in range((check_out - check_in).days)]
                           if db.query(SystemCalendar).filter(SystemCalendar.date == d, SystemCalendar.is_holiday == True).first()),
            "peak_season_days": sum(1 for d in [check_in + timedelta(days=i) for i in range((check_out - check_in).days)]
                                  if db.query(SystemCalendar).filter(SystemCalendar.date == d, SystemCalendar.is_peak_season == True).first())
        }
    }

# OWN-07: Submit Request
@router.post("/bookings", response_model=BookingResponse)
def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    cottage = db.query(Cottage).filter(Cottage.id == booking_data.cottage_id).first()
    if not cottage:
        raise HTTPException(status_code=404, detail="Cottage not found")
    
    if cottage.property_id != current_user.property_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate cost
    cost_result = calculate_cost(
        booking_data=booking_data,
        current_user=current_user,
        db=db
    )
    
    # Check availability
    current = booking_data.check_in
    while current < booking_data.check_out:
        # Check for existing bookings
        existing_booking = db.query(Booking).filter(
            Booking.cottage_id == booking_data.cottage_id,
            Booking.check_in <= current,
            Booking.check_out > current,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        ).first()
        
        if existing_booking:
            raise HTTPException(status_code=400, detail=f"Date {current} is already booked")
        
        # Check for maintenance
        maintenance = db.query(MaintenanceBlock).filter(
            MaintenanceBlock.cottage_id == booking_data.cottage_id,
            MaintenanceBlock.start_date <= current,
            MaintenanceBlock.end_date >= current
        ).first()
        
        if maintenance:
            raise HTTPException(status_code=400, detail=f"Date {current} is under maintenance")
        
        current += timedelta(days=1)
    
    # Check if user has enough credits
    pending_bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status == BookingStatus.PENDING
    ).all()
    
    pending_weekday = sum(b.weekday_credits_used for b in pending_bookings)
    pending_weekend = sum(b.weekend_credits_used for b in pending_bookings)
    
    available_weekday = current_user.weekday_balance - pending_weekday
    available_weekend = current_user.weekend_balance - pending_weekend
    
    if cost_result["weekday_credits"] > available_weekday:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient weekday credits. Required: {cost_result['weekday_credits']}, Available: {available_weekday}"
        )
    
    if cost_result["weekend_credits"] > available_weekend:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient weekend credits. Required: {cost_result['weekend_credits']}, Available: {available_weekend}"
        )
    
    # Deduct credits (escrow)
    current_user.weekday_balance -= cost_result["weekday_credits"]
    current_user.weekend_balance -= cost_result["weekend_credits"]
    
    # Create booking
    db_booking = Booking(
        user_id=current_user.id,
        cottage_id=booking_data.cottage_id,
        check_in=booking_data.check_in,
        check_out=booking_data.check_out,
        status=BookingStatus.PENDING,
        weekday_credits_used=cost_result["weekday_credits"],
        weekend_credits_used=cost_result["weekend_credits"]
    )
    db.add(db_booking)
    
    # Create transaction record
    transaction = QuotaTransaction(
        user_id=current_user.id,
        transaction_type="booking",
        weekday_change=-cost_result["weekday_credits"],
        weekend_change=-cost_result["weekend_credits"],
        booking_id=db_booking.id,
        description=f"Booking request for {cottage.cottage_id}"
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(db_booking)
    return db_booking

# OWN-08, OWN-09: Balance Dashboard & Escrow Visibility
@router.get("/quota-status")
def get_quota_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    pending_bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status == BookingStatus.PENDING
    ).all()
    
    confirmed_bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status == BookingStatus.CONFIRMED
    ).all()
    
    pending_weekday = sum(b.weekday_credits_used for b in pending_bookings)
    pending_weekend = sum(b.weekend_credits_used for b in pending_bookings)
    
    confirmed_weekday = sum(b.weekday_credits_used for b in confirmed_bookings)
    confirmed_weekend = sum(b.weekend_credits_used for b in confirmed_bookings)
    
    return {
        "weekday_quota": current_user.weekday_quota,
        "weekend_quota": current_user.weekend_quota,
        "weekday_balance": current_user.weekday_balance,
        "weekend_balance": current_user.weekend_balance,
        "available_weekday": current_user.weekday_balance - pending_weekday,
        "available_weekend": current_user.weekend_balance - pending_weekend,
        "pending_weekday": pending_weekday,
        "pending_weekend": pending_weekend,
        "confirmed_weekday": confirmed_weekday,
        "confirmed_weekend": confirmed_weekend,
        "escrowed_in_pending": {
            "weekday": pending_weekday,
            "weekend": pending_weekend
        }
    }

# OWN-10: Transaction History
@router.get("/transactions", response_model=List[QuotaTransactionResponse])
def get_transactions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    transactions = db.query(QuotaTransaction).filter(
        QuotaTransaction.user_id == current_user.id
    ).order_by(QuotaTransaction.created_at.desc()).all()
    return transactions

# OWN-11: Trip Status Tracking
@router.get("/my-trips")
def get_my_trips(
    status: BookingStatus = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(Booking.user_id == current_user.id)
    if status:
        query = query.filter(Booking.status == status)
    
    bookings = query.order_by(Booking.check_in.desc()).all()
    
    result = []
    for booking in bookings:
        cottage = db.query(Cottage).filter(Cottage.id == booking.cottage_id).first()
        result.append({
            "id": booking.id,
            "cottage_id": booking.cottage_id,
            "cottage_name": cottage.cottage_id if cottage else "Unknown",
            "check_in": booking.check_in,
            "check_out": booking.check_out,
            "status": booking.status,
            "weekday_credits_used": booking.weekday_credits_used,
            "weekend_credits_used": booking.weekend_credits_used,
            "created_at": booking.created_at
        })
    
    return result

# OWN-12: Self-Cancellation
@router.post("/cancel-booking/{booking_id}")
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    
    if booking.status == BookingStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Booking already rejected")
    
    # Refund credits
    current_user.weekday_balance += booking.weekday_credits_used
    current_user.weekend_balance += booking.weekend_credits_used
    
    booking.status = BookingStatus.CANCELLED
    
    transaction = QuotaTransaction(
        user_id=current_user.id,
        transaction_type="refund",
        weekday_change=booking.weekday_credits_used,
        weekend_change=booking.weekend_credits_used,
        booking_id=booking.id,
        description="Booking cancelled by user - quota refunded"
    )
    db.add(transaction)
    db.commit()
    db.refresh(booking)
    return booking

# OWN-13: Booking Receipt
@router.get("/booking-receipt/{booking_id}")
def get_booking_receipt(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    cottage = db.query(Cottage).filter(Cottage.id == booking.cottage_id).first()
    property_obj = db.query(Property).filter(Property.id == cottage.property_id).first()
    
    # Calculate days
    days = (booking.check_out - booking.check_in).days
    
    return {
        "booking_id": booking.id,
        "status": booking.status,
        "property": property_obj.name,
        "cottage_id": cottage.cottage_id,
        "check_in": booking.check_in,
        "check_out": booking.check_out,
        "days": days,
        "weekday_credits": booking.weekday_credits_used,
        "weekend_credits": booking.weekend_credits_used,
        "total_credits": booking.weekday_credits_used + booking.weekend_credits_used,
        "created_at": booking.created_at,
        "decision_notes": booking.decision_notes,
        "guest_rules": "Standard property rules apply. Please maintain cleanliness and respect quiet hours."
    }

# OWN-14: Update Booking (only for pending bookings)
@router.put("/bookings/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail="Only pending bookings can be edited. Please cancel and create a new booking."
        )
    
    # Determine what to update
    new_cottage_id = booking_update.cottage_id if booking_update.cottage_id is not None else booking.cottage_id
    new_check_in = booking_update.check_in if booking_update.check_in is not None else booking.check_in
    new_check_out = booking_update.check_out if booking_update.check_out is not None else booking.check_out
    
    # Refund old credits
    current_user.weekday_balance += booking.weekday_credits_used
    current_user.weekend_balance += booking.weekend_credits_used
    
    # Check if dates changed
    dates_changed = (new_check_in != booking.check_in or new_check_out != booking.check_out)
    cottage_changed = (new_cottage_id != booking.cottage_id)
    
    if dates_changed or cottage_changed:
        # Check availability for new dates/cottage
        cottage = db.query(Cottage).filter(Cottage.id == new_cottage_id).first()
        if not cottage:
            raise HTTPException(status_code=404, detail="Cottage not found")
        
        if cottage.property_id != current_user.property_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check availability
        current = new_check_in
        while current < new_check_out:
            # Check for existing bookings (excluding current booking)
            existing_booking = db.query(Booking).filter(
                Booking.cottage_id == new_cottage_id,
                Booking.check_in <= current,
                Booking.check_out > current,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
                Booking.id != booking_id
            ).first()
            
            if existing_booking:
                raise HTTPException(status_code=400, detail=f"Date {current} is already booked")
            
            # Check for maintenance
            maintenance = db.query(MaintenanceBlock).filter(
                MaintenanceBlock.cottage_id == new_cottage_id,
                MaintenanceBlock.start_date <= current,
                MaintenanceBlock.end_date >= current
            ).first()
            
            if maintenance:
                raise HTTPException(status_code=400, detail=f"Date {current} is under maintenance")
            
            current += timedelta(days=1)
        
        # Calculate new cost
        cost_result = calculate_cost(
            booking_data=BookingCreate(
                cottage_id=new_cottage_id,
                check_in=new_check_in,
                check_out=new_check_out
            ),
            current_user=current_user,
            db=db
        )
        
        # Check if user has enough credits (including the refunded ones)
        pending_bookings = db.query(Booking).filter(
            Booking.user_id == current_user.id,
            Booking.status == BookingStatus.PENDING,
            Booking.id != booking_id
        ).all()
        
        pending_weekday = sum(b.weekday_credits_used for b in pending_bookings)
        pending_weekend = sum(b.weekend_credits_used for b in pending_bookings)
        
        available_weekday = current_user.weekday_balance - pending_weekday
        available_weekend = current_user.weekend_balance - pending_weekend
        
        if cost_result["weekday_credits"] > available_weekday:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient weekday credits. Required: {cost_result['weekday_credits']}, Available: {available_weekday}"
            )
        
        if cost_result["weekend_credits"] > available_weekend:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient weekend credits. Required: {cost_result['weekend_credits']}, Available: {available_weekend}"
            )
        
        # Update booking
        booking.cottage_id = new_cottage_id
        booking.check_in = new_check_in
        booking.check_out = new_check_out
        booking.weekday_credits_used = cost_result["weekday_credits"]
        booking.weekend_credits_used = cost_result["weekend_credits"]
        
        # Deduct new credits
        current_user.weekday_balance -= cost_result["weekday_credits"]
        current_user.weekend_balance -= cost_result["weekend_credits"]
        
        # Update transaction
        transaction = db.query(QuotaTransaction).filter(
            QuotaTransaction.booking_id == booking_id
        ).first()
        
        if transaction:
            transaction.weekday_change = -cost_result["weekday_credits"]
            transaction.weekend_change = -cost_result["weekend_credits"]
            transaction.description = f"Booking updated for {cottage.cottage_id}"
    
    db.commit()
    db.refresh(booking)
    return booking

# OWN-15: Delete Booking (for pending and confirmed bookings)
@router.delete("/bookings/{booking_id}")
def delete_booking(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.user_id == current_user.id
    ).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(
            status_code=400, 
            detail="Only pending or confirmed bookings can be deleted"
        )
    
    # Refund credits
    current_user.weekday_balance += booking.weekday_credits_used
    current_user.weekend_balance += booking.weekend_credits_used
    
    # Create refund transaction
    transaction = QuotaTransaction(
        user_id=current_user.id,
        transaction_type="refund",
        weekday_change=booking.weekday_credits_used,
        weekend_change=booking.weekend_credits_used,
        booking_id=booking.id,
        description="Booking deleted by user - quota refunded"
    )
    db.add(transaction)
    
    # Delete booking
    db.delete(booking)
    db.commit()
    
    return {"message": "Booking deleted successfully"}
