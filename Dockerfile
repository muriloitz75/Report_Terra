# Stage 1: Build Frontend with standalone output
FROM node:22-alpine AS frontend_build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
# Build - as rewrites do Next.js farão o proxy para o backend
RUN npm run build

# Stage 2: Production Environment
FROM node:22-alpine

WORKDIR /app

# Install Python for backend
RUN apk add --no-cache python3 py3-pip build-base libffi-dev

# Setup Backend dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Copiar código do Backend
COPY backend/ ./backend/

# Copiar Frontend standalone do Next.js
COPY --from=frontend_build /app/frontend/.next/standalone ./frontend/standalone
COPY --from=frontend_build /app/frontend/.next/static ./frontend/standalone/.next/static
COPY --from=frontend_build /app/frontend/public ./frontend/standalone/public

# Variáveis de Ambiente Padrão
ENV PORT=8000
ENV LOG_LEVEL=INFO
ENV NODE_ENV=production
ENV BACKEND_API_URL=http://localhost:8000

# Criar script de inicialização que inicia ambos os serviços
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Iniciando backend na porta 8000..."' >> /app/start.sh && \
    echo 'cd /app/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &' >> /app/start.sh && \
    echo 'sleep 3' >> /app/start.sh && \
    echo 'echo "Iniciando frontend na porta 3000..."' >> /app/start.sh && \
    echo 'cd /app/frontend/standalone && PORT=3000 node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expor porta do frontend (principal)
EXPOSE 3000

# Comando de Inicialização
CMD ["/app/start.sh"]
