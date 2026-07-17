# 03_User_Account_API.md

# User Account API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 03_User_Account_Database
* 02_Workspace_API
* Architecture v1.0 Frozen

---

# Purpose

The User Account API defines how users register, authenticate, manage sessions, and update their profile in Highlight Signal.

This API identifies **who the user is**.

Workspace APIs determine **what the user can access**.

---

# Domain Responsibility

The User Account API is responsible for:

* Registration
* Login
* Logout
* Token refresh
* Email verification
* Password reset
* Profile retrieval
* Profile update
* Session management
* OAuth provider linking

The User Account API is **not** responsible for:

* Workspace permissions
* Role management
* Signal access
* Recommendation access
* Billing ownership

---

# Base Routes

```text
/api/auth

/api/users/me
```

---

# Authentication

Public endpoints:

```text
POST /api/auth/register

POST /api/auth/login

POST /api/auth/refresh

POST /api/auth/forgot-password

POST /api/auth/reset-password

POST /api/auth/verify-email
```

Private endpoints require:

```text
Authorization: Bearer {access_token}
```

---

# Endpoints

---

## Register

```text
POST /api/auth/register
```

Creates a new user account.

### Auth Required

```text
No
```

### Request Body

```json
{
  "email": "hank@example.com",
  "password": "secure_password",
  "display_name": "Hank",
  "timezone": "Asia/Taipei",
  "locale": "zh-TW"
}
```

### Response

```json
{
  "data": {
    "user_id": "user_uuid",
    "email": "hank@example.com",
    "account_status": "pending_verification",
    "email_verified": false
  }
}
```

---

## Login

```text
POST /api/auth/login
```

Authenticates a user and creates a session.

### Auth Required

```text
No
```

### Request Body

```json
{
  "email": "hank@example.com",
  "password": "secure_password"
}
```

### Response

```json
{
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600,
    "user": {
      "id": "user_uuid",
      "email": "hank@example.com",
      "display_name": "Hank"
    }
  }
}
```

---

## Refresh Token

```text
POST /api/auth/refresh
```

Issues a new access token.

### Auth Required

```text
No
```

### Request Body

```json
{
  "refresh_token": "refresh_token"
}
```

### Response

```json
{
  "data": {
    "access_token": "new_jwt_access_token",
    "expires_in": 3600
  }
}
```

---

## Logout

```text
POST /api/auth/logout
```

Revokes the current session.

### Auth Required

```text
Yes
```

### Request Body

```json
{
  "refresh_token": "refresh_token"
}
```

### Response

```json
{
  "data": {
    "logged_out": true
  }
}
```

---

## Verify Email

```text
POST /api/auth/verify-email
```

Verifies user email.

### Auth Required

```text
No
```

### Request Body

```json
{
  "verification_token": "email_verification_token"
}
```

### Response

```json
{
  "data": {
    "email_verified": true,
    "account_status": "active"
  }
}
```

---

## Forgot Password

```text
POST /api/auth/forgot-password
```

Starts password reset flow.

### Auth Required

```text
No
```

### Request Body

```json
{
  "email": "hank@example.com"
}
```

### Response

```json
{
  "data": {
    "request_received": true
  }
}
```

---

## Reset Password

```text
POST /api/auth/reset-password
```

Resets password using a valid reset token.

### Auth Required

```text
No
```

### Request Body

```json
{
  "reset_token": "password_reset_token",
  "new_password": "new_secure_password"
}
```

### Response

```json
{
  "data": {
    "password_updated": true
  }
}
```

---

# Profile Endpoints

---

## Get Current User

```text
GET /api/users/me
```

Returns current authenticated user.

### Auth Required

```text
Yes
```

### Response

```json
{
  "data": {
    "id": "user_uuid",
    "email": "hank@example.com",
    "account_status": "active",
    "email_verified": true,
    "last_login_at": "2026-07-02T09:30:00Z",
    "profile": {
      "display_name": "Hank",
      "avatar_url": null,
      "company": "Highlight Digital",
      "job_title": "Founder",
      "timezone": "Asia/Taipei",
      "locale": "zh-TW"
    }
  }
}
```

---

## Update Profile

```text
PATCH /api/users/me/profile
```

Updates current user's profile.

### Auth Required

```text
Yes
```

### Request Body

```json
{
  "display_name": "Hank",
  "avatar_url": "https://example.com/avatar.png",
  "company": "Highlight Digital",
  "job_title": "Founder",
  "phone": "+886900000000",
  "country": "Taiwan",
  "timezone": "Asia/Taipei",
  "locale": "zh-TW"
}
```

### Response

```json
{
  "data": {
    "updated": true,
    "updated_at": "2026-07-02T09:30:00Z"
  }
}
```

---

# Session Endpoints

---

## List Active Sessions

```text
GET /api/users/me/sessions
```

Lists active user sessions.

### Auth Required

```text
Yes
```

### Response

```json
{
  "data": [
    {
      "id": "session_uuid",
      "ip_address": "127.0.0.1",
      "user_agent": "Chrome",
      "expires_at": "2026-07-02T10:30:00Z",
      "created_at": "2026-07-02T09:30:00Z"
    }
  ]
}
```

---

## Revoke Session

```text
DELETE /api/users/me/sessions/{session_id}
```

Revokes one session.

### Auth Required

```text
Yes
```

### Response

```json
{
  "data": {
    "revoked": true
  }
}
```

---

# OAuth Endpoints

---

## Start OAuth Login

```text
GET /api/auth/oauth/{provider}/start
```

Starts OAuth login flow.

### Auth Required

```text
No
```

### Supported Providers

```text
google

microsoft

github

apple
```

---

## OAuth Callback

```text
GET /api/auth/oauth/{provider}/callback
```

Handles OAuth callback.

### Auth Required

```text
No
```

### Response

```json
{
  "data": {
    "access_token": "jwt_access_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

---

# Validation Rules

## Email

```text
Required

Valid email format

Lowercase

Unique
```

## Password

```text
Required

Minimum 8 characters

Should include letters and numbers
```

## Locale

```text
zh-TW

en-US
```

## Timezone

Must be valid IANA timezone.

Example:

```text
Asia/Taipei
```

---

# Error Codes

```text
UNAUTHORIZED

INVALID_CREDENTIALS

EMAIL_ALREADY_EXISTS

EMAIL_NOT_VERIFIED

ACCOUNT_LOCKED

ACCOUNT_SUSPENDED

TOKEN_EXPIRED

TOKEN_INVALID

SESSION_REVOKED

VALIDATION_ERROR
```

---

# Future Backend Services Used

```text
Authentication Service

User Profile Service

Session Service

Email Verification Service

Password Recovery Service

OAuth Service

Audit Service
```

---

# Audit Events

User Account API should generate audit events for:

```text
User Registered

User Logged In

User Logged Out

Token Refreshed

Email Verified

Password Reset Requested

Password Updated

Profile Updated

Session Revoked

OAuth Provider Linked
```

---

# Security Rules

APIs must never return:

```text
password_hash

refresh_token_hash

verification_token

reset_token

internal_auth_provider_secret
```

Refresh tokens should be stored hashed in the database.

Password hashes should use secure hashing.

Recommended:

```text
Argon2id
```

---

# Final Rule

The User Account API authenticates identity.

It does not define business ownership.

All workspace access must be resolved through Workspace membership after authentication.
