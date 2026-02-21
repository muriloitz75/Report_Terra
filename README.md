
# Report Terra — Análise Inteligente de Processos

O **Report Terra** é uma aplicação web para extrair, analisar e visualizar dados de processos a partir de relatórios PDF de "Tramitação de Processos". A ferramenta automatiza a leitura de PDFs, identifica processos atrasados e apresenta os dados em um dashboard interativo com geração de relatórios por IA.

## 🚀 Funcionalidades

- **Extração Automática de PDF**: Upload de arquivos PDF com parser inteligente (Regex + pdfplumber) que extrai nº do processo, contribuinte, datas, setores, tipo e status.
- **Regras de Negócio**: Identificação automática de processos "Atrasados" (em andamento há mais de 30 dias).
- **Dashboard Interativo**:
  - KPIs: Total, Encerrados, Em Andamento, Atrasados.
  - Gráfico de Evolução Temporal por mês.
  - Gráfico de Top 10 Tipos de Solicitação.
  - Filtro por período com Date Range Picker.
- **Tabela de Processos**:
  - Busca por ID, Contribuinte ou Tipo.
  - Filtros multi-select por Status e Tipo de Solicitação.
  - Filtro de período e toggle "Apenas Atrasados".
  - Paginação completa (primeira, anterior, próxima, última).
  - Exportação para Excel (respeitando filtros ativos).
- **Relatórios com IA**: Geração de análises inteligentes via OpenAI (GPT), com insights sobre padrões, gargalos e recomendações.

## 🛠️ Tecnologias

### Frontend
| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 16.x (Turbopack) | Framework React com App Router |
| Tailwind CSS | 4.x | Estilização |
| Shadcn/UI | — | Componentes UI (Radix) |
| Recharts | 3.x | Gráficos |
| Lucide React | — | Ícones |
| Axios | — | HTTP Client |

### Backend
| Tecnologia | Versão | Uso |
|---|---|---|
| FastAPI | 0.115 | API REST |
| pdfplumber | 0.11 | Extração de texto de PDF |
| Pandas | 2.2 | Análise e filtragem de dados |
| LangChain + OpenAI | — | Geração de relatórios com IA |
| Uvicorn | 0.32 | Servidor ASGI |

## 📦 Como Executar (Windows)

### Pré-requisitos
- **Node.js** v20+ → [nodejs.org](https://nodejs.org)
- **Python** v3.10+ → [python.org](https://python.org) *(marque "Add Python to PATH" na instalação)*

---

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
| Documentação API | http://localhost:8000/docs |

---

### (Opcional) Relatórios com IA

Adicione sua chave no arquivo `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
```

## 📂 Estrutura do Projeto

```
Report_Terra/
├── backend/
│   ├── main.py            # Endpoints FastAPI (upload, stats, processos, relatórios)
│   ├── process_pdf.py     # Parser de PDF com bounding-box (pdfplumber)
│   ├── ai_agent.py        # Agente IA com LangChain para relatórios
│   ├── database.py        # Configuração SQLAlchemy (SQLite local)
│   ├── models.py          # Models ORM (User, Processo)
│   └── auth.py            # JWT + hashing de senhas
├── frontend/
│   ├── app/
│   │   ├── dashboard/     # KPIs e gráficos
│   │   ├── processos/     # Tabela com filtros e paginação
│   │   └── relatorios/    # Geração de relatórios com IA
│   ├── components/        # Componentes UI (sidebar, date-picker, etc.)
│   ├── lib/               # API service (Axios) e utilitários
│   └── .env.local         # Variáveis de ambiente (não commitado)
├── docs/
│   └── solucoes/          # 📚 Manual de soluções de erros resolvidos
│       ├── README.md      # Índice do manual
│       ├── TEMPLATE.md    # Template para novos registros
│       ├── setup/         # Erros de configuração e ambiente
│       ├── pdf/           # Erros no parser de PDF
│       ├── frontend/      # Erros de frontend e Next.js
│       └── deploy/        # Erros de Docker e deploy
├── pdf model/             # PDF de exemplo para testes
├── Dockerfile             # Build para deploy em container
├── requirements.txt       # Dependências Python
├── setup.bat              # ⭐ Setup inicial (primeira vez após clonar)
├── iniciar_projeto.bat    # ⭐ Iniciar backend + frontend
└── README.md
```

> 📚 **Encontrou um erro?** Consulte o [Manual de Soluções](docs/solucoes/README.md) antes de debugar do zero.

## 📝 Regras de Processamento

1. **Identificação de Processos**: O parser busca linhas com padrão de ID (ex: `000583 - 2026`, `40011952 - 2025`).
2. **Cálculo de Atraso**: Um processo é "Atrasado" se o status for `ANDAMENTO` e a data de abertura for anterior a 30 dias.
3. **Status Reconhecidos**: `ANDAMENTO`, `ENCERRAMENTO`, `DEFERIDO`, `INDEFERIDO`.

## 🐳 Deploy com Docker

```bash
docker build -t report-terra .
docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... report-terra
```

---
Desenvolvido por Murilo.
