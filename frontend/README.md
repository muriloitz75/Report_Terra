# Report Terra

Sistema de processamento e analise de processos governamentais com dashboard, relatorios IA e painel administrativo.

## Stack Tecnologica

### Backend
- **FastAPI** (Python 3.x) - API REST
- **SQLAlchemy** + **SQLite** - ORM e banco de dados
- **python-jose** + **passlib[bcrypt]** - Autenticacao JWT (HS256)
- **LangChain** (OpenAI, Anthropic, Google GenAI) - Geracao de relatorios IA
- **pdfplumber** - Parsing de PDFs
- **pandas** + **xlsxwriter** - Exportacao Excel

### Frontend
- **Next.js 16** (React 19) - Framework web
- **NextAuth v5** (beta.30) - Autenticacao com Credentials provider
- **Tailwind CSS v4** - Estilizacao
- **shadcn/ui** (Radix UI) - Componentes
- **Recharts** - Graficos
- **Axios** - Cliente HTTP
- **Tanstack Table** - Tabela de dados

### Infraestrutura
- **Docker** - Container unico (backend + frontend)
- **Node 22 Alpine** - Imagem base

---

## Arquitetura

```
Browser
  |
  |-- fetch("/token") -----> Next.js Rewrite -----> FastAPI /token (JWT)
  |-- signIn("credentials") -> NextAuth (decodifica JWT, cria sessao)
  |
  |-- api.get("/stats") ---> Next.js Rewrite -----> FastAPI /stats
  |-- api.get("/processes") -> Next.js Rewrite ---> FastAPI /processes
  |-- ...
```

### Fluxo de Autenticacao

1. **Login**: O navegador chama `POST /token` diretamente (via rewrite do Next.js)
2. **JWT**: O backend valida credenciais e retorna um JWT (HS256, 24h de validade)
3. **Sessao**: O token eh passado ao `signIn()` do NextAuth, que decodifica o payload e cria a sessao
4. **Interceptor**: O `api.ts` (Axios) injeta `Authorization: Bearer <token>` em todas as requisicoes
5. **Middleware**: Rotas protegidas verificam sessao; tokens expirados redirecionam ao login
6. **Logout**: `signOut()` limpa cookies e exibe tela de sessao encerrada

### RBAC (Controle de Acesso)

| Papel  | Permissoes                                    |
|--------|-----------------------------------------------|
| admin  | Tudo + painel admin + gestao de usuarios + auditoria |
| user   | Dashboard, processos, relatorios (se habilitado)     |

- `role`: "admin" ou "user"
- `can_generate_report`: boolean que controla acesso a relatorios IA

---

## Paginas

| Rota               | Descricao                       | Acesso    |
|--------------------|----------------------------------|-----------|
| `/login`           | Tela de login                    | Publico   |
| `/dashboard`       | KPIs e graficos                  | Autenticado |
| `/processos`       | Lista de processos com filtros   | Autenticado |
| `/relatorios`      | Geracao de relatorios via IA     | Autenticado (com permissao) |
| `/admin`           | Gestao de usuarios               | Admin     |
| `/admin/auditoria` | Dashboard de auditoria de acesso | Admin     |

---

## Endpoints da API

### Autenticacao
| Metodo | Rota          | Descricao                |
|--------|---------------|--------------------------|
| POST   | `/token`      | Login (retorna JWT)      |

### Processos
| Metodo | Rota            | Descricao                         |
|--------|-----------------|-----------------------------------|
| GET    | `/stats`        | KPIs agregados (total, atrasados) |
| GET    | `/processes`    | Lista paginada com filtros        |
| POST   | `/upload`       | Upload de PDF para parsing        |
| GET    | `/upload/status`| Status do processamento           |
| GET    | `/export-excel` | Exporta processos para Excel      |
| DELETE | `/clear`        | Limpa todos os processos          |

### Relatorios IA
| Metodo | Rota                   | Descricao                          |
|--------|------------------------|------------------------------------|
| POST   | `/api/generate-report` | Gera relatorio IA (streaming SSE)  |
| POST   | `/api/feedback`        | Feedback do usuario sobre relatorio|

### Admin
| Metodo | Rota                               | Descricao                         |
|--------|------------------------------------|------------------------------------|
| GET    | `/admin/users`                     | Lista usuarios                     |
| POST   | `/admin/users`                     | Cria usuario                       |
| PATCH  | `/admin/users/:id`                 | Atualiza usuario                   |
| DELETE | `/admin/users/:id`                 | Desativa usuario                   |
| GET    | `/admin/audit/summary`             | KPIs de auditoria                  |
| GET    | `/admin/audit/users`               | Atividade por usuario              |
| GET    | `/admin/audit/activity?days=30`    | Serie temporal de logins           |
| GET    | `/admin/audit/user/:id/history`    | Historico detalhado do usuario      |

---

## Modelos do Banco

- **User** - id, email, hashed_password, full_name, role, can_generate_report, is_active, last_login
- **Process** - id (string), user_id, contribuinte, data_abertura, ano, status, setor_atual, tipo_solicitacao, dias_atraso_pdf, dias_atraso_calc, is_atrasado
- **Report** - id, user_id, content (markdown), filtered_context (JSON), user_rating, user_feedback
- **UserActivity** - id, user_id, action, ip_address, user_agent, detail, timestamp

---

## Desenvolvimento Local

### Pre-requisitos
- Python 3.10+
- Node.js 20.9+
- npm

### Configuracao

```bash
# Clonar repositorio
git clone <repo-url>
cd Report_Terra

# Backend - criar venv na raiz do projeto
python -m venv .venv

# Ativar venv (Windows Git Bash)
source .venv/Scripts/activate

# Instalar dependencias Python
pip install -r requirements.txt

# Frontend - instalar dependencias
cd frontend
npm install
```

### Executar

```bash
# Terminal 1 - Backend (porta 8000)
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend (porta 3000)
cd frontend
npm run dev
```

Acesse `http://localhost:3000`

### Credenciais padrao
- Email: `admin@reportterra.com`
- Senha: `admin123`

---

## Deploy (Docker)

```bash
docker build -t report-terra .
docker run -p 3000:3000 report-terra
```

O container executa backend (porta 8000 interna) e frontend (porta 3000 exposta) via `start.sh` com auto-restart do backend.

### Variaveis de Ambiente

| Variavel            | Descricao                        | Padrao                      |
|---------------------|-----------------------------------|-----------------------------|
| `SECRET_KEY`        | Chave para assinar JWTs           | (definido no Dockerfile)    |
| `AUTH_SECRET`       | Chave do NextAuth                 | (definido no Dockerfile)    |
| `BACKEND_API_URL`   | URL do backend para rewrites      | `http://127.0.0.1:8000`    |
| `LOG_LEVEL`         | Nivel de log do backend           | `INFO`                      |
| `NODE_ENV`          | Ambiente do Node.js               | `production`                |

---

## Versao

v1.1.0
