@echo off
echo ==========================================
echo    INICIANDO REPORT TERRA - LOCALHOST
echo ==========================================

:: Iniciar Backend em uma nova janela
echo [1/2] Iniciando Backend (FastAPI)...
start "Backend - Report Terra" cmd /k "set PYTHONPATH=.&& .venv\Scripts\activate.bat && python -m backend.main"

:: Aguardar um pouco para o backend subir
timeout /t 3 /nobreak > nul

:: Iniciar Frontend em outra nova janela
echo [2/2] Iniciando Frontend (Next.js)...
start "Frontend - Report Terra" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo    SUCESSO! SERVIDORES EM INICIALIZACAO
echo ==========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo Documentacao: http://localhost:8000/docs
echo ==========================================
echo Pressione qualquer tecla para fechar esta janela (os servidores continuarao abertos).
pause > nul
