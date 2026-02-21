@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo.
echo ==========================================
echo    REPORT TERRA - SETUP INICIAL
echo ==========================================
echo.

:: --- 1. Verificar Python ---
echo [1/5] Verificando Python...
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado.
    echo        Instale Python 3.10+ em https://python.org
    echo        Certifique-se de marcar "Add Python to PATH" durante a instalacao!
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo        OK - Python %PY_VER% encontrado.

:: --- 2. Verificar Node.js ---
echo [2/5] Verificando Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo        Instale Node.js 20+ em https://nodejs.org
    pause
    exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do set NODE_VER=%%v
echo        OK - Node.js %NODE_VER% encontrado.

:: --- 3. Ambiente Virtual Python (.venv) ---
echo.
echo [3/5] Configurando ambiente Python...
if exist ".venv\" (
    echo        OK - Ambiente virtual ja existe. Pulando instalacao.
) else (
    echo        Criando ambiente virtual .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar .venv.
        pause
        exit /b 1
    )
    echo        Instalando dependencias Python ^(aguarde, pode demorar alguns minutos^)...
    .venv\Scripts\python.exe -m pip install --upgrade pip --quiet
    .venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias Python.
        pause
        exit /b 1
    )
    echo        OK - Dependencias Python instaladas.
)

:: --- 4. Banco de dados + usuario admin ---
echo.
echo [4/5] Inicializando banco de dados...
if exist "backend\data\report_terra.db" (
    echo        OK - Banco ja existe. Pulando inicializacao.
) else (
    echo        Criando tabelas no banco...
    .venv\Scripts\python.exe -c "import sys; sys.path.insert(0,'backend'); from database import Base, engine; from models import User, Processo; Base.metadata.create_all(bind=engine); print('Tabelas criadas com sucesso.')"
    if errorlevel 1 (
        echo [ERRO] Falha ao criar tabelas no banco.
        pause
        exit /b 1
    )
    echo        Criando usuario admin padrao...
    set "MY_ROOT=%~dp0"
    cd backend
    "!MY_ROOT!.venv\Scripts\python.exe" create_admin.py admin@admin.com admin123 Administrador
    cd ..
    echo        OK - Banco inicializado.
    echo        Login: admin@admin.com  /  Senha: admin123
)

:: --- 5. Frontend (npm install + .env.local) ---
echo.
echo [5/5] Configurando Frontend...
if exist "frontend\node_modules\" (
    echo        OK - node_modules ja existe. Pulando instalacao.
) else (
    echo        Instalando dependencias npm ^(aguarde, pode demorar alguns minutos^)...
    cd frontend
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias npm.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo        OK - Dependencias npm instaladas.
)

if not exist "frontend\.env.local" (
    echo        Criando frontend\.env.local...
    echo NEXT_PUBLIC_API_URL=http://localhost:8000> frontend\.env.local
    echo AUTH_SECRET=report-terra-secret-local-dev-2024>> frontend\.env.local
    echo        OK - .env.local criado.
) else (
    echo        OK - .env.local ja existe.
)

:: --- Finalizacao ---
echo.
echo ==========================================
echo    SETUP CONCLUIDO COM SUCESSO!
echo ==========================================
echo.
echo  Proximo passo: clique duas vezes em
echo  iniciar_projeto.bat para rodar o sistema.
echo.
echo  Login padrao: admin@admin.com
echo  Senha padrao: admin123
echo.
echo  (Opcional) Para relatorios com IA, edite
echo  o arquivo frontend\.env.local e adicione:
echo  OPENAI_API_KEY=sk-...
echo ==========================================
pause
