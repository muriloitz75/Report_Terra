#!/usr/bin/env python3
"""
Script de teste para validar o deploy no Railway.
Testa conectividade do backend e integração com frontend.
"""

import requests
import sys
import json
from typing import Optional

# Cores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg: str):
    print(f"{RED}❌ {msg}{RESET}")

def print_info(msg: str):
    print(f"{BLUE}ℹ️  {msg}{RESET}")

def print_warning(msg: str):
    print(f"{YELLOW}⚠️  {msg}{RESET}")

def test_backend_health(backend_url: str) -> bool:
    """Testa se o backend está respondendo."""
    print_info(f"Testando conectividade com backend: {backend_url}")
    
    try:
        response = requests.get(f"{backend_url}/docs", timeout=10)
        if response.status_code == 200:
            print_success("Backend está online e respondendo")
            return True
        else:
            print_error(f"Backend retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Erro ao conectar ao backend: {e}")
        return False

def test_backend_cors(backend_url: str) -> bool:
    """Testa se CORS está configurado corretamente."""
    print_info("Testando configuração CORS...")
    
    try:
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(f"{backend_url}/upload", headers=headers, timeout=10)
        
        if 'access-control-allow-origin' in response.headers:
            print_success("CORS configurado corretamente")
            return True
        else:
            print_warning("CORS pode não estar configurado corretamente")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Erro ao testar CORS: {e}")
        return False

def test_frontend(frontend_url: str) -> bool:
    """Testa se o frontend está respondendo."""
    print_info(f"Testando frontend: {frontend_url}")
    
    try:
        response = requests.get(frontend_url, timeout=10)
        if response.status_code == 200:
            print_success("Frontend está online")
            return True
        else:
            print_error(f"Frontend retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Erro ao conectar ao frontend: {e}")
        return False

def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}🧪 Railway Deploy Test Suite{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Solicitar URLs
    backend_url = input(f"{YELLOW}Digite a URL do backend (ex: https://seu-backend.up.railway.app): {RESET}").strip()
    if not backend_url:
        print_error("URL do backend é obrigatória")
        sys.exit(1)
    
    # Adicionar https:// se não tiver protocolo
    if not backend_url.startswith(('http://', 'https://')):
        backend_url = f"https://{backend_url}"
        print_info(f"URL corrigida para: {backend_url}")
    
    # Remover trailing slash
    backend_url = backend_url.rstrip('/')
    
    frontend_url = input(f"{YELLOW}Digite a URL do frontend (ou Enter para pular): {RESET}").strip()
    if frontend_url and not frontend_url.startswith(('http://', 'https://')):
        frontend_url = f"https://{frontend_url}"
        print_info(f"URL corrigida para: {frontend_url}")
    frontend_url = frontend_url.rstrip('/') if frontend_url else None
    
    print(f"\n{BLUE}{'='*60}{RESET}\n")
    
    # Executar testes
    results = []
    
    # Teste 1: Backend Health
    results.append(("Backend Health", test_backend_health(backend_url)))
    print()
    
    # Teste 2: Backend CORS
    results.append(("Backend CORS", test_backend_cors(backend_url)))
    print()
    
    # Teste 3: Frontend (se URL fornecida)
    if frontend_url:
        results.append(("Frontend", test_frontend(frontend_url)))
        print()
    
    # Resumo
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}📊 Resumo dos Testes{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{GREEN}✅ PASSOU{RESET}" if result else f"{RED}❌ FALHOU{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{BLUE}Total: {passed}/{total} testes passaram{RESET}\n")
    
    if passed == total:
        print_success("🎉 Todos os testes passaram! Sua aplicação está funcionando corretamente.")
        print_info(f"Backend Docs: {backend_url}/docs")
        if frontend_url:
            print_info(f"Frontend: {frontend_url}")
        sys.exit(0)
    else:
        print_error("Alguns testes falharam. Verifique a configuração.")
        print_info("Consulte o guia: railway_setup_guide.md")
        sys.exit(1)

if __name__ == "__main__":
    main()
