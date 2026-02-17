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
RUN apk add --no-cache python3 py3-pip build-base libffi-dev curl

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
ENV LOG_LEVEL=INFO
ENV NODE_ENV=production
ENV BACKEND_API_URL=http://127.0.0.1:8000
ENV AUTH_TRUST_HOST=true
# AUTH_SECRET deve ser passado via variável de ambiente no deploy (não hardcoded)
# Ex: docker run -e AUTH_SECRET=sua-chave-secreta ...
ENV AUTH_SECRET=""

# Criar script de inicialização com supervisão do backend
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expor porta do frontend (principal)
EXPOSE 3000

# Comando de Inicialização
CMD ["/app/start.sh"]
