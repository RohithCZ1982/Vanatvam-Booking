# Software Requirements Specification (SRS) - Features Summary
## Vanatvam Property Booking Management System

### Document Information
- **System Name:** Vanatvam Property Booking Management System
- **Document Type:** Features Implementation Summary
- **Version:** 1.0
- **Date:** Generated from Codebase Analysis

---

## 1. EXECUTIVE SUMMARY

The Vanatvam Property Booking Management System is a comprehensive web-based application designed for managing property bookings with a quota-based credit system. The system supports two primary user roles: **Administrators** and **Property Owners**, each with distinct functionalities and access levels.

**Technology Stack:**
- **Frontend:** React with TypeScript
- **Backend:** Python FastAPI
- **Database:** PostgreSQL
- **Authentication:** JWT-based with bcrypt password hashing

---

## 2. AUTHENTICATION & AUTHORIZATION FEATURES

### 2.1 User Registration
- Self-registration for property owners
- Email verification system with token-based verification
- Email verification link sent upon registration
- 24-hour token expiration
- Status: PENDING until admin approval

### 2.2 User Login
- Email and password authentication
- JWT token generation (30-minute expiration)
- Email verification required before login (for owners)
- Admin users bypass email verification
- Status-based access control (only ACTIVE users can login)

### 2.3 Password Management
- Password reset functionality with token-based reset links
- 1-hour token expiration for password reset
- Secure password hashing using bcrypt
- Forgot password flow with email notification

### 2.4 Email Verification
- Email verification endpoint with token validation
- Verification notification email
- Email verification status tracking
- Token expiration handling

### 2.5 Role-Based Access Control
- Two user roles: ADMIN and OWNER
- Three user statuses: PENDING, ACTIVE, SUSPENDED
- Property-based data isolation for owners
- Admin-only endpoints protection

---

## 3. ADMIN MODULE FEATURES

### 3.1 Community Management (Member Management)

#### ADM-01: Pending Member Queue
- View all pending member registrations
- Filter by email verification status
- Display member registration details
- Queue management interface

#### ADM-02: Member Activation & Assignment
- Activate pending members
- Assign members to properties
- Set initial quota (weekday/weekend)
- Default quotas: 12 weekday, 6 weekend credits
- Automatic quota balance initialization
- Transaction record creation for activation
- Email notification on activation

#### ADM-03: Member Lookup & History
- Search members by name, email, phone, or property
- View member details (profile, bookings, transactions)
- Complete member history tracking
- Get all active members list
- Edit member credentials (name, email, phone, password)

#### ADM-04: Manual Quota Adjustment
- Adjust quota balances manually
- Add or subtract weekday/weekend credits
- Add adjustment notes/descriptions
- Transaction history recording
- View all quota adjustment history
- Prevent negative balances

#### ADM-05: Member Deactivation
- Suspend member accounts
- Reactivate suspended members
- Delete member accounts (with cascading deletion)
- Automatic cleanup of related records

#### Member Rejection
- Reject pending member registrations
- Send rejection email notifications
- Delete rejected user records

### 3.2 Inventory Governance (Property & Cottage Management)

#### ADM-06: Property Management
- Create properties/sanctuaries (e.g., Madhuvana)
- List all properties
- Update property details (name, description)
- Property deletion support

#### ADM-07: Cottage Inventory Management
- Create cottages under properties
- Set cottage ID (e.g., "C-12")
- Define cottage capacity
- Add amenities information
- List cottages (filterable by property)
- Update cottage details
- Delete cottage records

#### ADM-08: Maintenance Blocking
- Create maintenance blocks for cottages
- Set maintenance date ranges
- Add maintenance reasons/notes
- Auto-reject pending bookings during maintenance
- Automatic credit refunds for rejected bookings
- View all maintenance blocks
- Update maintenance blocks
- Delete maintenance blocks
- View bookings affected by maintenance blocks
- Bulk revoke bookings for maintenance periods

#### ADM-09: Inventory Health View
- Calendar view of cottage availability
- Filter by property and date range
- Status indicators: Available, Booked, Maintenance
- Comprehensive inventory status tracking

### 3.3 Booking Governance

#### ADM-10: Approval Queue
- View all pending booking requests
- Display booking details (user, cottage, dates, credits)
- Sort by creation date
- Property and cottage information display

#### ADM-11: Booking Decision Workflow
- Approve booking requests
- Reject booking requests with notes
- Automatic credit handling (approved = credits deducted, rejected = refunded)
- Transaction history for decisions
- Decision notes storage

#### ADM-12: Emergency Revocation
- Revoke confirmed bookings
- Add revocation reason
- Full credit refund on revocation
- Transaction history recording
- Bulk revoke bookings for maintenance blocks

#### ADM-13: Admin Override Booking
- Create bookings directly (bypass standard flow)
- Override availability checks
- Direct confirmation (no approval needed)

#### Booking Calendar View
- View all bookings (confirmed and pending)
- Calendar display with cottage names
- User and property information
- Status indicators

#### Rejected Bookings View
- View all rejected and cancelled bookings
- Display owner, sanctuary, and cottage details
- Decision notes and timestamps
- Chronological sorting

### 3.4 Holiday & Season Configuration

#### ADM-14: Holiday Configuration
- Set holiday dates
- Add holiday names
- View all configured holidays
- Update holiday details
- Delete holidays
- Holidays use weekend pricing automatically

#### ADM-15: Peak Season Definition
- Create peak season periods
- Define start and end dates
- Name peak seasons
- View all peak seasons
- Update peak season definitions
- Delete peak seasons
- Peak season dates use weekend pricing

### 3.5 Quota Management

#### ADM-16: Global Quota Reset
- Reset all active user quotas
- Annual quota reset functionality
- Set balances to quota amounts
- Transaction history for resets
- Batch processing of all users

### 3.6 Email Configuration

#### Email Service Configuration
- Configure SMTP server settings
- Set SMTP port, username, password
- Configure sender email address
- Set frontend URL for email links
- Enable/disable email service
- Test email configuration
- Secure password storage

#### Email Template Management
- Create email templates
- Template types: registration, verification, approval, rejection
- HTML and plain text template support
- Update email templates
- View all templates
- Customizable email content

### 3.7 Reporting & Analytics

#### Reports & Statistics
- User statistics (total, active, pending, suspended)
- Booking statistics (total, confirmed, pending, rejected, cancelled)
- User registration trends (last 12 months)
- Booking creation trends (last 12 months)
- Pie charts data for bookings by status
- Pie charts data for users by status
- Time-series data for analytics

#### Audit Trail
- Comprehensive system activity log
- Transaction history tracking
- Booking status change tracking
- Member activation tracking
- Filterable by date range
- Detailed activity descriptions
- User and property information
- Chronological sorting

### 3.8 Admin User Management

#### Create Admin Users
- Create additional admin accounts
- Only existing admins can create admins
- Full admin privileges assignment
- Email uniqueness validation

---

## 4. OWNER MODULE FEATURES

### 4.1 Access & Identity

#### OWN-01: Self-Registration
- User registration form
- Email, phone, name, password input
- Email verification requirement
- Pending status until admin approval

#### OWN-02: Account Status Awareness
- Pending status display
- Account activation notification
- Access restrictions for pending users

#### OWN-03: Property Context
- Property information display
- Cottage listing for assigned property
- Property-based dashboard
- Access limited to assigned property only

### 4.2 Booking Calendar & Availability

#### OWN-04: Real-Time Availability
- Cottage availability calendar view
- Date range selection
- Availability status indicators:
  - Available dates
  - Booked dates
  - Maintenance blocked dates
  - Holiday indicators
  - Peak season indicators
- Color-coded calendar display

#### OWN-05: Holiday & Peak Season Transparency
- Visual indicators for holidays
- Peak season date highlighting
- Pricing transparency (weekend pricing for holidays/peak seasons)
- Clear date labeling

#### OWN-06: Cost Calculator
- Pre-booking cost calculation
- Weekday vs weekend credit calculation
- Holiday pricing calculation
- Peak season pricing calculation
- Detailed cost breakdown
- Day-by-day credit calculation

#### OWN-07: Submit Booking Request
- Create booking requests
- Date range selection
- Cottage selection
- Automatic availability validation
- Credit escrow system (credits deducted on submission)
- Insufficient credit validation
- Booking status: PENDING
- Transaction record creation
- Conflict checking (bookings, maintenance)

### 4.3 Quota Management

#### OWN-08: Balance Dashboard
- Weekday quota and balance display
- Weekend quota and balance display
- Available credits calculation
- Pending booking credits (escrow) display
- Confirmed booking credits display
- Visual quota status indicators

#### OWN-09: Escrow Visibility
- Pending booking credits tracking
- Escrowed credits display
- Available vs escrowed credit separation
- Real-time balance updates

#### OWN-10: Transaction History
- Complete transaction ledger
- Transaction types: booking, refund, reset, manual_adjustment, activation
- Credit change tracking (weekday/weekend)
- Transaction descriptions
- Booking association
- Chronological sorting
- Timestamp information

### 4.4 Trip Management (My Stays)

#### OWN-11: Trip Status Tracking
- View all bookings (all statuses)
- Filter by booking status
- Booking details display:
  - Cottage information
  - Check-in/check-out dates
  - Credits used
  - Booking status
  - Creation timestamp
- Chronological sorting

#### OWN-12: Self-Cancellation
- Cancel own bookings
- Automatic credit refund
- Transaction history recording
- Status validation (cannot cancel already cancelled/rejected)
- Full credit restoration

#### OWN-13: Booking Receipt
- Detailed booking receipt generation
- Property and cottage information
- Check-in/check-out dates
- Duration calculation
- Credits breakdown (weekday/weekend)
- Total credits used
- Booking status
- Decision notes (if applicable)
- Guest rules and information

---

## 5. SYSTEM FEATURES

### 5.1 Quota System
- **Annual Quota Allocation:** Default 12 weekday / 6 weekend credits per user
- **Escrow System:** Credits deducted when booking is submitted (pending status)
- **Automatic Refunds:** Credits refunded on rejection or cancellation
- **Transaction Tracking:** All quota changes recorded in transaction history
- **Balance Management:** Real-time balance updates
- **Quota Types:** Separate weekday and weekend quotas
- **Negative Balance Prevention:** System prevents negative balances

### 5.2 Booking Workflow
1. Owner selects dates and cottage
2. System calculates cost (weekday vs weekend credits)
3. Credits are escrowed (deducted from balance)
4. Booking status: PENDING
5. Admin reviews in approval queue
6. Admin approves → CONFIRMED (credits remain deducted)
7. Admin rejects → REJECTED (credits refunded)

### 5.3 Pricing Logic
- **Weekday Pricing:** Standard weekdays (Monday-Friday, non-holiday, non-peak)
- **Weekend Pricing:** Weekends (Saturday-Sunday), holidays, and peak season dates
- **Holiday Pricing:** Holidays automatically use weekend credit pricing
- **Peak Season Pricing:** Peak season dates use weekend credit pricing
- **Transparent Calculation:** Users see breakdown of weekday/weekend/holiday/peak days

### 5.4 Maintenance Blocking
- Blocks specific date ranges for cottages
- Auto-rejects pending bookings in blocked dates
- Prevents new bookings during maintenance
- Automatic credit refunds
- Maintenance reason tracking
- Bulk booking revocation support

### 5.5 Email Notification System
- Registration confirmation emails
- Email verification links
- Account activation notifications
- Booking approval notifications
- Booking rejection notifications
- Member rejection notifications
- Configurable SMTP settings
- Customizable email templates
- Test email functionality

---

## 6. SECURITY FEATURES

### 6.1 Authentication Security
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration (30 minutes for access tokens)
- Secure token generation

### 6.2 Authorization Security
- Role-based access control (admin/owner)
- Status-based access (pending/active/suspended)
- Property-based data isolation
- Endpoint-level authorization checks
- Admin-only endpoint protection

### 6.3 Data Security
- Password encryption
- Email verification tokens (24-hour expiration)
- Password reset tokens (1-hour expiration)
- Secure token storage
- SQL injection prevention (SQLAlchemy ORM)
- Input validation (Pydantic schemas)

### 6.4 API Security
- CORS configuration
- Credential-based authentication
- Protected API endpoints
- Session management

---

## 7. DATABASE FEATURES

### 7.1 Data Models
- **User Model:** Users with roles, status, quota, property assignment
- **Property Model:** Properties/sanctuaries
- **Cottage Model:** Individual cottages under properties
- **Booking Model:** Booking requests with status tracking
- **MaintenanceBlock Model:** Maintenance date ranges
- **SystemCalendar Model:** Holiday and peak season dates
- **PeakSeason Model:** Peak season definitions
- **QuotaTransaction Model:** Transaction history
- **EmailConfig Model:** Email service configuration
- **EmailTemplate Model:** Email template storage

### 7.2 Data Relationships
- Users belong to Properties (many-to-one)
- Cottages belong to Properties (many-to-one)
- Bookings belong to Users and Cottages (many-to-one each)
- Maintenance blocks belong to Cottages (many-to-one)
- Transactions belong to Users (many-to-one)
- Foreign key relationships for data integrity

### 7.3 Data Integrity
- Unique constraints (email, property names)
- Foreign key constraints
- Enum types for status fields
- Timestamp tracking (created_at, updated_at)
- Cascading deletions (where appropriate)

---

## 8. USER INTERFACE FEATURES

### 8.1 Admin Dashboard
- Navigation menu with all admin features
- Dashboard overview
- Module-based organization
- Responsive design

### 8.2 Owner Dashboard
- Property context display
- Navigation menu
- Quota overview
- Quick access to bookings

### 8.3 Calendar Views
- Interactive calendar components
- Color-coded availability
- Date selection
- Month navigation
- Visual status indicators

### 8.4 Forms & Input
- Registration forms
- Login forms
- Booking forms
- Search forms
- Filter components
- Validation feedback

### 8.5 Data Tables
- Member listings
- Booking queues
- Transaction history
- Audit trails
- Sortable columns
- Filterable data

---

## 9. API ENDPOINTS SUMMARY

### Authentication Endpoints
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user
- POST `/api/auth/forgot-password` - Request password reset
- POST `/api/auth/reset-password` - Reset password
- GET `/api/auth/verify-email` - Verify email address

### Admin Endpoints (40+ endpoints)
- Member management (pending, activate, lookup, edit, deactivate, delete, reject)
- Property management (CRUD operations)
- Cottage management (CRUD operations)
- Maintenance blocking (CRUD operations)
- Booking management (approval queue, decisions, revocation, override, calendar)
- Holiday configuration (CRUD operations)
- Peak season management (CRUD operations)
- Quota management (adjustment, reset, history)
- Email configuration (settings, templates, test)
- Reports and statistics
- Audit trail
- Admin user creation

### Owner Endpoints (10+ endpoints)
- Dashboard data
- Availability checking
- Cost calculation
- Booking creation
- Quota status
- Transaction history
- Trip management
- Booking cancellation
- Booking receipt

---

## 10. NON-FUNCTIONAL REQUIREMENTS

### 10.1 Performance
- Fast API responses
- Efficient database queries
- Optimized calendar rendering
- Real-time availability updates

### 10.2 Scalability
- Modular architecture
- Database indexing
- Efficient query patterns
- RESTful API design

### 10.3 Usability
- Intuitive user interface
- Clear navigation
- Visual feedback
- Error messages
- Help text and tooltips

### 10.4 Maintainability
- Clean code structure
- Modular components
- API documentation (Swagger)
- Database migrations support

### 10.5 Reliability
- Error handling
- Transaction management
- Data validation
- Status tracking

---

## 11. IMPLEMENTATION STATUS

All features listed in this document have been **fully implemented** in the codebase, including:
- ✅ Backend API endpoints
- ✅ Frontend React components
- ✅ Database models and relationships
- ✅ Authentication and authorization
- ✅ Email notification system
- ✅ Quota management system
- ✅ Booking workflow
- ✅ Admin dashboard
- ✅ Owner dashboard
- ✅ Calendar interfaces
- ✅ Reporting and analytics
- ✅ Audit trail

---

## 12. SYSTEM ARCHITECTURE

- **Frontend:** React application with TypeScript
- **Backend:** FastAPI REST API
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Authentication:** JWT tokens
- **Email:** SMTP-based email service
- **Deployment:** Docker support (docker-compose.yml)

---

## APPENDIX A: FEATURE IDENTIFIERS

### Admin Features
- ADM-01: Pending Member Queue
- ADM-02: Member Activation & Assignment
- ADM-03: Member Lookup & History
- ADM-04: Manual Quota Adjustment
- ADM-05: Member Deactivation
- ADM-06: Property Management
- ADM-07: Cottage Inventory Management
- ADM-08: Maintenance Blocking
- ADM-09: Inventory Health View
- ADM-10: Approval Queue
- ADM-11: Booking Decision Workflow
- ADM-12: Emergency Revocation
- ADM-13: Admin Override Booking
- ADM-14: Holiday Configuration
- ADM-15: Peak Season Definition
- ADM-16: Global Quota Reset

### Owner Features
- OWN-01: Self-Registration
- OWN-02: Account Status Awareness
- OWN-03: Property Context
- OWN-04: Real-Time Availability
- OWN-05: Holiday & Peak Season Transparency
- OWN-06: Cost Calculator
- OWN-07: Submit Booking Request
- OWN-08: Balance Dashboard
- OWN-09: Escrow Visibility
- OWN-10: Transaction History
- OWN-11: Trip Status Tracking
- OWN-12: Self-Cancellation
- OWN-13: Booking Receipt

---

**End of Document**

