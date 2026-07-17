# 04_State_Management

Version: v1.0

Status: Stable

---

# Purpose

State Management 定義 Highlight Signal Frontend 的資料狀態管理方式。

State 的目的包括：

* 維持 UI 一致性
* 管理使用者操作
* 同步 API 資料
* 降低 Component 耦合
* 提升可維護性

State 屬於 Frontend Layer。

Business Data 的唯一來源仍為 Backend。

---

# Design Philosophy

State 採用：

Single Source of Truth

↓

Predictable

↓

Minimal

↓

Replaceable

Frontend 不保存永久資料。

Frontend 僅保存：

目前操作所需狀態。

---

# State Principles

State 應遵循：

Simple

避免不必要的 State。

Reactive

UI 自動反映 State。

Isolated

不同 State 不互相依賴。

Recoverable

重新整理後可重新取得。

---

# State Position

Frontend State：

```text id="q8f4xa"
User

↓

UI

↓

Frontend State

↓

API

↓

Backend
```

Backend 永遠是正式資料來源。

---

# State Categories

Highlight Signal 將 State 分為：

* UI State
* Session State
* Workspace State
* Server State
* Form State
* Temporary State

不同類型採用不同管理方式。

---

# UI State

UI State

控制畫面呈現。

例如：

* Sidebar
* Dialog
* Drawer
* Loading
* Selected Tab
* Expanded Panel

UI State

不需永久保存。

---

# Session State

Session State

表示目前登入資訊。

包含：

* Login Status
* User Profile
* Session Token
* Current Permission

Session 結束後：

State 即失效。

---

# Workspace State

Workspace State

表示目前工作環境。

例如：

* Current Workspace
* Current Module
* Current Navigation
* Current Filter

Workspace 切換時，

重新載入相關資料。

---

# Server State

Server State

來自 Backend API。

例如：

* Signal
* Evidence
* Recommendation
* Notification

Server State

不可直接修改。

更新應重新透過 API。

---

# Form State

Form State

表示使用者輸入。

例如：

* Input Value
* Validation
* Error Message
* Dirty State
* Submit Status

送出完成後，

可重新初始化。

---

# Temporary State

Temporary State

只存在於目前操作流程。

例如：

* Wizard Step
* Selected Item
* Preview Data
* Upload Progress

完成操作後即可釋放。

---

# State Flow

所有資料流：

```text id="z4v9kn"
User Action

↓

State Update

↓

API Request

↓

Backend

↓

Response

↓

State Refresh

↓

UI Update
```

保持單向資料流。

---

# Single Source of Truth

每種資料：

僅有一個正式來源。

例如：

User

↓

Session State

Signal

↓

Backend

Workspace

↓

Workspace State

避免：

同一資料多處維護。

---

# State Lifetime

不同 State

具有不同生命週期。

UI State

Page Level

Session State

Login Session

Workspace State

Workspace Session

Server State

API Lifecycle

Temporary State

Current Action

依需求自動釋放。

---

# State Synchronization

Server State

應保持與 Backend 同步。

更新流程：

```text id="m6w3pd"
API Update

↓

Backend Success

↓

Refresh State

↓

Update UI
```

避免：

Frontend 自行推測資料。

---

# Derived State

可由既有資料推導出的資訊，

不應再次儲存。

例如：

Recommendation Count

可由：

Recommendation List

計算取得。

避免：

重複 State。

---

# State Isolation

各 Module

應管理自己的 State。

例如：

Signal Module

↓

Signal State

Recommendation Module

↓

Recommendation State

避免：

Module 間直接修改彼此資料。

---

# Cache Strategy

Server State

可暫時快取。

但：

Cache

不是正式資料來源。

當資料可能變更時，

應重新向 API 取得最新資訊。

---

# Optimistic Update

V1

預設採用：

Backend Confirm

↓

Refresh State

Future

可針對特定操作加入：

Optimistic Update

提升操作流暢度。

---

# Error Recovery

API 發生錯誤：

State 不應進入未知狀態。

流程：

```text id="x1k5qa"
Request

↓

Error

↓

Restore Previous State

↓

Show Error Message
```

保持 UI 一致性。

---

# Performance

State 應避免：

* Global Re-render
* Duplicate Fetch
* Unnecessary Update

保持：

最小更新範圍。

---

# Security

Frontend State

不得保存：

* Database Password
* Secret Key
* Internal Credential

敏感資料

應保留於 Backend。

---

# Future Evolution

未來可導入：

State Library

* React Context
* Zustand
* Redux Toolkit

Server State

* TanStack Query

Persistence

* Local Storage（Limited）
* IndexedDB（Future）

Application Architecture

保持一致。

---

# Relationship with Other Documents

本文件描述：

Frontend State Management。

相關文件：

Frontend Overview

* Frontend Layer

Routing Architecture

* Route State

Layout Framework

* Layout State

API Integration

* Server Communication

Component System

* Component State

各文件共同構成 Frontend 架構。

---

# Summary

State Management 定義 Highlight Signal Frontend 的狀態管理策略。

V1 將 State 分為 UI、Session、Workspace、Server、Form 與 Temporary 六種類型，並採用 Single Source of Truth 與單向資料流，確保資料一致性、降低模組耦合，並讓 Frontend 專注於畫面呈現，而將正式商業資料管理交由 Backend 負責。

未來可自由替換 State Management Library，而無須修改整體 Product Architecture。
