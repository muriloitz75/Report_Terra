
# Report Terra — Análise Inteligente de Processos

O **Report Terra** é uma aplicação web full-stack para extrair, analisar e visualizar dados de processos a partir de relatórios PDF de "Tramitação de Processos". A ferramenta automatiza a leitura de PDFs, identifica processos atrasados e apresenta os dados em um dashboard interativo com geração de relatórios por IA.

## 🚀 Funcionalidades

### 📤 Upload de PDF com Processamento Inteligente
- Parser de PDF robusto via `pdfplumber` com extração de nº de processo, contribuinte, datas, setores, tipo e status.
- **Auto-Substituição**: O upload de um novo PDF limpa automaticamente os registros antigos antes de inserir os novos — sem acúmulo e sem duplicidade.
- **Processamento em background**: O upload retorna instantaneamente; a extração dos registros roda em segundo plano com barra de progresso em tempo real.
- **Recuperação de estado**: Se o usuário navegar para outra página e voltar, a barra de progresso é restaurada automaticamente enquanto o processamento continua.
- **Proteção de dados**: A tela de Processos e o Dashboard bloqueiam automaticamente a exibição de dados antigos ("fantasmas") enquanto um upload está em andamento, exibindo uma animação de carregamento no lugar.
- **Cancelamento de Upload**: Botão "Cancelar" disponível durante o processamento. Ao cancelar, o backend interrompe o loop de inserção e faz rollback de todos os registros parciais, garantindo consistência no banco de dados.

### 📊 Dashboard
- KPIs: Total de Processos, Encerrados, Em Andamento, Atrasados.
- Gráfico de Evolução Temporal por mês.
- Gráfico de Top 10 Tipos de Solicitação.
- Filtro por período com Date Range Picker.
- Proteção contra dados fantasmas: exibe estado de "aguardando" enquanto um upload roda.

### 📋 Tabela de Processos
- Busca em tempo real por ID, Contribuinte ou Tipo.
- Filtros multi-select por Status e Tipo de Solicitação.
- Filtro de período e toggle "Apenas Atrasados".
- Paginação completa (primeira, anterior, próxima, última página).
- **Exportação Global:** Exportação para Excel respeitando todos os filtros ativos.
- **Estatísticas Detalhadas:** Modal com gráfico de evolução temporal interativo para o tipo de solicitação selecionado, contendo totalizadores dinâmicos e exportação visual limpa para PNG.

### 🤖 Relatórios com IA
- Geração de análises inteligentes via OpenAI (GPT).
- Insights sobre padrões, gargalos e recomendações.

### 👥 Autenticação e Permissões
- Login com JWT (JSON Web Token).
- Controle de permissões por usuário: `can_view_processes`, `can_view_dashboard`, `can_view_reports`, `can_generate_report`.
- Sistema de aprovação de novos cadastros (admin aprova/rejeita).
- Página de cadastro público no login.
- Administração de usuários (criar, editar permissões, excluir).

### 📐 Regras de Negócio
- Um processo é considerado **"Atrasado"** se o status for `ANDAMENTO` e a data de abertura for anterior a 30 dias.
- Status reconhecidos: `ANDAMENTO`, `ENCERRAMENTO`, `DEFERIDO`, `INDEFERIDO`.
- **Normalização de Tipos:** O backend mescla e processa ativamente nomenclaturas conflitantes ou variações visuais de hifens (ex: meia-risca, travessão) extraídos do PDF para garantir dados limpos, unificados e consistentes nos filtros.

---

## 🛠️ Tecnologias

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 15.x (Turbopack) | Framework React com App Router |
| Tailwind CSS | 4.x | Estilização |
| Shadcn/UI | — | Componentes UI (Radix) |
| Recharts | 3.x | Gráficos |
| Lucide React | — | Ícones |
| NextAuth.js | — | Autenticação via sessão |
| Axios | — | HTTP Client |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| FastAPI | 0.115 | API REST |
| pdfplumber | 0.11 | Extração de texto de PDF |
| SQLAlchemy + Alembic | 2.0 | ORM e migrações (SQLite local / PostgreSQL Railway) |
| LangChain + OpenAI | — | Geração de relatórios com IA |
| Uvicorn | 0.32 | Servidor ASGI |

---

## 📦 Como Executar (Windows)

### Pré-requisitos
- **Node.js** v20+ → [nodejs.org](https://nodejs.org)
- **Python** v3.10+ → [python.org](https://python.org) *(marque "Add Python to PATH" na instalação)*

### Passo 1 — Setup inicial (apenas na primeira vez)

Clique duas vezes em **`setup.bat`**. Ele irá automaticamente:
- ✅ Verificar se Python e Node.js estão instalados
- ✅ Criar o ambiente virtual `.venv` e instalar dependências Python
- ✅ Instalar dependências npm do frontend
- ✅ Criar o arquivo `frontend/.env.local`
- ✅ Criar o banco de dados e usuário admin padrão

> **Login padrão após o setup:** usuário `admin` / senha `admin123`

### Passo 2 — Iniciar o projeto

Clique duas vezes em **`iniciar_projeto.bat`**. Abrirá duas janelas (Backend e Frontend).

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Documentação API (Swagger) | http://localhost:8000/docs |

### (Opcional) Relatórios com IA

Adicione sua chave no arquivo `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
```

---

## 📂 Estrutura do Projeto

```
Report_Terra/
├── backend/
│   ├── main.py            # Endpoints FastAPI (upload, stats, processos, relatórios, cancelamento)
│   ├── process_pdf.py     # Parser de PDF com bounding-box (pdfplumber)
│   ├── ai_agent.py        # Agente IA com LangChain para relatórios
│   ├── database.py        # Configuração SQLAlchemy
│   ├── models.py          # Models ORM (User, Process)
│   ├── auth.py            # JWT + hashing de senhas
│   ├── tipo_resolver.py   # Resolução de tipo de solicitação via IA
│   ├── alembic/           # Migrações de banco de dados
│   └── create_admin.py    # Script para criar usuário administrador
├── frontend/
│   ├── app/
│   │   ├── dashboard/     # KPIs e gráficos com proteção de dados
│   │   ├── processos/     # Tabela com filtros, paginação e upload
│   │   ├── relatorios/    # Geração de relatórios com IA
│   │   ├── admin/         # Gerenciamento de usuários
│   │   └── cadastro/      # Página de cadastro público
│   ├── components/        # Componentes UI (sidebar, date-picker, etc.)
│   ├── context/           # PermissionsContext para controle de acesso
│   ├── lib/               # API service (Axios) e utilitários
│   └── .env.local         # Variáveis de ambiente (não commitado)
├── gifs/                  # Animações de loading da interface
├── docs/
│   └── solucoes/          # 📚 Manual de soluções de erros resolvidos
│       ├── README.md      # Índice do manual
│       ├── setup/         # Erros de configuração e ambiente
│       ├── pdf/           # Erros no parser de PDF
│       ├── frontend/      # Erros de frontend e Next.js
│       └── deploy/        # Erros de Docker e deploy
├── Dockerfile             # Build para deploy em container (Railway)
├── railway.toml           # Configurações do Railway
├── requirements.txt       # Dependências Python
├── setup.bat              # ⭐ Setup inicial (primeira vez após clonar)
├── iniciar_projeto.bat    # ⭐ Iniciar backend + frontend localmente
└── README.md
```

> 📚 **Encontrou um erro?** Consulte o [Manual de Soluções](docs/solucoes/README.md) antes de debugar do zero.

---

## 🌐 Deploy (Railway)

A aplicação é implantada via **Railway** em um único serviço Docker (backend FastAPI + frontend Next.js em modo standalone).

```bash
# Build local para teste
docker build -t report-terra .
docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... -e AUTH_SECRET=... report-terra
```

**Variáveis de ambiente necessárias no Railway:**
- `DATABASE_URL` — URL do PostgreSQL provisionado no Railway
- `AUTH_SECRET` — Chave secreta do NextAuth.js
- `OPENAI_API_KEY` — (Opcional) Chave para relatórios com IA

---

## 🔗 Endpoints da API (Principais)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/upload` | Envia um PDF e inicia processamento em background |
| `POST` | `/upload/cancel` | Cancela o processamento em andamento e faz rollback |
| `GET` | `/upload/status` | Retorna o status e progresso do processamento atual |
| `GET` | `/processes` | Lista processos com filtros e paginação |
| `GET` | `/stats` | Retorna KPIs e séries temporais para o dashboard |
| `GET` | `/export-excel` | Exporta os processos filtrados como `.xlsx` |
| `DELETE` | `/clear` | Remove todos os registros do usuário |
| `POST` | `/report` | Gera relatório analítico com IA |
| `GET` | `/users` | Lista usuários (admin) |
| `POST` | `/users` | Cria novo usuário (admin) |
| `DELETE` | `/users/{id}` | Remove usuário (admin) |

---
Desenvolvido por Murilo.
