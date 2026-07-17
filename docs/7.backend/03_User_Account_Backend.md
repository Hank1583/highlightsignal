# 03_User_Account_Backend.md

# User Account Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 03_User_Account_Database
* 03_User_Account_API
* 02_Workspace_Backend
* Architecture v1.0 Frozen

---

# Purpose

The User Account Backend implements identity management, authentication, profile management, session management, and account security for Highlight Signal.

The User Account domain answers:

> **Who is the user?**

Workspace determines what the user can access.

Authentication determines who the user is.

---

# Domain Responsibility

The User Account Backend is responsible for:

* User registration
* Authentication
* JWT management
* Session management
* Email verification
* Password recovery
* User profile
* OAuth authentication
* Account security

The User Account Backend is **not** responsible for:

* Workspace permissions
* Business authorization
* Signal management
* Recommendation management

---

# Module Structure

```text id="userbe01"
Modules/
└── UserAccount/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    └── Jobs/
```

---

# Core Components

## Controllers

```text id="userbe02"
AuthenticationController

ProfileController

SessionController

OAuthController
```

Controllers should:

* Validate requests
* Authenticate user
* Invoke services
* Return DTOs

Controllers should never implement authentication logic directly.

---

## Services

```text id="userbe03"
AuthenticationService

UserProfileService

SessionService

PasswordService

EmailVerificationService

OAuthService
```

Business logic belongs entirely to Services.

---

## Repositories

```text id="userbe04"
UserRepository

ProfileRepository

SessionRepository

OAuthRepository
```

Repositories perform persistence only.

---

## Validators

```text id="userbe05"
RegisterValidator

LoginValidator

PasswordValidator

ProfileValidator

OAuthValidator
```

---

## Policies

```text id="userbe06"
UserPolicy

SessionPolicy
```

Policies verify ownership and access.

---

# Service Responsibilities

---

## AuthenticationService

Responsible for:

```text id="userbe07"
Register User

Login

Logout

Refresh Token

JWT Validation

Account Lock

Failed Login Tracking
```

Authentication logic should remain centralized.

---

## UserProfileService

Responsible for:

```text id="userbe08"
Retrieve Profile

Update Profile

Avatar Update

Locale

Timezone

Preferences
```

---

## SessionService

Responsible for:

```text id="userbe09"
Create Session

List Sessions

Revoke Session

Expire Session

Cleanup Expired Sessions
```

---

## PasswordService

Responsible for:

```text id="userbe10"
Forgot Password

Password Reset

Password Update

Password Validation
```

Passwords should never be reversible.

---

## EmailVerificationService

Responsible for:

```text id="userbe11"
Generate Verification Token

Validate Token

Activate Account

Resend Verification Email
```

---

## OAuthService

Responsible for:

```text id="userbe12"
Google Login

Microsoft Login

GitHub Login

Apple Login

Provider Linking
```

External provider handling is isolated here.

---

# Transaction Boundaries

## Register User

Transaction:

```text id="userbe13"
Create User

↓

Create Profile

↓

Generate Verification Token

↓

Create Audit Record

↓

Queue Verification Email

↓

Commit
```

Email delivery occurs asynchronously.

---

## Password Reset

Transaction:

```text id="userbe14"
Validate Reset Token

↓

Update Password Hash

↓

Invalidate Sessions

↓

Create Audit Record

↓

Commit
```

---

## Login

Transaction:

```text id="userbe15"
Validate Credentials

↓

Create Session

↓

Issue JWT

↓

Update Last Login

↓

Create Audit Record
```

---

# Repository Interfaces

## UserRepository

```text id="userbe16"
findById()

findByEmail()

create()

update()

lock()

exists()
```

---

## ProfileRepository

```text id="userbe17"
find()

create()

update()
```

---

## SessionRepository

```text id="userbe18"
findByUser()

create()

revoke()

deleteExpired()
```

---

## OAuthRepository

```text id="userbe19"
findProvider()

create()

link()

unlink()
```

---

# Authentication Flow

Standard login flow:

```text id="userbe20"
Request

↓

Validate Credentials

↓

Check Account Status

↓

Create Session

↓

Generate JWT

↓

Return DTO

↓

Audit Record
```

---

# JWT Strategy

Recommended token model:

```text id="userbe21"
Access Token

↓

Short Lifetime

↓

Refresh Token

↓

Long Lifetime

↓

Stored Hashed
```

Access Tokens should never be persisted.

Refresh Tokens should be stored as hashes.

---

# Password Strategy

Recommended algorithm:

```text id="userbe22"
Argon2id
```

Rules:

```text id="userbe23"
Never Store Plain Text

Never Log Passwords

Never Return Password Hash

Always Verify Through Hash
```

---

# Session Strategy

Each login creates a new session.

Session contains:

```text id="userbe24"
Device

IP Address

User Agent

Created Time

Expires Time
```

Multiple active sessions are supported.

---

# Email Flow

Verification flow:

```text id="userbe25"
Register

↓

Verification Token

↓

Queue Email

↓

User Clicks Link

↓

Activate Account
```

Password recovery:

```text id="userbe26"
Forgot Password

↓

Reset Token

↓

Queue Email

↓

Reset Password
```

---

# External Providers

Provider adapters:

```text id="userbe27"
GoogleOAuthClient

MicrosoftOAuthClient

GitHubOAuthClient

AppleOAuthClient
```

Domain services should communicate only through adapters.

---

# DTO Strategy

## Request DTOs

```text id="userbe28"
RegisterRequest

LoginRequest

RefreshTokenRequest

ResetPasswordRequest

UpdateProfileRequest
```

---

## Response DTOs

```text id="userbe29"
UserDTO

ProfileDTO

SessionDTO

TokenDTO
```

Database entities should never be exposed directly.

---

# Error Handling

Domain exceptions:

```text id="userbe30"
InvalidCredentialsException

EmailAlreadyExistsException

AccountLockedException

EmailNotVerifiedException

InvalidTokenException

ExpiredTokenException

SessionExpiredException

OAuthProviderException
```

Exceptions should be mapped to API error codes centrally.

---

# Audit Strategy

Audit records should be generated for:

```text id="userbe31"
User Registered

User Logged In

User Logged Out

Token Refreshed

Password Changed

Password Reset

Profile Updated

Email Verified

Session Revoked

OAuth Linked
```

Audit logging belongs to the Service layer.

---

# Background Jobs

Worker jobs:

```text id="userbe32"
Send Verification Email

Send Password Reset Email

Cleanup Expired Sessions

Cleanup Expired Tokens
```

Workers execute through the shared job queue.

---

# Security Rules

The User Account module must enforce:

```text id="userbe33"
Secure Password Hashing

JWT Validation

Token Expiration

Session Revocation

Rate Limiting

Account Lockout

Audit Logging
```

Authentication must remain independent of Workspace authorization.

---

# Performance Strategy

Frequently accessed objects:

```text id="userbe34"
User Profile

Active Session

JWT Validation

OAuth Configuration
```

Configuration may be cached.

Authentication state should always be validated against persistent storage when required.

---

# Testing Strategy

Unit Tests:

```text id="userbe35"
AuthenticationService

PasswordService

SessionService

OAuthService
```

Integration Tests:

```text id="userbe36"
Register

Login

Refresh Token

Logout

Password Reset

Email Verification

OAuth Login
```

---

# Dependency Graph

```text id="userbe37"
AuthenticationController

↓

AuthenticationService

↓

UserRepository

↓

Database
```

Supporting services:

```text id="userbe38"
AuthenticationService

↓

SessionService

↓

AuditService

↓

JobService
```

Dependencies should remain one-directional.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="userbe39"
AuthenticationController

ProfileController

SessionController

AuthenticationService

PasswordService

SessionService

Repositories

Validators

Policies

DTOs

Worker Jobs

JWT Middleware

Unit Tests
```

---

# Final Rule

The User Account Backend is the identity foundation of Highlight Signal.

It authenticates users, secures accounts, manages sessions, and protects credentials.

Authentication determines **who the user is**.

Authorization determines **what the user can do**.

The module must provide secure, auditable, and scalable identity management while remaining fully compatible with the PHP-first modular monolith architecture.
