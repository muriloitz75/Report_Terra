@echo off
setlocal
chcp 65001 > nul

echo ==========================================
echo    REPORT TERRA - INICIAR LOCALHOST
echo ==========================================

:: Verificar se o setup foi executado
if not exist ".venv\" (
    echo.
    echo [AVISO] Ambiente nao configurado!
    echo Execute primeiro o arquivo setup.bat
    echo.
    pause
    exit /b 1
)

if not exist "frontend\node_modules\" (
    echo.
    echo [AVISO] Dependencias do frontend nao encontradas!
    echo Execute primeiro o arquivo setup.bat
    echo.
    pause
    exit /b 1
)

if not exist "frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000> frontend\.env.local
)

:: Iniciar Backend em uma nova janela
echo [1/2] Iniciando Backend (FastAPI)...
start "Backend - Report Terra" cmd /k "cd backend && ..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Aguardar o backend subir
timeout /t 4 /nobreak > nul

:: Iniciar Frontend em outra nova janela
echo [2/2] Iniciando Frontend (Next.js)...
start "Frontend - Report Terra" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo  SERVIDORES INICIADOS
echo ==========================================
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/docs
echo ==========================================
echo  Pressione qualquer tecla para fechar
echo  (os servidores continuarao rodando).
pause > nul
