# PLAN.md - Evolution to Multi-User & Persistent Architecture

> **Orchestrated by:** @[/orchestrate]
> **Goal:** Transform Report Terra from a single-user MVP into a robust, multi-user SaaS-ready application.

---

## 1. 🎯 Objectives

1.  **Authentication & Authorization:**
    -   Implement secure login (Email/Password or OAuth).
    -   Secure Backend APIs with JWT (JSON Web Tokens).
    -   Ensure users only access *their own* data.
2.  **Robust Persistence:**
    -   Migrate from `json` file to **PostgreSQL**.
    -   Model relationships (Users -> Processes, Users -> Reports).
3.  **Scalability & Safety:**
    -   Protect routes and API endpoints.
    -   Manage database migrations (Alembic).

---

## 2. 🏗️ Architecture Changes

### Frontend (Next.js)
-   **Library:** `next-auth` (v5 beta or v4 stable).
-   **Flow:**
    -   Login Page (`/login`).
    -   Protected Routes (Middleware to redirect unauthenticated users).
    -   Attach `Authorization: Bearer <token>` to all API requests (via Interceptor in `lib/api.ts`).

### Backend (FastAPI)
-   **Database:** PostgreSQL (via `SQLAlchemy` + `AsyncPG`).
-   **Auth:** `OAuth2PasswordBearer` flow.
-   **Hashing:** `Passlib[bcrypt]`.
-   **Schema:**
    -   `users` (id, email, hashed_password, created_at)
    -   `processes` (id, user_id, status, details...)
    -   `reports` (id, user_id, content, feedback...)

---

## 3. 📅 Implementation Phases (Sequential)

### Phase 1: Foundation (Database) 🛠️
*Agent: `database-architect`*
1.  Setup PostgreSQL (Docker or local).
2.  Define SQLAlchemy Models (`User`, `Process`, `Report`).
3.  Config Alembic for migrations.
4.  Created initial migration script.

### Phase 2: Backend Authentication 🛡️
*Agent: `security-auditor` & `backend-specialist`*
1.  Implement `auth.py` (JWT encoding/decoding).
2.  Create endpoints: `/auth/register`, `/auth/login`.
3.  Protect dependency `get_current_user` to validate JWT.
4.  Update all endpoints to use the *real* `user_id` from the token.

### Phase 3: Frontend Integration 💻
*Agent: `frontend-specialist`*
1.  Setup `NextAuth.js` provider.
2.  Create Login/Register UI pages.
3.  Update `lib/api.ts` to inject tokens.
4.  Add Route Guards (Middleware).

### Phase 4: Migration & Verification ✅
*Agent: `test-engineer`*
1.  Migrate existing JSON data to DB (script).
2.  Run Security Scan (`security_scan.py`).
3.  Test E2E flow (Login -> Upload -> Logout).

---

## 4. 📝 User Review Required
-   **Technology Choice:** PostgreSQL is recommended for production, but SQLite is easier for local dev. **Decision:** We will use **SQLite** initially for simplicity (no extra Docker container needed), compatible with SQLAlchemy (easy switch to Postgres later).
-   **Auth Provider:** We will use standard Email/Password implementation in FastAPI to avoid external dependencies (like Auth0) for now.

---

**Next Step:** Approve this plan to begin Phase 1.
