# Stage 1: Build Frontend with standalone output
# Debian (glibc), igual ao estágio final: os módulos nativos do Next ficam compatíveis
FROM node:22-bookworm-slim AS frontend_build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
# Build - as rewrites do Next.js farão o proxy para o backend
RUN npm run build

# Stage 2: Production Environment
# Debian em vez de Alpine: pandas e numpy instalam de wheels prontos, sem compilar
FROM node:22-bookworm-slim

WORKDIR /app

# Install Python for backend
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip curl \
    && rm -rf /var/lib/apt/lists/*

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
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV BACKEND_API_URL=http://127.0.0.1:8000
ENV AUTH_TRUST_HOST=true
# O Next standalone escuta em HOSTNAME; sem isto, escutaria só no hostname do container
ENV HOSTNAME=0.0.0.0
# AUTH_SECRET e SECRET_KEY vêm das variáveis do Railway (nunca no código)

# Criar script de inicialização com supervisão do backend
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expor porta do frontend (principal)
EXPOSE 3000

# Comando de Inicialização (bash: o start.sh usa "wait -n", que o sh do Debian não tem)
CMD ["bash", "/app/start.sh"]
