
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

## 📦 Como Executar

### Pré-requisitos
- **Node.js** v20+
- **Python** v3.10+
- **OpenAI API Key** (opcional, para relatórios IA)

### 🚀 Forma Rápida (Windows)

Clique duas vezes no **`iniciar_projeto.bat`** na raiz do projeto. Ele abrirá Backend e Frontend automaticamente em janelas separadas.

### Execução Manual

#### 1. Backend (API)

```bash
# Na pasta raiz do projeto
python -m venv .venv
.venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor (http://localhost:8000)
python -m backend.main
```

#### 2. Frontend (Interface)

```bash
# Em outro terminal, na pasta frontend/
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:3000**

### Variáveis de Ambiente

#### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (opcional)
```
OPENAI_API_KEY=sk-...   # Necessário apenas para relatórios IA
```

## 📂 Estrutura do Projeto

```
Report_Terra/
├── backend/
│   ├── __init__.py        # Package init
│   ├── main.py            # Endpoints FastAPI (upload, stats, processos, relatórios)
│   ├── process_pdf.py     # Parser de PDF (Regex + pdfplumber)
│   └── ai_agent.py        # Agente IA com LangChain para relatórios
├── frontend/
│   ├── app/
│   │   ├── dashboard/     # Página de KPIs e gráficos
│   │   ├── processos/     # Tabela com filtros e paginação
│   │   └── relatorios/    # Geração de relatórios com IA
│   ├── components/        # Componentes UI (sidebar, date-picker, etc.)
│   └── lib/               # API service (Axios) e utilitários
├── pdf model/             # Arquivo PDF de exemplo para testes
├── Dockerfile             # Build para deploy em container
├── requirements.txt       # Dependências Python
├── iniciar_projeto.bat    # Script de inicialização (Windows)
└── README.md
```

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
