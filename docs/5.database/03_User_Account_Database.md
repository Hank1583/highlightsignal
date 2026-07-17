# 03_User_Account_Database.md

# User Account Database

Version: v1.0

Status: Draft

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 03_Workspace_Framework
* Architecture v1.0 Frozen

---

# Purpose

The User Account database defines the identity layer of Highlight Signal.

Its responsibility is to identify users, authenticate access, manage login sessions, and support multiple authentication providers.

The User Account domain does not define business ownership.

Workspace ownership and permissions are handled by the Workspace domain.

---

# Domain Responsibility

The User Account domain is responsible for:

* User identity
* Authentication
* User profile
* Login sessions
* OAuth providers
* Email verification
* Password management
* Account lifecycle

The User Account domain is **not** responsible for:

* Workspace permissions
* Role management
* Signal ownership
* AI recommendations
* Notification preferences

---

# Core Entities

```text
users

user_profiles

user_auth_providers

user_sessions
```

---

# Entity Definition

---

## users

Represents a unique identity within Highlight Signal.

### Fields

| Field          | Type         | Required | Description                      |
| -------------- | ------------ | -------- | -------------------------------- |
| id             | UUID         | Yes      | Primary key                      |
| email          | VARCHAR(255) | Yes      | Login email                      |
| password_hash  | VARCHAR      | No       | Nullable for OAuth-only accounts |
| account_status | VARCHAR(30)  | Yes      | Account status                   |
| email_verified | BOOLEAN      | Yes      | Email verification               |
| last_login_at  | TIMESTAMP    | No       | Last login                       |
| created_at     | TIMESTAMP    | Yes      | Created time                     |
| updated_at     | TIMESTAMP    | Yes      | Updated time                     |
| deleted_at     | TIMESTAMP    | No       | Soft delete                      |

---

### Account Status

```text
active

pending_verification

locked

suspended

deleted
```

---

## user_profiles

Stores personal profile information.

Exactly one profile exists for each user.

### Fields

| Field        | Type         |
| ------------ | ------------ |
| user_id      | UUID         |
| display_name | VARCHAR(100) |
| avatar_url   | TEXT         |
| company      | VARCHAR(150) |
| job_title    | VARCHAR(100) |
| phone        | VARCHAR(50)  |
| country      | VARCHAR(50)  |
| timezone     | VARCHAR(50)  |
| locale       | VARCHAR(20)  |
| created_at   | TIMESTAMP    |
| updated_at   | TIMESTAMP    |

---

## user_auth_providers

Stores external authentication providers.

A user may connect multiple providers.

### Fields

| Field            | Type      |
| ---------------- | --------- |
| id               | UUID      |
| user_id          | UUID      |
| provider         | VARCHAR   |
| provider_user_id | VARCHAR   |
| provider_email   | VARCHAR   |
| linked_at        | TIMESTAMP |
| created_at       | TIMESTAMP |

---

### Providers

```text
Email

Google

Microsoft

GitHub

Apple
```

---

## user_sessions

Stores active login sessions.

Each login generates a session.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| user_id            | UUID      |
| session_token      | VARCHAR   |
| refresh_token_hash | VARCHAR   |
| ip_address         | VARCHAR   |
| user_agent         | TEXT      |
| expires_at         | TIMESTAMP |
| revoked_at         | TIMESTAMP |
| created_at         | TIMESTAMP |

---

# Relationships

```text
users

↓

user_profiles

↓

user_auth_providers

↓

user_sessions
```

---

## Cardinality

```text
User

↓

One Profile

User

↓

Many Auth Providers

User

↓

Many Sessions
```

---

# Primary Keys

```text
users.id

user_auth_providers.id

user_sessions.id
```

Profile uses:

```text
user_id
```

as its primary key.

---

# Foreign Keys

```text
user_profiles.user_id
→ users.id
```

```text
user_auth_providers.user_id
→ users.id
```

```text
user_sessions.user_id
→ users.id
```

---

# Lifecycle

## User Registration

```text
Register

↓

User Created

↓

Email Verification

↓

Profile Created

↓

Account Active
```

---

## OAuth Login

```text
OAuth Provider

↓

Identity Verified

↓

Provider Linked

↓

Session Created
```

---

## Password Login

```text
Email

↓

Password Verification

↓

Session Created

↓

Last Login Updated
```

---

## Logout

```text
Session

↓

Revoked

↓

Expired
```

---

## Account Deletion

```text
Soft Delete

↓

Sessions Revoked

↓

Profile Retained

↓

Workspace Membership Removed
```

---

# Index Strategy

## Email Lookup

```sql
UNIQUE(email)
```

---

## Session Lookup

```sql
INDEX(user_id)

INDEX(expires_at)
```

---

## OAuth Lookup

```sql
INDEX(provider)

INDEX(provider_user_id)
```

Recommended unique constraint:

```sql
UNIQUE(provider, provider_user_id)
```

---

## Active User Search

```sql
INDEX(account_status)

INDEX(email_verified)
```

---

# Constraints

---

## Email

Required.

Globally unique.

Stored in lowercase.

---

## Password

Passwords must never be stored directly.

Only password hashes are persisted.

---

## Session Token

Session tokens should never be stored in plain text if using long-lived authentication.

Prefer hashed refresh tokens.

---

## Profile

Each user owns exactly one profile.

---

## Authentication Provider

A provider account cannot belong to multiple users.

---

## Email Verification

Business features requiring ownership should only be available after email verification.

---

## Soft Delete

User deletion should use:

```text
deleted_at
```

Historical audit records remain intact.

---

# Future APIs

```text
Register

Login

Logout

Refresh Token

Verify Email

Forgot Password

Reset Password

Get Profile

Update Profile

Change Password

Link OAuth Provider

Unlink OAuth Provider

List Active Sessions

Revoke Session
```

---

# Future Backend Services

## Authentication Service

Handles login, password verification, JWT issuance, and token refresh.

---

## OAuth Service

Manages external identity providers and account linking.

---

## User Profile Service

Maintains user profile information.

---

## Session Service

Tracks active sessions, expiration, and revocation.

---

## Email Verification Service

Handles verification emails and activation workflow.

---

## Password Recovery Service

Generates secure reset tokens and validates password reset requests.

---

# Implementation Notes

Recommended implementation:

```text
UUID Primary Keys

Password Hash (Argon2id preferred)

JWT Access Token

Hashed Refresh Token

Soft Delete

Email Normalization

Optimistic Locking
```

Security recommendations:

* Never expose password hashes.
* Never expose refresh tokens.
* Always validate session expiration.
* Support multiple concurrent sessions.
* Record last successful login.

---

# Integration with Workspace

Authentication and authorization are separated.

The relationship is:

```text
users

↓

workspace_members

↓

workspaces
```

The User Account domain authenticates **who the user is**.

The Workspace domain determines **what the user can access**.

---

# Final Rule

The User Account database establishes user identity but does not define business ownership.

Identity belongs to the User domain.

Authorization belongs to the Workspace domain.

This separation keeps authentication independent from business data, enabling secure multi-workspace collaboration and future enterprise identity integration.
