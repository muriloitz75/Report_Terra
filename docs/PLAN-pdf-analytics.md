# Plano de Projeto: Dashboard de Análise de PDFs ("Report Terra")

> **Objetivo:** Desenvolver uma aplicação web moderna para extrair, visualizar e analisar dados de processos a partir de arquivos PDF (`21.pdf`).
> **Saída:** Um dashboard Next.js com cartões de KPIs, gráficos interativos e uma tabela de dados filtrável.
> **Status:** EXECUÇÃO (Pronto para Iniciar Fase 1)
> **Responsável:** @antigravity-agent

---

## 🏗️ Fase 1: Análise e Requisitos (Confirmados)

### 1.1 Regras de Negócio
- **Cálculo de Atraso:**
  - Um processo é considerado **Atrasado** se: `(Data Abertura + 30 dias) < Data Base (Hoje)`.
  - Apenas processos **NÃO Encerrados** podem estar atrasados.
- **Gráfico de Evolução:**
  - Visualizar a evolução temporal baseada na **Data de Abertura** dos processos.
  - Séries: `Total`, `Encerrados`, `Em Andamento`, `Atrasados`.
  - Eixo X: Mês/Ano (Agrupado).

### 1.2 Requisitos Visuais
- **KPIs (Indicadores):**
  - Cartões destacados para totais de processamento.
- **Gráfico de Linha:**
  - Comparativo mensal de entrada vs. situação atual (quantos daquele mês estão atrasados hoje).
- **Grade de Dados (Tabela):**
  - **Colunas:**
    1. Nº Processo / Ano
    2. Contribuinte Requerente
    3. Situação (Status)
    4. Tipo de Solicitação
    5. Dias de Atraso (Calculado: `Hoje - (Data Abertura + 30 dias)`)
  - **Filtros:** Tipo Solicitação, Período, Checkbox "Apenas Atrasados".

---

## 🛠️ Fase 2: Arquitetura Técnica

### 2.1 Stack Tecnológico
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Shadcn/UI, Recharts.
- **Backend:** Python (FastAPI) com `pdfplumber` e `pandas`.
- **Banco de Dados:** SQLite.

### 2.2 Esquema de Dados
```sql
CREATE TABLE processos (
    id TEXT PRIMARY KEY,
    numero_processo TEXT,   -- Coluna 1
    ano_processo INTEGER,
    contribuinte TEXT,      -- Coluna 2
    tipo_solicitacao TEXT,  -- Coluna 4
    status_raw TEXT,        -- Coluna 3 (Situação)
    data_abertura DATE,     -- Base para cálculo
    status_calculado TEXT,  -- 'Atrasado' se aplicável
    dias_atraso INTEGER     -- Coluna 5
);
```

---

## 📅 Fase 3: Plano de Implementação

### Passo 1: Configuração de Infraestrutura (Backend API)
- [ ] Inicializar ambiente Python (FastAPI).
- [ ] Implementar `POST /upload`: Recebe PDF.
- [ ] **Script de Extração (`process_pdf.py`):**
  - Extrair colunas da tabela PDF.
  - Aplicar regra de 30 dias.
  - Retornar JSON com campos calculados.

### Passo 2: Backend - Endpoints de Análise
- [ ] `GET /stats`:
  - Agrupar por Mês/Ano para o gráfico de linha.
  - Calcular totais para KPIs.
- [ ] `GET /processos`: Lista paginada para a tabela.

### Passo 3: Frontend - Dashboard & Upload
- [ ] Setup Next.js + Tailwind + Shadcn.
- [ ] Página de Upload (Drag & Drop).
- [ ] Dashboard Principal:
  - KPI Cards.
  - Gráfico de Linha (Recharts) com as 3 séries.

### Passo 4: Frontend - Tabela Detalhada
- [ ] Componente `DataTable` com as colunas definidas.
- [ ] Filtros avançados (Data, Tipo, Atrasado).

---

## ✅ Fase 4: Checklist de Verificação

- [ ] **Regra de 30 dias:** Testar fronteira (processo com 29 vs 31 dias).
- [ ] **Evolução Temporal:** Gráfico deve mostrar corretamente processos antigos que ainda estão em aberto.
- [ ] **Usabilidade:** Upload do PDF deve ser intuitivo.

---
