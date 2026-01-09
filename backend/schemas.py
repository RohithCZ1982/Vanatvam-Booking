from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from models import UserRole, UserStatus, BookingStatus

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    phone: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[UserRole] = None

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class MemberEdit(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    phone: str
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    status: UserStatus
    property_id: Optional[int] = None
    weekday_quota: int
    weekend_quota: int
    weekday_balance: int
    weekend_balance: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Property Schemas
class PropertyBase(BaseModel):
    name: str
    description: Optional[str] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyResponse(PropertyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Cottage Schemas
class CottageBase(BaseModel):
    cottage_id: str
    capacity: int
    amenities: Optional[str] = None

class CottageCreate(CottageBase):
    property_id: int

class CottageResponse(CottageBase):
    id: int
    property_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Maintenance Block Schemas
class MaintenanceBlockCreate(BaseModel):
    cottage_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = None

class MaintenanceBlockResponse(MaintenanceBlockCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Booking Schemas
class BookingCreate(BaseModel):
    cottage_id: int
    check_in: date
    check_out: date

class BookingResponse(BaseModel):
    id: int
    user_id: int
    cottage_id: int
    check_in: date
    check_out: date
    status: BookingStatus
    weekday_credits_used: int
    weekend_credits_used: int
    created_at: datetime
    cottage: Optional[CottageResponse] = None
    
    class Config:
        from_attributes = True

# Admin Schemas
class MemberActivation(BaseModel):
    user_id: int
    property_id: int
    weekday_quota: int = 12
    weekend_quota: int = 6

class QuotaAdjustment(BaseModel):
    user_id: int
    weekday_change: int
    weekend_change: int
    description: Optional[str] = None

class BookingDecision(BaseModel):
    booking_id: int
    action: str  # "approve" or "reject"
    notes: Optional[str] = None

# Calendar Schemas
class HolidayDate(BaseModel):
    date: date
    holiday_name: Optional[str] = None

class PeakSeasonCreate(BaseModel):
    name: str
    start_date: date
    end_date: date

# Quota Transaction Schema
class QuotaTransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_type: str
    weekday_change: int
    weekend_change: int
    description: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Availability Schema
class DateAvailability(BaseModel):
    date: date
    is_available: bool
    is_booked: bool
    is_maintenance: bool
    is_holiday: bool
    is_peak_season: bool
    cost_weekday: bool  # True if costs weekday credit, False if weekend

class CottageAvailability(BaseModel):
    cottage_id: int
    cottage_name: str
    availability: List[DateAvailability]

