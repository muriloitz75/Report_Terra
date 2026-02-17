#!/bin/sh
set -e

# Trap SIGTERM/SIGINT to gracefully shutdown both processes
cleanup() {
    echo "Encerrando todos os processos..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGTERM SIGINT

# --- Start Backend with auto-restart ---
start_backend() {
    while true; do
        echo "Iniciando backend na porta 8000..."
        cd /app/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
        BACKEND_PID=$!

        # Wait for backend to be ready
        echo "Aguardando backend ficar pronto..."
        for i in $(seq 1 30); do
            if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
                echo "Backend pronto!"
                break
            fi
            sleep 1
        done

        # Wait for backend process to exit
        wait $BACKEND_PID 2>/dev/null || true
        EXIT_CODE=$?
        echo "Backend encerrou (exit code: $EXIT_CODE). Reiniciando em 2s..."
        sleep 2
    done
}

# Start backend supervisor in background
start_backend &
SUPERVISOR_PID=$!

# Wait for backend to be ready before starting frontend
echo "Aguardando backend para iniciar frontend..."
until curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; do sleep 1; done

# --- Start Frontend (main process) ---
echo "Iniciando frontend..."
cd /app/frontend/standalone && node server.js &
FRONTEND_PID=$!

# Wait for any process to exit
wait -n $SUPERVISOR_PID $FRONTEND_PID 2>/dev/null || true
echo "Um processo encerrou. Encerrando container..."
cleanup
