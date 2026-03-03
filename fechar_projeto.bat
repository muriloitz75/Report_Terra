@echo off
setlocal
chcp 65001 > nul

echo ==========================================
echo    REPORT TERRA - ENCERRAR PROJETO
echo ==========================================
echo.
echo Procurando e encerrando processos nas portas 3000 e 8000...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Matando processo na porta 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Matando processo na porta 8000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ==========================================
echo  PROCESSOS ENCERRADOS COM SUCESSO!
echo ==========================================
pause
