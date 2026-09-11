# Society Management System --- Software Requirements Specification (SRS)

**Version:** 1.0\
**Status:** Product Requirements Baseline\
**Primary Clients:** Resident PWA, Guard App, Admin Panel

------------------------------------------------------------------------

# 1. Introduction

## 1.1 Purpose

This document defines the functional and non-functional requirements for
the Society Management System.

The system provides a centralized digital platform for residential
society administration and visitor/security management through three
client applications:

-   Resident PWA
-   Guard App
-   Admin Panel

The backend provides the shared API, authorization, business logic,
notifications, auditability and persistence.

------------------------------------------------------------------------

# 2. Product Vision

The system should make society access management:

-   Faster
-   Safer
-   Easier for residents
-   Easier for guards
-   More transparent for administrators

The initial product focuses on:

1.  Society structure
2.  Resident management
3.  Guard/gate management
4.  Visitor management
5.  Resident approval
6.  Entry/exit tracking
7.  Notifications
8.  Administration and reporting

------------------------------------------------------------------------

# 3. Actors

## 3.1 Resident

A person associated with a flat/unit.

Can:

-   Install/use PWA
-   Authenticate
-   View profile
-   View unit
-   Manage family/vehicles
-   Create visitor requests
-   Approve/reject visitor requests
-   View visitor history
-   Receive notifications

## 3.2 Guard

A security employee using a dedicated device.

Can:

-   Log in
-   Operate assigned gate
-   Register visitors
-   Scan QR codes
-   Capture visitor photos
-   Select/search units
-   Request resident approval
-   View approval status
-   Record entry/exit

## 3.3 Society Admin

Manages society operations.

Can:

-   Manage buildings
-   Manage flats
-   Manage residents
-   Manage guards
-   Manage gates/devices
-   View visitors
-   View reports
-   Configure society settings

## 3.4 Security Supervisor

A restricted operational role.

Can:

-   Monitor gates
-   Monitor visitors
-   Manage guard assignments
-   Review security activity

## 3.5 Platform Admin

Optional higher-level role for operating multiple societies/properties.

Can manage:

-   Organizations
-   Societies
-   System configuration
-   Platform-level users

------------------------------------------------------------------------

# 4. Scope

## 4.1 In Scope

### Resident

-   QR landing page
-   Interactive landing page
-   PWA installation
-   Authentication
-   Dashboard
-   Profile
-   Flat details
-   Family
-   Vehicles
-   Visitor invitations
-   Visitor approval
-   Visitor history
-   Notifications

### Guard

-   Dedicated Android app
-   Login
-   Gate assignment
-   Visitor registration
-   Visitor photo
-   QR scanning
-   Flat search
-   Resident approval request
-   Allow/reject result
-   Entry
-   Exit
-   Logs
-   Offline queue/sync

### Admin

-   Society management
-   Buildings
-   Floors
-   Flats
-   Residents
-   Guards
-   Gates
-   Devices
-   Visitors
-   Reports
-   Audit logs
-   Roles/permissions

### Backend

-   Authentication
-   Authorization
-   APIs
-   Database
-   Notifications
-   File storage
-   Audit logging
-   Synchronization

------------------------------------------------------------------------

# 5. Out of Scope for Initial Release

The following are deliberately excluded from the first release unless
separately approved:

-   Full accounting/ERP
-   Payment gateway
-   Maintenance billing
-   Advanced vendor management
-   CCTV integration
-   ANPR
-   IoT hardware
-   Smart boom barriers
-   AI visitor recognition
-   WhatsApp automation
-   Native iOS resident application

The architecture may remain ready for future integration, but these
features should not delay the core release.

------------------------------------------------------------------------

# 6. Resident PWA Requirements

## FR-RES-001 --- QR Access

The system shall provide a QR code that opens the resident landing page.

### Flow

``` text
Scan QR
  ↓
Landing Page
  ↓
Install App
  ↓
PWA
```

## FR-RES-002 --- Interactive Landing Page

The landing page shall provide:

-   Society branding
-   Welcome message
-   Product explanation
-   Feature highlights
-   Security/value information
-   Install App CTA
-   Installation fallback instructions

## FR-RES-003 --- PWA Installation

The system shall provide an install experience using supported browser
PWA mechanisms.

If automatic installation is not supported, the system shall display
platform-specific instructions.

## FR-RES-004 --- Authentication

Resident shall authenticate using a supported authentication method,
initially OTP.

## FR-RES-005 --- Resident Dashboard

Dashboard should show:

-   Resident identity
-   Flat/unit
-   Pending visitor approvals
-   Recent visitors
-   Notifications
-   Quick actions

## FR-RES-006 --- Visitor Invitation

Resident shall be able to create a visitor invitation.

Data may include:

-   Visitor name
-   Mobile number
-   Visit date
-   Expected time
-   Purpose
-   Optional notes

## FR-RES-007 --- Visitor Approval

Resident shall receive a visitor approval request.

Actions:

``` text
ALLOW
REJECT
```

The backend shall record the final state.

## FR-RES-008 --- Visitor History

Resident shall view:

-   Visitor name
-   Photo where permitted
-   Date/time
-   Gate
-   Entry status
-   Exit status

## FR-RES-009 --- Family Management

Resident shall be able to manage permitted family member information
subject to authorization rules.

## FR-RES-010 --- Vehicle Management

Resident shall be able to add/view permitted vehicles.

## FR-RES-011 --- Notifications

Resident shall receive notifications for:

-   Visitor request
-   Visitor approval result
-   Important society announcements
-   Security alerts

------------------------------------------------------------------------

# 7. Guard App Requirements

## FR-GRD-001 --- Dedicated Device

The Guard App shall be deployed on a dedicated Android device configured
for kiosk/dedicated-device operation.

The app shall be the primary/only permitted user application under the
device-management configuration.

## FR-GRD-002 --- Guard Login

Guard shall authenticate before accessing security functions.

## FR-GRD-003 --- Gate Assignment

Each guard session shall be associated with an authorized gate.

## FR-GRD-004 --- Visitor Registration

Guard shall create a visitor record.

Required information may include:

-   Name
-   Mobile number where available
-   Visitor type
-   Photo
-   Target flat
-   Gate
-   Timestamp

## FR-GRD-005 --- QR Scan

Guard shall be able to scan a valid visitor/resident-generated QR code
where applicable.

## FR-GRD-006 --- Visitor Photo

Guard shall be able to capture a visitor photograph using the device
camera.

## FR-GRD-007 --- Flat Search

Guard shall search/select the destination flat.

Search may use:

-   Flat number
-   Resident name
-   Building/tower

## FR-GRD-008 --- Approval Request

Guard shall send an approval request to the resident.

## FR-GRD-009 --- Approval Status

The guard shall see:

``` text
PENDING
APPROVED
REJECTED
EXPIRED
```

## FR-GRD-010 --- Entry Logging

When allowed, guard shall record entry.

The record shall contain:

-   Visitor
-   Flat
-   Gate
-   Guard
-   Device
-   Date/time
-   Entry method

## FR-GRD-011 --- Exit Logging

Guard shall record visitor exit.

## FR-GRD-012 --- Offline Logging

The app shall queue supported events while offline and synchronize them
when connectivity returns.

## FR-GRD-013 --- Duplicate Prevention

Repeated taps/network retries shall not create duplicate entry/exit
events.

------------------------------------------------------------------------

# 8. Admin Panel Requirements

## FR-ADM-001 --- Dashboard

Admin dashboard shall provide:

-   Total residents
-   Total flats
-   Active guards
-   Visitors today
-   Pending requests
-   Entries
-   Exits
-   Recent activity

## FR-ADM-002 --- Society Management

Admin shall manage:

-   Society name
-   Address
-   Branding
-   Contact information
-   Configuration

## FR-ADM-003 --- Building Management

Admin shall manage:

-   Buildings/towers
-   Floors
-   Units/flats

## FR-ADM-004 --- Resident Management

Admin shall:

-   Create residents
-   Update residents
-   Activate/deactivate residents
-   Associate residents with flats
-   View resident history where authorized

## FR-ADM-005 --- Guard Management

Admin shall:

-   Create guards
-   Activate/deactivate guards
-   Assign guards
-   Assign gates
-   View guard activity

## FR-ADM-006 --- Gate Management

Admin shall:

-   Create gates
-   Activate/deactivate gates
-   Assign devices
-   View gate status

## FR-ADM-007 --- Visitor Monitoring

Admin shall:

-   Search visitors
-   Filter by date
-   Filter by gate
-   Filter by flat
-   View entry/exit records
-   View approval state

## FR-ADM-008 --- Reports

Reports shall include, at minimum:

-   Daily visitors
-   Entry/exit summary
-   Gate activity
-   Guard activity
-   Approval/rejection summary

## FR-ADM-009 --- Audit Logs

Authorized administrators shall view important system actions.

## FR-ADM-010 --- Permissions

Admin actions shall be controlled by role and permission.

------------------------------------------------------------------------

# 9. Visitor Lifecycle

A visitor request shall follow a controlled state machine.

``` text
CREATED
   |
   v
PENDING_APPROVAL
   |
 +--+----------------+
 |                   |
 v                   v
APPROVED           REJECTED
 |
 v
ENTRY_ALLOWED
 |
 v
ENTERED
 |
 v
EXITED
```

Additional states:

-   EXPIRED
-   CANCELLED
-   NO_SHOW

Invalid state transitions must be rejected by the backend.

------------------------------------------------------------------------

# 10. Visitor Approval Requirements

When a guard sends a request:

1.  Backend validates guard identity.
2.  Backend validates gate.
3.  Backend validates target flat.
4.  Backend creates request.
5.  Resident receives notification.
6.  Resident selects ALLOW or REJECT.
7.  Backend validates resident authorization.
8.  Backend updates request.
9.  Guard receives updated status.
10. Audit record is created.

------------------------------------------------------------------------

# 11. QR Requirements

QR codes may represent:

-   Resident invitation
-   Visitor invitation
-   Temporary visitor pass
-   System onboarding URL

QR data should not expose sensitive information directly.

Prefer opaque identifiers or signed tokens.

Example:

``` text
https://app.example.com/r/Ab83Kx91
```

rather than:

``` text
https://app.example.com/resident?phone=9876543210&flat=402
```

------------------------------------------------------------------------

# 12. Notification Requirements

Notifications shall support:

-   In-app
-   Push

Optional adapters:

-   SMS
-   Email

Notifications shall have:

-   Type
-   Recipient
-   Reference ID
-   Created time
-   Read status
-   Delivery status where applicable

------------------------------------------------------------------------

# 13. File/Photo Requirements

Visitor photographs shall:

-   Be validated for file type
-   Have maximum file size
-   Be stored in private object storage
-   Be accessible only to authorized users
-   Use secure URLs
-   Have retention rules defined by the product owner

------------------------------------------------------------------------

# 14. Authentication Requirements

Authentication shall support:

-   OTP
-   Session/token management
-   Logout
-   Token expiration
-   Device/session revocation

Admin roles should support stronger authentication controls.

------------------------------------------------------------------------

# 15. Authorization Requirements

Authorization shall use RBAC.

Every protected request must validate:

``` text
Identity
+
Role/Permission
+
Society Scope
+
Resource Ownership/Access
```

Example:

A resident can approve a visitor for their authorized flat, but cannot
approve a visitor assigned to another unrelated flat.

------------------------------------------------------------------------

# 16. Security Requirements

The system shall:

-   Use HTTPS in production
-   Validate all inputs
-   Sanitize/encode user-generated content
-   Apply rate limits
-   Secure authentication tokens
-   Protect private files
-   Restrict API access by permission
-   Record sensitive administrative actions
-   Prevent cross-society data access
-   Avoid storing unnecessary personal information
-   Apply secure secrets management

------------------------------------------------------------------------

# 17. Data Requirements

The system shall preserve referential integrity among:

-   Society
-   Building
-   Floor
-   Flat
-   Resident
-   Guard
-   Gate
-   Device
-   Visitor
-   Approval
-   Entry
-   Exit

Deletion should generally use soft-delete/deactivation for records
required for audit/history.

------------------------------------------------------------------------

# 18. Offline Requirements

The Guard App shall detect network status.

When offline:

-   Show offline indicator
-   Continue permitted local operations
-   Queue supported events
-   Avoid silently losing data

When online:

-   Synchronize queued events
-   Retry failures
-   Mark successful synchronization
-   Handle conflicts deterministically

------------------------------------------------------------------------

# 19. Performance Requirements

Initial target:

-   Normal API response: preferably \< 500 ms excluding external
    providers
-   Visitor approval should propagate within a few seconds under normal
    connectivity
-   Admin dashboard should load core data without excessive requests
-   Guard UI should remain responsive on supported dedicated devices

Final production targets should be load-tested.

------------------------------------------------------------------------

# 20. Availability Requirements

The system should be designed so that:

-   Backend can restart without data loss
-   Database has backups
-   Guard local logs survive temporary network loss
-   Notification failures do not corrupt visitor state
-   External provider failure does not break core database operations

------------------------------------------------------------------------

# 21. Usability Requirements

### Resident

The experience must be:

-   Mobile-first
-   Simple
-   Minimal-click
-   Visual
-   Clear about visitor status

### Guard

The interface must be:

-   Large touch targets
-   High readability
-   Fast
-   Low cognitive load
-   Camera/QR friendly
-   Usable under gate conditions

### Admin

The interface must be:

-   Data-dense but organized
-   Searchable
-   Filterable
-   Responsive
-   Suitable for desktop use

------------------------------------------------------------------------

# 22. Error Handling

The system shall provide meaningful states:

``` text
Network unavailable
Request expired
Visitor already entered
Visitor already exited
Unauthorized
Invalid QR
QR expired
Resident unavailable
Photo upload failed
Sync pending
Sync failed
```

Never show raw server stack traces to end users.

------------------------------------------------------------------------

# 23. Reporting Requirements

Reports should support:

-   Date filters
-   Gate filters
-   Building filters
-   Flat filters
-   Visitor type filters

Exports may initially support CSV.

------------------------------------------------------------------------

# 24. Audit Requirements

Audit events should be generated for:

-   Resident creation/update
-   Guard creation/update
-   Gate assignment
-   Permission changes
-   Visitor approval/rejection
-   Visitor entry/exit corrections
-   Important society configuration changes

Audit logs should be append-oriented and protected from ordinary users.

------------------------------------------------------------------------

# 25. Acceptance Criteria --- Core MVP

The MVP is acceptable when all of the following work end-to-end:

### Resident

``` text
QR
→ Landing Page
→ Install PWA
→ Login
→ Dashboard
```

### Guard

``` text
Login
→ Select/assigned gate
→ Visitor
→ Photo
→ Flat
→ Request
```

### Approval

``` text
Guard Request
→ Resident Notification
→ Allow/Reject
→ Guard receives result
```

### Entry

``` text
Allow
→ Entry Log
→ Visitor Enters
→ Exit Log
```

### Admin

``` text
Login
→ Society
→ Flats
→ Residents
→ Guards
→ Gates
→ Visitors
→ Reports
```

### Reliability

``` text
Offline Guard Event
→ Local Queue
→ Internet Restored
→ Sync
→ Server Record
```

------------------------------------------------------------------------

# 26. Definition of Done

A feature is considered complete only when:

-   UI implemented
-   API implemented
-   Database changes implemented
-   Authorization implemented
-   Validation implemented
-   Error states implemented
-   Audit requirements considered
-   Tests added
-   Loading states added
-   Empty states added
-   Mobile behavior verified where applicable
-   Documentation updated

------------------------------------------------------------------------

# 27. Future Requirements

The following can be added later without changing the core client
architecture:

-   Maintenance billing
-   Payments
-   Amenities
-   Complaints/helpdesk
-   Deliveries
-   Parking
-   Vendors
-   Documents
-   Advanced accounting
-   Multi-society administration
-   ANPR
-   CCTV/IoT integrations
-   AI analytics

These are future modules, not MVP acceptance criteria.
