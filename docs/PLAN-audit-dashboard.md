# PLAN: Dashboard de Auditoria de Usuários no Painel Admin

## Objetivo
Implementar um dashboard no painel de administração que mostra a atividade de uso dos usuários comuns: histórico de login/logout, última sessão, frequência de acesso, com cards KPI e gráficos.

---

## Fase 1 - Backend: Modelo e Registro de Atividade

### 1.1 Criar modelo `UserActivity` em `backend/models.py`

```python
class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String, index=True)        # "login", "logout", "token_refresh"
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")
```

**Ações rastreadas:**
| Action         | Quando registrar                          |
|----------------|-------------------------------------------|
| `login`        | Login com sucesso no `/token`             |
| `logout`       | Chamada de signOut (novo endpoint)        |
| `login_failed` | Tentativa de login com senha errada       |

### 1.2 Registrar atividade no endpoint `/token` (`backend/main.py`)

- No login bem-sucedido: criar registro `action="login"` com IP e User-Agent
- No login falhado: criar registro `action="login_failed"` com email tentado
- Extrair IP de `request.client.host` e User-Agent de `request.headers`

**Mudanças necessárias:**
- Adicionar `Request` como parâmetro no endpoint `/token`
- Após verificação de senha OK: `db.add(UserActivity(user_id=user.id, action="login", ip_address=..., user_agent=...))`
- Após verificação de senha FAIL: `db.add(UserActivity(user_id=None, action="login_failed", ip_address=...))`

### 1.3 Adicionar campo `last_login` no modelo `User`

```python
# Em User (models.py)
last_login = Column(DateTime, nullable=True)
```

- Atualizar `last_login` no login bem-sucedido (simples e evita query extra na dashboard)

### 1.4 Criar endpoints admin de auditoria

#### `GET /admin/audit/summary`
Retorna KPIs globais:
```json
{
  "total_users": 10,
  "active_users_today": 3,
  "active_users_week": 7,
  "active_users_month": 9,
  "total_logins_today": 12,
  "total_logins_week": 45,
  "failed_logins_today": 2
}
```

**Query:** Agregar `user_activities` por período usando `timestamp`.

#### `GET /admin/audit/users`
Retorna atividade por usuário:
```json
[
  {
    "user_id": 2,
    "email": "joao@email.com",
    "full_name": "João",
    "role": "user",
    "is_active": true,
    "last_login": "2026-02-17T15:30:00",
    "login_count_30d": 25,
    "login_count_7d": 8,
    "total_processes": 173,
    "created_at": "2026-01-15T10:00:00"
  }
]
```

**Query:** JOIN `users` + aggregate de `user_activities` (count por 7d e 30d) + count de `processes`.

#### `GET /admin/audit/activity?days=30`
Retorna série temporal para gráfico:
```json
{
  "daily_logins": [
    {"date": "2026-02-10", "logins": 5, "unique_users": 3},
    {"date": "2026-02-11", "logins": 8, "unique_users": 4}
  ]
}
```

**Query:** GROUP BY date de `user_activities` WHERE action="login".

#### `GET /admin/audit/user/{user_id}/history?limit=50`
Retorna log detalhado de um usuário específico:
```json
[
  {"action": "login", "ip_address": "189.90.39.222", "timestamp": "2026-02-17T15:30:00"},
  {"action": "login", "ip_address": "189.90.39.222", "timestamp": "2026-02-16T09:00:00"}
]
```

### 1.5 Migração do banco de dados

Como o projeto usa SQLite sem Alembic, criar a tabela via script Python:

```python
# migrate_audit.py
import sqlite3
conn = sqlite3.connect('backend/data/report_terra.db')
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)''')
c.execute('CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activities(user_id)')
c.execute('CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON user_activities(timestamp)')
c.execute('CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activities(action)')

# Adicionar last_login na tabela users (se não existir)
try:
    c.execute('ALTER TABLE users ADD COLUMN last_login DATETIME')
except:
    pass  # Coluna já existe

conn.commit()
conn.close()
```

**Nota:** O `Base.metadata.create_all(bind=engine)` no `main.py` criará a tabela automaticamente no próximo startup se o modelo estiver definido.

---

## Fase 2 - Frontend: Dashboard de Auditoria

### 2.1 Criar página `/admin/auditoria`

**Arquivo:** `frontend/app/admin/auditoria/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Dashboard de Auditoria                    [Refresh] │
├──────────┬──────────┬──────────┬────────────────────┤
│ Usuários │ Ativos   │ Ativos   │ Logins    │ Falhas │
│ Total    │ Hoje     │ 7 dias   │ Hoje      │ Hoje   │
│   10     │    3     │    7     │   12      │   2    │
├──────────┴──────────┴──────────┴────────────────────┤
│                                                      │
│  [Gráfico de Linha: Logins Diários - últimos 30d]   │
│  ▁▂▃▅▆▇█▇▆▅▃▂▁▂▃▅▆▇█▇▆▅▃                         │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Atividade por Usuário                               │
│ ┌──────────┬──────────┬────────┬───────┬──────────┐ │
│ │ Usuário  │ Último   │ 7 dias │ 30d   │ Processos│ │
│ │          │ Login    │        │       │          │ │
│ ├──────────┼──────────┼────────┼───────┼──────────┤ │
│ │ joao@... │ Há 2h    │  8     │  25   │   173    │ │
│ │ maria@.. │ Há 1 dia │  3     │  12   │    45    │ │
│ │ pedro@.. │ Há 15d   │  0     │   2   │     0    │ │
│ └──────────┴──────────┴────────┴───────┴──────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2.2 Componentes necessários

- **KPI Cards** (5 cards): Reutilizar o padrão de cards do shadcn/ui já usado no dashboard principal
- **Gráfico de linha**: Usar `recharts` (já instalado no projeto?) ou componente leve de chart
- **Tabela de usuários**: Tabela com colunas de atividade, timestamp relativo ("Há 2h"), badges de status
- **Detalhe do usuário** (modal/drawer): Ao clicar numa linha, mostra o histórico de ações recentes

### 2.3 Funções API no `frontend/lib/api.ts`

```typescript
// Adicionar ao api.ts
getAuditSummary(): Promise<AuditSummary>
getAuditUsers(): Promise<AuditUser[]>
getAuditActivity(days: number): Promise<ActivityTimeline>
getAuditUserHistory(userId: number, limit: number): Promise<ActivityEntry[]>
```

### 2.4 Adicionar link na sidebar

Em `frontend/components/app-sidebar.tsx`, adicionar item de menu:
- Ícone: `Activity` (lucide-react)
- Label: "Auditoria"
- Rota: `/admin/auditoria`
- Visível apenas para admins (mesmo padrão do link "Administração")

---

## Fase 3 - Integração e Verificação

### 3.1 Checklist de implementação

- [x] Modelo `UserActivity` criado em `models.py`
- [x] Campo `last_login` adicionado ao modelo `User`
- [x] `Base.metadata.create_all()` cria a tabela automaticamente
- [x] Endpoint `/token` registra login/login_failed com IP e User-Agent
- [x] `GET /admin/audit/summary` retorna KPIs
- [x] `GET /admin/audit/users` retorna atividade por usuário
- [x] `GET /admin/audit/activity?days=30` retorna série temporal
- [x] `GET /admin/audit/user/{user_id}/history` retorna log detalhado
- [x] Página `/admin/auditoria` com cards KPI
- [x] Gráfico de logins diários (últimos 30 dias)
- [x] Tabela de atividade por usuário com timestamp relativo
- [x] Link "Auditoria" na sidebar (admin only)
- [x] Funciona no Docker/Railway (sem dependências extras)

### 3.2 Dependências

- **Backend:** Nenhuma nova (SQLAlchemy já suporta tudo)
- **Frontend:** Verificar se `recharts` já está instalado; se não, instalar ou usar chart simples com CSS

### 3.3 Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `backend/models.py` | Modificar | Adicionar `UserActivity` + `last_login` em User |
| `backend/main.py` | Modificar | Registrar atividade no `/token` + 4 novos endpoints admin |
| `frontend/app/admin/auditoria/page.tsx` | Criar | Página da dashboard de auditoria |
| `frontend/lib/api.ts` | Modificar | Adicionar funções de API de auditoria |
| `frontend/components/app-sidebar.tsx` | Modificar | Adicionar link "Auditoria" |

### 3.4 Estimativa de escopo

- **Modelos + migração:** Pequeno (1 modelo, 1 campo em User)
- **Endpoints backend:** Médio (4 endpoints, queries de agregação)
- **Frontend dashboard:** Médio-Grande (página nova com cards, gráfico, tabela)
- **Total de arquivos:** 5 (2 modificados, 1 criado no frontend, 2 modificados no backend)

---

## Decisões de Design

1. **Sem tabela de sessões** - Rastreamos eventos individuais (login/logout), não sessões contínuas. Mais simples e suficiente.
2. **`last_login` no User** - Evita query pesada na listagem de usuários.
3. **Série temporal por dia** - Granularidade diária é suficiente para dashboard admin.
4. **IP + User-Agent** - Dados úteis para segurança sem ser invasivo.
5. **Sem paginação na timeline** - Limitar a 30 dias no gráfico; tabela de histórico com limit padrão de 50.
