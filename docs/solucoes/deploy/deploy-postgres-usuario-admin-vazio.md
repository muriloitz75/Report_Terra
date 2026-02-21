# 📝 Banco PostgreSQL Vazio Após Migração — Sem Usuário Admin

**Categoria:** `deploy`
**Data de resolução:** 2026-02-21
**Arquivo(s) afetado(s):** `backend/database.py`, `backend/create_admin.py`, `backend/main.py`

---

## 🔴 Sintoma

Após migrar de SQLite para PostgreSQL no Railway, o login com o usuário administrador falha:

```
Email ou senha incorretos.
```

E nos logs do Railway:

```
Token validation failed: User admin@reportterra.com not found in DB
POST /token HTTP/1.1 401 Unauthorized
```

---

## 🔍 Causa Raiz

Ao migrar para PostgreSQL, o banco de dados novo está **completamente vazio**. Os usuários que existiam no SQLite local (incluindo o admin) **não são migrados automaticamente** — são bancos de dados separados.

Além disso, o script `create_admin.py` que foi criado para semear o usuário inicial ficou **corrompido** porque foi gerado usando sintaxe `cat << 'EOF'` (heredoc Bash) em um terminal PowerShell do Windows, que não suporta essa sintaxe. O arquivo resultante continha texto embaralhado e o deploy falhou no build.

---

## ✅ Solução

### Opção A — Inserir o admin diretamente via script local (mais rápido)

Com o `DATABASE_PUBLIC_URL` do Railway em mãos, rodar localmente:

```python
import sys
sys.path.append('backend')
import os
os.environ['DATABASE_URL'] = 'postgresql://USER:PASS@HOST:PORT/railway'

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User
import auth

engine = create_engine(os.environ['DATABASE_URL'])
Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
db = Session()

new_admin = User(
    email='admin@admin.com',
    hashed_password=auth.get_password_hash('admin123'),
    full_name='Administrador do Sistema',
    role='admin',
    is_active=True,
    approval_status='approved',
    can_generate_report=True,
    can_view_processes=True,
    can_view_dashboard=True,
    can_view_reports=True,
)
db.add(new_admin)
db.commit()
print('Admin criado com sucesso!')
db.close()
```

> ⚠️ Substitua a URL com o valor real da variável `DATABASE_PUBLIC_URL` do painel do Railway.

### Opção B — Semear via script automático no startup (permanente)

O arquivo `backend/create_admin.py` (escrito via editor, não via terminal) é chamado no `backend/main.py` logo após o `Base.metadata.create_all`:

```python
# backend/main.py
Base.metadata.create_all(bind=engine)

# Seed initial admin if not exists
try:
    from create_admin import create_initial_admin
    create_initial_admin()
except Exception as e:
    logger.error(f"Failed to seed initial admin: {e}")
```

O email e senha do admin são lidos de variáveis de ambiente:

| Variável | Padrão |
|---|---|
| `ADMIN_EMAIL` | `admin@admin.com` |
| `ADMIN_PASSWORD` | `admin123` |

---

## ⚠️ Armadilha Importante

**Nunca crie arquivos Python via `cat << 'EOF'` no PowerShell do Windows!**

O PowerShell não suporta heredoc Bash. O resultado é um arquivo com conteúdo embaralhado que causa falha no build do Docker. Use sempre um editor ou a ferramenta de escrita de arquivos do agente.

---

## 🧪 Como verificar

Rodar localmente apontando para o PostgreSQL do Railway:

```python
db.query(User).all()
# Deve listar o admin criado
```

Ou tentar logar na aplicação com `admin@admin.com` / `admin123`.

---

## 🔗 Referências

- `backend/create_admin.py` — Script de seed do admin
- `backend/main.py` — Chamada do seed no startup
- `backend/database.py` — Lógica de seleção SQLite/PostgreSQL
