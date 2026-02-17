# PLAN.md - Arquitetura Multi-Usuario

> **Status:** Implementado
> **Objetivo:** Transformar Report Terra de MVP single-user em aplicacao multi-usuario com RBAC.

---

## 1. Objetivos (Concluidos)

1. **Autenticacao & Autorizacao:**
    - Login Email/Senha via FastAPI `/token` (JWT HS256, 24h)
    - NextAuth v5 (Credentials provider) gerencia sessao no frontend
    - Interceptor Axios injeta token em todas as requisicoes
    - Middleware protege rotas e redireciona sessoes expiradas

2. **Persistencia:**
    - SQLite via SQLAlchemy (migracoes manuais via Python sqlite3)
    - Modelos: User, Process, Report, UserActivity

3. **RBAC:**
    - Papeis: `admin` e `user`
    - Permissao granular: `can_generate_report` (boolean)
    - Painel admin para gestao de usuarios

---

## 2. Arquitetura Implementada

### Frontend (Next.js 16)
- **NextAuth v5** (beta.30) com estrategia JWT
- Login chama `/token` diretamente do navegador (via Next.js rewrite)
- Token JWT passado ao `signIn()` - authorize apenas decodifica, sem fetch server-to-server
- Middleware valida sessao e redireciona tokens expirados
- `publicPaths`: `/login`, `/api/auth`, `/token`, `/health`

### Backend (FastAPI)
- **Banco:** SQLite (`backend/data/report_terra.db`)
- **Auth:** `OAuth2PasswordBearer` + `passlib[bcrypt]` + `python-jose`
- **Modelos:** User, Process, Report, UserActivity

---

## 3. Fases de Implementacao

### Fase 1: Banco de Dados - CONCLUIDA
- [x] Modelos SQLAlchemy (User, Process, Report)
- [x] SQLite como banco (decisao: simplicidade, sem Docker extra)
- [x] `Base.metadata.create_all()` cria tabelas no startup

### Fase 2: Autenticacao Backend - CONCLUIDA
- [x] `auth.py` com JWT encoding/decoding (HS256)
- [x] Endpoint `/token` com OAuth2PasswordRequestForm
- [x] Dependencia `get_current_user` para proteger endpoints
- [x] Endpoints filtram dados por `user_id` do token

### Fase 3: Integracao Frontend - CONCLUIDA
- [x] NextAuth v5 configurado com Credentials provider
- [x] Login page chama `/token` direto do browser (via rewrite)
- [x] `lib/api.ts` com interceptor de token e redirect 401
- [x] Middleware protege todas as rotas (exceto publicas)

### Fase 4: Painel Admin - CONCLUIDA
- [x] CRUD de usuarios (`/admin/users`)
- [x] Dashboard de auditoria (`/admin/auditoria`)
- [x] Registro de atividade (login/login_failed) com IP e User-Agent
- [x] KPIs, serie temporal e historico por usuario

---

## 4. Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Banco | SQLite | Simplicidade, sem dependencia extra, compativel com SQLAlchemy |
| Auth provider | Email/Senha proprio | Sem dependencias externas (Auth0, etc.) |
| Migracoes | Scripts Python manuais | Alembic nao instalado; tabelas criadas via `create_all()` |
| Auth flow | Client-side fetch + rewrite | Evita problemas de fetch server-to-server no NextAuth authorize |
| Sessao NextAuth | JWT (8h maxAge) | Stateless, sem necessidade de banco de sessoes |
