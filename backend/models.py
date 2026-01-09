from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    OWNER = "owner"

class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"

class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.OWNER)
    status = Column(SQLEnum(UserStatus), default=UserStatus.PENDING)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    weekday_quota = Column(Integer, default=12)
    weekend_quota = Column(Integer, default=6)
    weekday_balance = Column(Integer, default=0)
    weekend_balance = Column(Integer, default=0)
    reset_token = Column(String, nullable=True)  # For password reset
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)  # Token expiration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    property = relationship("Property", back_populates="owners")
    bookings = relationship("Booking", back_populates="user")

class Property(Base):
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owners = relationship("User", back_populates="property")
    cottages = relationship("Cottage", back_populates="property")

class Cottage(Base):
    __tablename__ = "cottages"
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    cottage_id = Column(String, nullable=False)  # e.g., "C-12"
    capacity = Column(Integer, nullable=False)
    amenities = Column(String, nullable=True)  # JSON string or comma-separated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    property = relationship("Property", back_populates="cottages")
    bookings = relationship("Booking", back_populates="cottage")
    maintenance_blocks = relationship("MaintenanceBlock", back_populates="cottage")

class MaintenanceBlock(Base):
    __tablename__ = "maintenance_blocks"
    
    id = Column(Integer, primary_key=True, index=True)
    cottage_id = Column(Integer, ForeignKey("cottages.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    cottage = relationship("Cottage", back_populates="maintenance_blocks")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cottage_id = Column(Integer, ForeignKey("cottages.id"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING)
    weekday_credits_used = Column(Integer, default=0)
    weekend_credits_used = Column(Integer, default=0)
    decision_notes = Column(String, nullable=True)  # Notes from admin decision (approve/reject)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", back_populates="bookings")
    cottage = relationship("Cottage", back_populates="bookings")

class SystemCalendar(Base):
    __tablename__ = "system_calendars"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False)
    is_holiday = Column(Boolean, default=False)
    is_peak_season = Column(Boolean, default=False)
    holiday_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PeakSeason(Base):
    __tablename__ = "peak_seasons"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QuotaTransaction(Base):
    __tablename__ = "quota_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # "reset", "booking", "refund", "manual_adjustment"
    weekday_change = Column(Integer, default=0)
    weekend_change = Column(Integer, default=0)
    description = Column(String, nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
