# Society Management System --- Software Design Document (SDD)

**Version:** 1.0\
**Status:** Baseline Architecture\
**Scope:** Resident PWA + Guard Mobile App + Admin Panel + Backend +
Database

------------------------------------------------------------------------

## 1. Document Purpose

This Software Design Document defines the technical architecture,
application boundaries, modules, data model, security model,
communication patterns, deployment approach, and implementation
decisions for the Society Management System.

The system is designed as a scalable foundation for a modern residential
society/security platform while intentionally keeping the initial
product boundary to three client applications:

1.  **Resident PWA**
2.  **Guard App**
3.  **Admin Panel**

All three clients communicate with a central backend API. The backend
owns business rules and communicates with the database and supporting
infrastructure.

The architecture should be simple enough for an initial implementation
but structured so additional capabilities can be introduced without
rewriting the core system.

------------------------------------------------------------------------

# 2. Product Architecture

## 2.1 High-Level Architecture

``` text
                         SOCIETY MANAGEMENT SYSTEM
                                  |
          +-----------------------+-----------------------+
          |                       |                       |
          v                       v                       v
   +-------------+        +-------------+        +-------------+
   | Resident PWA|        |  Guard App  |        | Admin Panel |
   | React/TS    |        | Flutter     |        | React/TS    |
   +------+------+        +------+------+        +------+------+
          |                       |                       |
          +-----------------------+-----------------------+
                                  |
                              HTTPS / REST
                                  |
                                  v
                       +---------------------+
                       |      BACKEND        |
                       | Node.js / NestJS    |
                       +----------+----------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
       +-------------+      +-----------+      +-------------+
       | PostgreSQL  |      |   Redis   |      | File/Object |
       | Database    |      | Cache     |      | Storage     |
       +-------------+      +-----------+      +-------------+
```

## 2.2 Application Responsibilities

### Resident PWA

Responsible for:

-   QR-based resident onboarding entry point
-   Interactive landing page
-   PWA installation experience
-   OTP authentication
-   Resident profile
-   Flat/unit information
-   Family member management
-   Vehicle management
-   Visitor invitations
-   Visitor approval/rejection
-   Visitor history
-   Notifications
-   Basic society communication

### Guard App

Responsible for:

-   Dedicated Android security device operation
-   Guard authentication
-   Gate assignment
-   Visitor registration
-   Visitor photo capture
-   QR/pass scanning
-   Flat selection/search
-   Resident approval request
-   Approval/rejection status
-   Entry logging
-   Exit logging
-   Visitor history
-   Delivery/vehicle workflows where enabled
-   Offline operation and later synchronization

### Admin Panel

Responsible for:

-   Society setup
-   Buildings/blocks/towers
-   Floors
-   Flats/units
-   Resident management
-   Guard management
-   Gate/device management
-   Visitor monitoring
-   Reports
-   Notifications/announcements
-   Role and permission management
-   Audit logs
-   System configuration

### Backend

Responsible for:

-   Authentication and authorization
-   Business rules
-   Data validation
-   Visitor lifecycle
-   Approval workflow
-   Notification orchestration
-   Audit logging
-   Device/session management
-   Reporting APIs
-   File upload authorization
-   Database transactions
-   Offline synchronization APIs

------------------------------------------------------------------------

# 3. Architectural Style

## 3.1 Initial Architecture: Modular Monolith

The recommended first implementation is a **modular monolith**, not
microservices.

``` text
Backend
 |
 +-- Auth Module
 +-- Society Module
 +-- Resident Module
 +-- Guard Module
 +-- Visitor Module
 +-- Gate Module
 +-- Notification Module
 +-- File Module
 +-- Report Module
 +-- Audit Module
```

All modules live in one backend application but maintain clear
boundaries.

### Why modular monolith?

-   Faster development
-   Easier debugging
-   Easier deployment
-   Lower infrastructure complexity
-   Strong transaction support
-   Clear future migration path
-   Appropriate for an initial society platform

Microservices should only be introduced when actual scale, team
structure, deployment independence, or workload characteristics justify
them.

------------------------------------------------------------------------

# 4. Technology Stack

## 4.1 Resident PWA

Recommended:

-   React
-   TypeScript
-   Vite
-   React Router
-   PWA/Web App Manifest
-   Service Worker
-   Responsive CSS/Tailwind or equivalent
-   API client using fetch/Axios
-   Local storage/IndexedDB where required

## 4.2 Guard App

Recommended:

-   Flutter
-   Dart
-   Android-first deployment
-   Camera integration
-   QR/barcode scanning
-   Local SQLite/Hive storage
-   Secure local credentials
-   Network connectivity detection
-   Background/foreground synchronization where permitted

The guard device should run in **Android dedicated-device/kiosk mode**.
The kiosk configuration is a device-management concern in addition to
the Flutter application itself.

## 4.3 Admin Panel

Recommended:

-   React
-   TypeScript
-   Vite
-   React Router
-   Data tables
-   Charts
-   Form validation
-   Responsive desktop-first layout

## 4.4 Backend

Recommended:

-   Node.js
-   NestJS
-   TypeScript
-   REST API
-   WebSocket support for real-time approval status where needed
-   ORM such as Prisma or TypeORM
-   Validation layer
-   Authentication middleware/guards

## 4.5 Database

Recommended:

-   PostgreSQL

Reasons:

-   Strong relational model
-   ACID transactions
-   Constraints
-   Excellent indexing
-   Mature tooling
-   Suitable for society, resident, visitor and audit relationships

## 4.6 Supporting Services

-   Redis for cache/session/rate-limit/temporary state
-   Object storage for visitor photographs and documents
-   Push notification provider
-   Email/SMS provider as required
-   HTTPS/TLS
-   Monitoring and centralized logs

------------------------------------------------------------------------

# 5. Resident PWA Architecture

## 5.1 QR Entry Flow

``` text
Resident QR
    |
    v
QR Scan
    |
    v
Interactive Landing Website
    |
    +-- Society branding
    +-- Welcome information
    +-- Product features
    +-- Security information
    +-- Install App CTA
    |
    v
Install PWA
    |
    v
Home Screen
    |
    v
Open Resident PWA
    |
    v
OTP Login
    |
    v
Resident Dashboard
```

The landing page and application can be served from the same web
deployment but should be treated as separate UX states.

## 5.2 PWA Installation

The implementation should use the browser's supported PWA installation
mechanism.

Important constraint:

-   Android/Chromium browsers can generally support an install prompt.
-   iOS/Safari has platform-specific restrictions and may require user
    guidance for Add to Home Screen.

The UI must therefore provide a fallback installation guide rather than
assuming automatic installation on every device.

------------------------------------------------------------------------

# 6. Guard App Architecture

## 6.1 Dedicated Device Model

``` text
Android Device
 |
 +-- Device Management / Kiosk Configuration
 |
 +-- Guard App
       |
       +-- Authentication
       +-- Gate Assignment
       +-- Visitor
       +-- QR Scanner
       +-- Camera
       +-- Approval
       +-- Entry/Exit
       +-- Offline Store
       +-- Sync Engine
```

The device should be provisioned as a dedicated security terminal.

The application itself should not assume that it can technically block
every other Android function. That control belongs to Android
dedicated-device management, kiosk/lock-task configuration, and
optionally an MDM/EMM solution.

## 6.2 Guard Workflow

``` text
Guard Device
    |
    v
Guard App Auto Launch
    |
    v
Guard Login / PIN / OTP
    |
    v
Assigned Gate
    |
    v
Guard Dashboard
    |
    v
Visitor Arrives
    |
    +-- Scan QR
    +-- Search Flat
    +-- Register Visitor
    |
    v
Capture Photo
    |
    v
Select Flat
    |
    v
Create Approval Request
    |
    v
Resident Notification
    |
    +----------+----------+
    |                     |
   ALLOW                REJECT
    |                     |
    v                     v
Entry Allowed         Entry Denied
    |
    v
Entry Log
    |
    v
Visitor Exits
    |
    v
Exit Log
```

------------------------------------------------------------------------

# 7. Real-Time Approval Architecture

For approval requests, REST is used for commands/data retrieval and
WebSockets or push notifications can be used for real-time status.

``` text
Guard
  |
  | POST /visitor-requests
  v
Backend
  |
  +--> Database
  |
  +--> Notification Service
  |
  v
Resident PWA
  |
  | ALLOW / REJECT
  v
Backend
  |
  +--> Update Request
  +--> Audit Event
  +--> Notify Guard
  |
  v
Guard App
```

The backend remains the source of truth.

The client must never directly modify approval state in the database.

------------------------------------------------------------------------

# 8. Offline Guard Architecture

Security gates must continue operating when network connectivity is
unstable.

## 8.1 Offline Strategy

The guard app maintains a local store for:

-   Device/gate configuration
-   Recently synchronized resident/unit data
-   Pending local logs
-   Temporary visitor records
-   Synchronization state

``` text
             Guard App
                 |
        +--------+--------+
        |                 |
     ONLINE             OFFLINE
        |                 |
        v                 v
   Backend API       Local Database
        |                 |
        |                 v
        |             Pending Queue
        |                 |
        +--------<--------+
             Sync
```

## 8.2 Offline Rules

Not every action can be safely approved offline.

For example:

-   Previously known resident/unit lookup: can be available offline.
-   Capturing an entry event: can be queued offline.
-   New remote resident approval: requires connectivity unless a
    specifically designed fallback policy exists.
-   Financial or administrative mutations: should generally require
    server confirmation.

Conflict resolution must use server timestamps, event IDs, and
idempotency keys.

------------------------------------------------------------------------

# 9. Backend Module Design

## 9.1 Auth Module

Responsibilities:

-   OTP authentication
-   Login/session management
-   Access tokens
-   Refresh tokens where used
-   Password/PIN support for controlled roles
-   Role-based authorization
-   Device/session management

## 9.2 Society Module

Entities:

-   Society
-   Building/Block/Tower
-   Floor
-   Flat/Unit
-   Gate

Responsibilities:

-   Hierarchy management
-   Society configuration
-   Gate mapping

## 9.3 Resident Module

Entities:

-   User
-   Resident profile
-   Family member
-   Vehicle
-   Unit membership

Responsibilities:

-   Resident onboarding
-   Unit association
-   Family and vehicle management
-   Resident status

## 9.4 Guard Module

Entities:

-   Guard
-   Guard assignment
-   Guard shift
-   Guard-device assignment

Responsibilities:

-   Guard authentication
-   Gate assignment
-   Device assignment
-   Guard activity

## 9.5 Visitor Module

Entities:

-   Visitor
-   Visitor request
-   Visitor pass
-   Visitor entry
-   Visitor exit

Responsibilities:

-   Visitor registration
-   Pre-approval
-   Approval workflow
-   Photo metadata
-   Entry/exit lifecycle
-   Visitor history

## 9.6 Notification Module

Responsibilities:

-   Push notifications
-   In-app notifications
-   Email/SMS adapters
-   Notification templates
-   Delivery status
-   Retry strategy

## 9.7 Audit Module

Every important mutation should produce an audit record.

Example:

``` text
actor_id
action
resource_type
resource_id
old_value
new_value
timestamp
device_id
ip_address
```

Sensitive values should not be blindly copied into logs.

------------------------------------------------------------------------

# 10. Data Model

Core relationships:

``` text
Society
  |
  +-- Buildings
        |
        +-- Floors
              |
              +-- Flats
                    |
                    +-- Residents
                    +-- Family Members
                    +-- Vehicles

Society
  |
  +-- Gates
        |
        +-- Guard Assignments
        +-- Devices

Resident
  |
  +-- Visitor Requests
          |
          +-- Visitor
          +-- Approval
          +-- Entry
          +-- Exit
```

## 10.1 Core Tables

Recommended baseline:

-   users
-   roles
-   permissions
-   user_roles
-   societies
-   buildings
-   floors
-   flats
-   resident_units
-   family_members
-   vehicles
-   guards
-   gates
-   guard_gate_assignments
-   devices
-   device_assignments
-   visitors
-   visitor_requests
-   visitor_approvals
-   visitor_entries
-   visitor_exits
-   notifications
-   files
-   audit_logs
-   refresh_sessions
-   sync_events

Exact schema names can be adapted to the ORM conventions.

------------------------------------------------------------------------

# 11. Multi-Tenant Readiness

Even if the first deployment contains one society, database design
should include tenant boundaries.

At minimum, business data should be associated with a society/property
context.

Example:

``` text
societies
  id

flats
  id
  society_id

users
  id

resident_units
  user_id
  flat_id
  society_id
```

Authorization must validate both:

1.  User permission
2.  User's society/property scope

A user from Society A must never access Society B data simply by
changing an ID in an API request.

------------------------------------------------------------------------

# 12. RBAC

Recommended roles:

-   Platform Admin
-   Society Admin
-   Society Manager
-   Security Supervisor
-   Guard
-   Resident

Permissions should be action-oriented:

``` text
visitor.read
visitor.create
visitor.approve
visitor.reject
visitor.entry
visitor.exit

resident.read
resident.create
resident.update

society.manage
gate.manage
guard.manage
report.view
audit.view
```

Avoid implementing authorization with hard-coded checks such as:

``` text
if role == "admin"
```

everywhere.

Use centralized permission guards/policies.

------------------------------------------------------------------------

# 13. API Design

Base:

``` text
/api/v1
```

Example endpoints:

### Authentication

``` text
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
```

### Society

``` text
GET /societies/:id
GET /societies/:id/buildings
GET /societies/:id/gates
```

### Residents

``` text
GET /residents/me
GET /residents/me/visitors
POST /residents/me/visitors
```

### Visitor

``` text
POST /visitor-requests
GET /visitor-requests/:id
POST /visitor-requests/:id/approve
POST /visitor-requests/:id/reject
POST /visitors/:id/entry
POST /visitors/:id/exit
```

### Admin

``` text
GET /admin/dashboard
GET /admin/residents
GET /admin/guards
GET /admin/visitors
GET /admin/reports
GET /admin/audit-logs
```

API naming should be consistent and versioned.

------------------------------------------------------------------------

# 14. API Security

All APIs must enforce:

-   HTTPS
-   Authentication
-   Authorization
-   Input validation
-   Rate limiting
-   Request size limits
-   Secure headers
-   CORS policy
-   File validation
-   Audit logging for sensitive mutations
-   Parameterized queries/ORM protections

Never trust:

-   User IDs supplied by the client
-   Society IDs supplied by the client
-   Role values supplied by the client
-   Payment/approval status from the client

The server determines authorization and final state.

------------------------------------------------------------------------

# 15. File Storage

Visitor photos should not be stored as large binary values in ordinary
relational rows.

Recommended:

``` text
Guard
  |
  v
Backend upload endpoint
  |
  v
Object Storage
  |
  v
File ID / secure URL
  |
  v
Database metadata
```

Store:

-   file_id
-   object_key
-   owner/resource reference
-   MIME type
-   size
-   checksum if needed
-   created_at

Use signed/private URLs for sensitive files.

------------------------------------------------------------------------

# 16. Notification Architecture

``` text
Backend Event
     |
     v
Notification Module
     |
 +---+---+---+
 |   |   |   |
Push In-App Email SMS
```

Priority should be:

1.  Resident approval request
2.  Emergency/security alert
3.  Important society announcement
4.  General notification

Notification delivery should be asynchronous where appropriate.

------------------------------------------------------------------------

# 17. Reliability and Idempotency

Critical operations should be idempotent.

Example:

``` text
POST /visitors/123/entry
Idempotency-Key: ENTRY-DEVICE1-123-20260905-001
```

If the guard taps twice because the network is slow, the backend should
not create two entry records.

Use:

-   unique event IDs
-   idempotency keys
-   database constraints
-   transactions

------------------------------------------------------------------------

# 18. Observability

Production deployment should include:

### Logs

-   API request logs
-   Error logs
-   Security events
-   Background job logs

### Metrics

-   API latency
-   Error rate
-   Active devices
-   Notification success rate
-   Visitor request processing time
-   Offline sync failures

### Health checks

``` text
GET /health
GET /health/db
GET /health/redis
```

Do not expose sensitive system information through public health
endpoints.

------------------------------------------------------------------------

# 19. Deployment Architecture

Initial production:

``` text
Internet
   |
HTTPS / Domain
   |
Reverse Proxy / Load Balancer
   |
Backend
   |
+-- PostgreSQL
+-- Redis
+-- Object Storage
+-- Notification Provider
```

Frontend:

``` text
Resident PWA --> CDN/static hosting
Admin Panel  --> CDN/static hosting
```

Guard:

``` text
Flutter APK
   |
Dedicated Android Device
```

CI/CD:

``` text
Git Repository
      |
   CI Pipeline
      |
  Tests + Lint
      |
 Build
      |
 Deploy
```

------------------------------------------------------------------------

# 20. Scalability Strategy

Do not start with microservices.

Scale in this order:

1.  Good database indexes
2.  Query optimization
3.  Connection pooling
4.  Redis caching
5.  Background jobs
6.  CDN/object storage
7.  Horizontal API replicas
8.  Read replicas if necessary
9.  Separate heavy workloads
10. Microservices only when justified

The architecture should support future extraction of modules such as
notifications, reporting, or analytics without requiring a rewrite.

------------------------------------------------------------------------

# 21. Future-Ready Boundaries

The current product intentionally stays within three applications.

Future integrations can be added behind interfaces/adapters:

``` text
Notification Provider
Payment Provider
SMS Provider
Email Provider
Object Storage
Device Management
ANPR
CCTV
IoT
```

These should not leak provider-specific logic throughout the business
layer.

------------------------------------------------------------------------

# 22. Key Architectural Decisions

  Decision          Recommendation
  ----------------- ----------------------------
  Resident client   React + TypeScript PWA
  Guard client      Flutter Android
  Admin client      React + TypeScript
  Backend           NestJS / Node.js
  Architecture      Modular monolith
  Database          PostgreSQL
  Cache             Redis
  File storage      Object storage
  API               REST + optional WebSocket
  Authentication    OTP/session/token based
  Authorization     RBAC + scope
  Guard device      Android dedicated/kiosk
  Offline           Local store + sync queue
  Deployment        Cloud/container ready
  Multi-society     Schema/authorization ready

------------------------------------------------------------------------

# 23. Non-Functional Goals

The system should target:

-   Secure access
-   High availability
-   Fast visitor approval
-   Reliable gate operation
-   Offline tolerance
-   Auditability
-   Maintainability
-   Responsive UI
-   Data isolation
-   Recoverability
-   Horizontal scalability

Exact SLA/SLO targets should be defined after expected user/device
volume is known.

------------------------------------------------------------------------

# 24. Final Architecture Principle

The core principle is:

> **Clients are interfaces. Backend owns the rules. Database owns
> durable state.**

``` text
Resident PWA
       |
Guard App -----> Backend API -----> PostgreSQL
       |              |
Admin Panel           +----> Redis
                      |
                      +----> Object Storage
                      |
                      +----> Notifications
```

The system should remain modular, secure, testable and scalable without
introducing unnecessary distributed-system complexity in the first
version.
