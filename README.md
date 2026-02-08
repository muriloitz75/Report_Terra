
# Report Terra - Análise Inteligente de Processos

O **Report Terra** é uma aplicação web desenvolvida para extrair, analisar e visualizar dados de processos a partir de relatórios em PDF (especificamente relatórios de "Tramitação de Processos").

A ferramenta automatiza a leitura de arquivos PDF, identifica processos atrasados com base em regras de negócio e apresenta os dados em um dashboard interativo.

![Dashboard Preview](media/dashboard_preview.png)
*(Espaço reservado para print da tela)*

## 🚀 Funcionalidades

-   **Extração Automática**: Upload de arquivos PDF e parser inteligente (Regex) para identificar nº do processo, contribuinte, datas e status.
-   **Regras de Negócio**: Identificação automática de processos "Atrasados" (em aberto há mais de 30 dias).
-   **Dashboard Interativo**:
    -   KPIs (Total, Encerrados, Em Andamento, Atrasados).
    -   Gráfico de Evolução Temporal (entradas por mês).
    -   Gráfico de Top Tipos de Solicitação.
-   **Consulta e Filtros**:
    -   Tabela pesquisável e paginada.
    -   Filtros por Tipo de Solicitação e Situação (Status).
    -   Filtro rápido para "Apenas Atrasados".

## 🛠️ Tecnologias Utilizadas

### Frontend
-   **Framework**: Next.js 14 (App Router)
-   **Estilização**: Tailwind CSS v4 + Shadcn/UI
-   **Gráficos**: Recharts
-   **Ícones**: Lucide React
-   **HTTP Client**: Axios

### Backend
-   **Framework**: FastAPI (Python)
-   **Processamento de PDF**: `pdfplumber`
-   **Análise de Dados**: Pandas
-   **Servidor**: Uvicorn

## 📦 Como Executar o Projeto

### Pré-requisitos
-   Node.js (v18+)
-   Python (v3.10+)

### 1. Backend (API)

```bash
# Navegue até a pasta raiz
cd "Report Terra"

# Crie e ative o ambiente virtual (Windows)
python -m venv .venv
.venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor (padrão: http://localhost:8000)
python backend/main.py
```

### 2. Frontend (Interface)

```bash
# Em outro terminal, navegue até a pasta frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse a aplicação em: **http://localhost:3000**


## 🚀 Deploy no Railway

Este projeto está configurado para deploy no Railway como monorepo com 2 serviços separados.

### Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Repositório conectado ao GitHub
3. Código commitado e pushed

### Configuração dos Serviços

#### 1. Backend Service (FastAPI)

No Railway Dashboard:

1. **New Service** → Selecione o repositório
2. **Settings**:
   - **Root Directory**: `/` (raiz do projeto)
   - **Build Command**: (deixar vazio - usa `nixpacks.toml`)
   - **Start Command**: (deixar vazio - usa `nixpacks.toml`)
3. **Deploy** e aguarde o build

Após deploy, copie a URL do backend (ex: `https://backend-xyz.railway.app`)

#### 2. Frontend Service (Next.js)

No Railway Dashboard:

1. **New Service** → Selecione o mesmo repositório
2. **Settings**:
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. **Variables** → Adicionar:
   - `NEXT_PUBLIC_API_URL`: Cole a URL do backend (do passo anterior)
4. **Deploy** e aguarde o build

### Verificação

- **Backend**: Acesse `https://seu-backend.railway.app/docs` para ver a documentação da API
- **Frontend**: Acesse `https://seu-frontend.railway.app` para usar a aplicação
- **Teste**: Faça upload de um PDF e verifique se os dados são processados

### Troubleshooting

**Erro de build no backend**:
- Verifique se `nixpacks.toml` está na raiz do projeto
- Confirme que `requirements.txt` está presente

**Frontend não conecta ao backend**:
- Verifique se a variável `NEXT_PUBLIC_API_URL` está configurada corretamente
- A URL deve incluir `https://` e não ter `/` no final

**Erro de CORS**:
- O backend já está configurado para aceitar todas as origens (`allow_origins=["*"]`)

---

## 📂 Estrutura do Projeto

```
Report Terra/
├── backend/             # API Python e Lógica de Extração
│   ├── main.py          # Endpoints FastAPI
│   ├── process_pdf.py   # Parser e Regex
│   └── inspect_pdf.py   # Script utilitário
├── frontend/            # Aplicação Next.js
│   ├── app/             # Páginas (App Router)
│   ├── components/      # Componentes UI (Shadcn)
│   └── lib/             # API Service e Utils
├── docs/                # Documentação de Planejamento
└── pdf model/           # Arquivos de exemplo para teste
```

## 📝 Regras de Processamento

1.  **Identificação de Processos**: O sistema busca por linhas iniciadas com o padrão de ID (ex: `000583 - 2026` ou `40011952 - 2025`).
2.  **Cálculo de Atraso**: Um processo é considerado "Atrasado" se:
    -   Status for "ANDAMENTO".
    -   Data de Abertura for anterior a 30 dias da data atual.

---
Desenvolvido por Murilo.
