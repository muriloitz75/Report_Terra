# Stage 1: Build Frontend
FROM node:22-alpine AS frontend_build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
# Ignorar checagem de tipos e linting para garantir build em produção se houver warnings menores
RUN npm run build

# Stage 2: Production Environment
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema necessárias (se houver) e limpar cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Setup Backend
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código do Backend
COPY backend/ ./backend/

# Copiar Build do Frontend do Stage 1
# O backend espera que esteja em /app/frontend/out
COPY --from=frontend_build /app/frontend/out ./frontend/out

# Variáveis de Ambiente Padrão
ENV PORT=8000
ENV LOG_LEVEL=INFO

# Comando de Inicialização
# Comando de Inicialização
# Usa Python para iniciar o Uvicorn, evitando problemas de expansão de variáveis no shell
CMD ["python", "-c", "import os; import uvicorn; uvicorn.run('backend.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))"]
