# Vanatvam Booking System — Application Manual

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Application Flow Diagram](#3-application-flow-diagram)
4. [User Roles](#4-user-roles)
5. [Authentication Flow](#5-authentication-flow)
6. [Owner Workflows](#6-owner-workflows)
7. [Admin Workflows](#7-admin-workflows)
8. [Credit Quota System](#8-credit-quota-system)
9. [Booking Lifecycle](#9-booking-lifecycle)
10. [Calendar & Availability System](#10-calendar--availability-system)
11. [Data Models](#11-data-models)
12. [API Reference](#12-api-reference)

---

## 1. System Overview

**Vanatvam** is a private cottage booking management system for property owners who share access to nature sanctuaries. The system uses a credit-based quota model where each owner receives an annual allocation of weekday and weekend credits to book cottages.

**Core Concepts:**
- Owners book cottages using credits (not money)
- Admins manage the entire system — members, properties, bookings, quotas
- Bookings require admin approval before they are confirmed
- Holiday and peak season dates consume credits differently (weekend rate)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VANATVAM SYSTEM                               │
│                                                                  │
│  ┌──────────────┐    HTTPS     ┌──────────────────────────────┐ │
│  │   Browser    │ ──────────►  │  Firebase Hosting             │ │
│  │  (Mobile /   │              │  React (TypeScript) SPA       │ │
│  │   Desktop)   │              │  vanatvam-booking-app.web.app │ │
│  └──────────────┘              └──────────────┬───────────────┘ │
│                                               │ REST API Calls  │
│                                               ▼                  │
│                                ┌──────────────────────────────┐ │
│                                │  Google Cloud Run             │ │
│                                │  FastAPI (Python 3.11)        │ │
│                                │  Port 8000, Auto-scaling      │ │
│                                └──────────────┬───────────────┘ │
│                                               │ PostgreSQL       │
│                                               ▼                  │
│                                ┌──────────────────────────────┐ │
│                                │  Neon PostgreSQL              │ │
│                                │  ap-southeast-1 (AWS)        │ │
│                                └──────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Google Cloud Storage — Cottage Images                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, TypeScript, Axios       |
| Backend   | FastAPI, Python 3.11, SQLAlchemy  |
| Database  | PostgreSQL (Neon serverless)      |
| Auth      | JWT (HS256, 30-min expiry)        |
| Hosting   | Firebase Hosting + Cloud Run      |
| Storage   | Google Cloud Storage (images)     |
| Email     | SMTP (configurable via Admin UI)  |

---

## 3. Application Flow Diagram

### 3.1 High-Level System Flow

```
                    ┌──────────────────────────────────────┐
                    │           USER VISITS APP             │
                    │   vanatvam-booking-app.web.app        │
                    └──────────────────┬───────────────────┘
                                       │
                    ┌──────────────────▼───────────────────┐
                    │         AUTHENTICATION CHECK          │
                    │   Has valid JWT token in storage?     │
                    └──────┬───────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │         NO TOKEN         │
              │                          │
         ┌────▼──────┐          ┌────────▼──────────────────┐
         │  LOGIN    │          │      HAS TOKEN             │
         │  /login   │          │  Fetch /api/auth/me        │
         └────┬──────┘          └───────┬──────────────────┘
              │                         │
    ┌─────────▼──────────┐     ┌────────▼──────────────────┐
    │  Enter credentials  │     │    Role check              │
    │  POST /api/auth/    │     │    role = ?               │
    │  login              │     └────────┬──────────────────┘
    └─────────┬──────────┘              │
              │                  ┌──────┴──────┐
              │              ADMIN            OWNER
              │                │                │
              │        ┌───────▼──────┐  ┌──────▼──────┐
              │        │/admin/       │  │/owner/       │
              │        │dashboard     │  │dashboard     │
              │        └──────────────┘  └─────────────┘
              │
    ┌─────────▼──────────────────────────────────────┐
    │  NEW USER? → /register                          │
    │  1. POST /api/auth/register                     │
    │  2. Verification email sent                     │
    │  3. User clicks link → /verify-email            │
    │  4. GET /api/auth/verify-email?token=...        │
    │  5. Account status = PENDING                    │
    │  6. Admin reviews in Pending Members queue      │
    │  7. Admin activates → status = ACTIVE           │
    │  8. User can now log in                         │
    └─────────────────────────────────────────────────┘
```

### 3.2 Booking Flow

```
OWNER                          SYSTEM                         ADMIN
  │                               │                              │
  │── Select cottage ────────────►│                              │
  │   (BookingCalendar)           │                              │
  │                               │                              │
  │── Choose check-in/out ───────►│                              │
  │                               │                              │
  │                               │◄─ Check availability ─────► │
  │                               │   (no conflicts, no maint.) │
  │                               │                              │
  │◄─ Show credit cost ──────────│                              │
  │   (weekday + weekend calc)    │                              │
  │                               │                              │
  │── Confirm booking ───────────►│                              │
  │   POST /api/owner/bookings    │                              │
  │                               │                              │
  │                               │── Deduct credits ──────────►│
  │                               │── Create booking ──────────►│
  │                               │   status = PENDING          │
  │                               │                              │
  │◄─ "Booking submitted" ───────│                              │
  │                               │                              │
  │                               │◄─────────────────────────── │
  │                               │   Admin reviews queue        │
  │                               │   ApprovalQueue component    │
  │                               │                              │
  │                               │                 APPROVE ─────│
  │                               │◄── status=CONFIRMED ─────── │
  │                               │◄── Email sent ────────────── │
  │                               │                              │
  │◄─ Confirmed notification ────│                     OR       │
  │                               │                              │
  │                               │                 REJECT ──────│
  │                               │◄── status=REJECTED ──────── │
  │                               │◄── Credits refunded ──────── │
  │                               │◄── Email sent ────────────── │
  │◄─ Rejected notification ─────│                              │
```

### 3.3 Member Activation Flow

```
NEW REGISTRATION                PENDING QUEUE               ACTIVE MEMBER
        │                            │                            │
  /register ──────────────────► Email Verification               │
        │                            │                            │
  Email sent ◄────────────────  status=PENDING                  │
        │                            │                            │
  Click verify link ──────────► Admin sees in                    │
        │                       PendingMembers                    │
  email_verified=true               │                            │
                                     │                            │
                              Admin reviews ──────────────────── │
                                     │                            │
                              Assign property                     │
                              Set weekday quota                   │
                              Set weekend quota                   │
                                     │                            │
                              POST /activate-member ────────────►│
                                                           status=ACTIVE
                                                           Can log in ✓
```

### 3.4 Quota System Flow

```
ANNUAL QUOTA ALLOCATION (Admin sets at member activation)
┌─────────────────────────────────────────────────────┐
│  Weekday Balance:  e.g. 12 credits/year             │
│  Weekend Balance:  e.g. 6 credits/year              │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  BOOKING MADE                                        │
│  Each night costs:                                   │
│  • Mon-Thu (not holiday/peak) → 1 Weekday credit   │
│  • Fri, Sat, Sun → 1 Weekend credit                 │
│  • Holiday / Peak Season date → 1 Weekend credit    │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  BOOKING CANCELLED / REJECTED                        │
│  Credits refunded to owner's balance                │
└─────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│  ANNUAL RESET (Admin initiates)                     │
│  All members reset to their allocated quota          │
│  QuotaReset records transaction history              │
└─────────────────────────────────────────────────────┘
```

---

## 4. User Roles

### 4.1 Admin
Full system access. Responsible for:
- Approving/rejecting new member registrations
- Managing properties and cottages
- Approving/rejecting booking requests
- Adjusting member quotas
- Configuring holidays and peak seasons
- Blocking maintenance dates
- System reporting and audit trail

### 4.2 Owner (Member)
Limited access to their own data:
- View available cottages and check availability
- Submit booking requests
- View their booking history
- Check quota balance and transaction history
- Cancel pending/confirmed bookings

---

## 5. Authentication Flow

```
1. REGISTRATION
   POST /api/auth/register
   Body: { email, password, name, phone }
   → Sends verification email with token
   → User status = PENDING

2. EMAIL VERIFICATION
   GET /api/auth/verify-email?token=<token>
   → Sets email_verified = true
   → Admin still needs to activate account

3. LOGIN
   POST /api/auth/login
   Body: { email, password }
   → Returns: { access_token, token_type: "bearer" }
   → Token stored in localStorage
   → Token expiry: 30 minutes

4. AUTHENTICATED REQUESTS
   All API calls include:
   Header: Authorization: Bearer <access_token>

5. PASSWORD RESET
   POST /api/auth/forgot-password  { email }
   → Sends reset link via email
   POST /api/auth/reset-password   { token, new_password }
   → Updates password
```

**JWT Payload:**
```json
{
  "sub": "user@email.com",
  "user_id": 123,
  "role": "owner",
  "exp": 1234567890
}
```

---

## 6. Owner Workflows

### 6.1 Making a Booking

1. Navigate to **Dashboard → Book a Stay**
2. Select cottage from dropdown (grouped by sanctuary)
3. Set check-in and check-out dates
4. System checks availability (no conflicts, no maintenance)
5. System calculates credit cost breakdown (weekday vs weekend nights)
6. Owner reviews cost and confirms
7. Booking created with status `PENDING`
8. Credits deducted from balance immediately
9. Admin notified — booking appears in Approval Queue
10. Owner receives email once approved/rejected
11. If rejected, credits are automatically refunded

### 6.2 Cancelling a Booking

1. Navigate to **My Trips**
2. Find booking with status `PENDING` or `CONFIRMED`
3. Click "Cancel booking"
4. Confirm cancellation
5. Status changes to `CANCELLED`
6. Credits refunded automatically

### 6.3 Viewing Quota Status

- Navigate to **Quota Status**
- Shows current weekday balance / total weekday quota
- Shows current weekend balance / total weekend quota
- Navigate to **Transaction History** for full credit log

---

## 7. Admin Workflows

### 7.1 Activating a New Member

1. Navigate to **Pending Members**
2. Review new registration (name, email, phone)
3. Click Activate
4. Assign a property (sanctuary)
5. Set weekday quota (credits/year, default 12)
6. Set weekend quota (credits/year, default 6)
7. Submit → member status changes to `ACTIVE`
8. Member receives activation email

### 7.2 Processing Booking Approvals

1. Navigate to **Approval Queue**
2. Review pending bookings (owner, cottage, dates, credits)
3. Click booking to open decision form
4. Choose **Approve** or **Reject**
5. Add optional notes (mandatory for rejection)
6. Submit → booking status updated, email sent to owner
7. If rejected, owner's credits are automatically refunded

### 7.3 Managing Properties & Cottages

**Properties (Sanctuaries):**
- Settings → Sanctuaries tab
- Create/edit sanctuary name and description

**Cottages:**
- Settings → Cottages tab
- Create cottage: assign to sanctuary, set ID (e.g. C-12), capacity, amenities
- Upload image by clicking or dragging onto the image area
- Filter by sanctuary to manage specific cottages

### 7.4 Maintenance Blocking

1. Navigate to **Maintenance**
2. Select cottage from dropdown (grouped by sanctuary)
3. Set start and end dates
4. Add reason (optional)
5. System shows warning if existing bookings overlap those dates
6. Submit → cottage blocked for selected period
7. If conflicting bookings exist, use "Revoke" button to cancel them with refund

### 7.5 Configuring Holidays & Peak Seasons

**Holidays:**
- Settings → Holidays tab
- Add specific dates with holiday names
- Holiday dates charge weekend credit rate

**Peak Seasons:**
- Settings → Peak Seasons tab
- Define named seasons with start/end dates
- Peak season dates charge weekend credit rate

### 7.6 Quota Management

**Adjusting a Member's Quota:**
- Quota Adjustment → search member → enter weekday/weekend change → submit

**Annual Reset:**
- Settings → Quota Reset tab
- Resets ALL members' balances back to their allocated quota
- All reset transactions are logged

### 7.7 Reports & Audit Trail

- **Inventory Health**: Occupancy rates, credit usage statistics
- **Reports** (Calendar → Reports tab): System-wide statistics
- **Audit Trail**: Complete log of all system actions (bookings, activations, quota changes, etc.)
- **Rejected Bookings**: View all rejected/revoked bookings with reasons

---

## 8. Credit Quota System

### Credit Calculation Rules

| Night Type                  | Credit Consumed |
|-----------------------------|-----------------|
| Monday – Thursday           | 1 Weekday credit |
| Friday                      | 1 Weekend credit |
| Saturday                    | 1 Weekend credit |
| Sunday                      | 1 Weekend credit |
| Any Holiday date            | 1 Weekend credit |
| Any Peak Season date        | 1 Weekend credit |

**Example:**
Booking: Thursday (check-in) to Monday (check-out) = 4 nights
- Thursday: 1 weekday credit
- Friday: 1 weekend credit
- Saturday: 1 weekend credit
- Sunday: 1 weekend credit
- **Total: 1 weekday + 3 weekend credits**

**Note:** The check-out day is NOT charged or blocked. A guest checking out on Monday does not consume Monday's credit.

### Quota Transactions

Every credit movement is logged as a `QuotaTransaction`:
- `activation` — initial credits assigned on member activation
- `booking` — credits deducted when booking submitted
- `refund` — credits returned on cancellation/rejection
- `manual_adjustment` — admin manually adjusted balance
- `reset` — annual quota reset

---

## 9. Booking Lifecycle

```
                     ┌───────────┐
                     │  CREATED  │
                     │  PENDING  │◄── Credits deducted
                     └─────┬─────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         APPROVE       REJECT       CANCEL
         (Admin)       (Admin)      (Owner)
              │            │            │
         ┌────▼────┐  ┌────▼────┐  ┌───▼──────┐
         │CONFIRMED│  │REJECTED │  │CANCELLED │
         │         │  │Credits  │  │Credits   │
         │         │  │refunded │  │refunded  │
         └────┬────┘  └─────────┘  └──────────┘
              │
         REVOKE (Admin)
              │
         ┌────▼────┐
         │CANCELLED│
         │Credits  │
         │refunded │
         └─────────┘
```

**Status Transitions:**

| From      | To        | Actor | Action                    |
|-----------|-----------|-------|---------------------------|
| —         | PENDING   | Owner | Submit booking            |
| PENDING   | CONFIRMED | Admin | Approve booking           |
| PENDING   | REJECTED  | Admin | Reject booking + refund   |
| PENDING   | CANCELLED | Owner | Cancel booking + refund   |
| CONFIRMED | CANCELLED | Owner | Cancel confirmed booking  |
| CONFIRMED | CANCELLED | Admin | Revoke booking + refund   |

---

## 10. Calendar & Availability System

### Availability Rules (a date is UNAVAILABLE if any of the following):

1. **Booked** — an active (pending/confirmed) booking exists for that cottage on that date
2. **Maintenance** — a maintenance block covers that date for that cottage
3. **Check-out day** — the check-out date of a booking is NOT blocked (new guests can check in)

### Calendar Display (Admin Bookings Calendar)

- **Green dot** — confirmed or pending booking on that date
- **🟡 Yellow cell** — holiday or peak season date
- **🔧 Wrench icon** — maintenance day
- **Today highlighted** in blue
- Click any date to see all bookings for that day

### Booking Conflict Detection (Maintenance Blocking)

When creating a maintenance block, the form automatically checks for bookings that overlap the selected dates and displays a warning before submission.

---

## 11. Data Models

### Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│    User      │          │   Property   │          │   Cottage    │
│──────────────│          │──────────────│          │──────────────│
│ id (PK)      │          │ id (PK)      │          │ id (PK)      │
│ email        │          │ name         │          │ property_id  │◄─┐
│ name         │          │ description  │          │ cottage_id   │  │
│ phone        │          └──────┬───────┘          │ capacity     │  │
│ role         │                 │ has many          │ amenities    │  │
│ status       │          ┌──────▼───────┐          │ image_url    │  │
│ property_id  │─────────►│              │          └──────┬───────┘  │
│ weekday_bal  │          │ (cottages)   │─────────────────┘          │
│ weekend_bal  │          │              │                              │
│ weekday_quot │          └──────────────┘          ┌──────────────┐  │
│ weekend_quot │                                     │MaintenanceBlk│  │
└──────┬───────┘                                     │──────────────│  │
       │                                             │ id (PK)      │  │
       │ makes                                       │ cottage_id   │──┘
       ▼                                             │ start_date   │
┌──────────────┐          ┌──────────────┐          │ end_date     │
│   Booking    │          │QuotaTransact.│          │ reason       │
│──────────────│          │──────────────│          └──────────────┘
│ id (PK)      │          │ id (PK)      │
│ user_id      │          │ user_id      │          ┌──────────────┐
│ cottage_id   │          │ type         │          │SystemCalendar│
│ check_in     │          │ weekday_chg  │          │──────────────│
│ check_out    │          │ weekend_chg  │          │ id (PK)      │
│ status       │          │ description  │          │ date         │
│ wkday_credits│          │ booking_id   │          │ is_holiday   │
│ wkend_credits│          └──────────────┘          │ is_peak      │
│ decision_note│                                     │ holiday_name │
└──────────────┘                                     └──────────────┘
```

### Key Relationships

| Table            | Relates To    | Type         |
|------------------|---------------|--------------|
| User             | Property      | Many→One     |
| Booking          | User          | Many→One     |
| Booking          | Cottage       | Many→One     |
| Cottage          | Property      | Many→One     |
| MaintenanceBlock | Cottage       | Many→One     |
| QuotaTransaction | User          | Many→One     |
| QuotaTransaction | Booking       | Many→One (opt)|

---

## 12. API Reference

### Base URL
- **Production:** `https://vanatvam-backend-57399834436.asia-south1.run.app`
- **Local Dev:** `http://localhost:8000`

### Authentication Endpoints

| Method | Endpoint                    | Auth | Description               |
|--------|-----------------------------|------|---------------------------|
| POST   | `/api/auth/register`        | None | Register new user         |
| POST   | `/api/auth/login`           | None | Login, returns JWT token  |
| GET    | `/api/auth/me`              | JWT  | Get current user info     |
| GET    | `/api/auth/verify-email`    | None | Verify email via token    |
| POST   | `/api/auth/forgot-password` | None | Request password reset    |
| POST   | `/api/auth/reset-password`  | None | Complete password reset   |

### Owner Endpoints

| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| GET    | `/api/owner/dashboard`                | Dashboard summary             |
| GET    | `/api/owner/availability/{cottageid}` | Cottage availability calendar |
| POST   | `/api/owner/calculate-cost`           | Preview booking credit cost   |
| POST   | `/api/owner/bookings`                 | Submit booking request        |
| GET    | `/api/owner/my-trips`                 | All owner bookings            |
| POST   | `/api/owner/cancel-booking/{id}`      | Cancel a booking              |
| GET    | `/api/owner/booking-receipt/{id}`     | Booking receipt               |
| GET    | `/api/owner/quota-status`             | Current credit balance        |
| GET    | `/api/owner/transactions`             | Credit transaction history    |

### Admin Endpoints (selected)

| Method | Endpoint                              | Description                   |
|--------|---------------------------------------|-------------------------------|
| GET    | `/api/admin/pending-members`          | Members awaiting activation   |
| POST   | `/api/admin/activate-member`          | Activate member               |
| GET    | `/api/admin/approval-queue`           | Bookings awaiting approval    |
| POST   | `/api/admin/booking-decision`         | Approve or reject booking     |
| GET    | `/api/admin/check-booking-conflicts`  | Pre-check maintenance conflicts|
| POST   | `/api/admin/maintenance-blocks`       | Create maintenance block      |
| GET    | `/api/admin/bookings-calendar`        | Full calendar data            |
| POST   | `/api/admin/adjust-quota`             | Adjust member credits         |
| POST   | `/api/admin/reset-all-quotas`         | Annual quota reset            |
| GET    | `/api/admin/audit-trail`             | System audit log              |
| GET    | `/api/admin/reports/statistics`       | System statistics             |

All admin endpoints require JWT token with `role = admin`.

---

*Vanatvam Booking System — Internal Documentation*
*Last updated: May 2026*
