# 🚀 Guia de Deploy no Railway

## Visão Geral

Este guia mostra como fazer deploy da aplicação Report Terra no Railway de forma **100% automática**.

## Pré-requisitos

- ✅ Conta no [Railway](https://railway.app)
- ✅ Repositório no GitHub com o código
- ✅ Arquivos de configuração (já incluídos neste repo)

## Arquitetura de Deploy

A aplicação usa **2 serviços separados**:

1. **Backend** (FastAPI) - Processa PDFs e fornece API
2. **Frontend** (Next.js) - Interface do usuário

## Passo a Passo

### 1. Criar Conta no Railway

1. Acesse [railway.app](https://railway.app)
2. Faça login com GitHub
3. Autorize o Railway a acessar seus repositórios

### 2. Deploy do Backend

#### 2.1. Criar Novo Projeto
1. No Railway, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha o repositório `Report_Terra`
4. Railway detecta automaticamente o `Procfile` e `requirements.txt`

#### 2.2. Configurar Serviço Backend
Railway detecta automaticamente:
- ✅ Python como linguagem
- ✅ `requirements.txt` para dependências
- ✅ `Procfile` para comando de start
- ✅ `railway.json` para configurações

**Nenhuma configuração manual necessária!** 🎉

#### 2.3. Obter URL do Backend
1. Após deploy, vá em **Settings** → **Networking**
2. Clique em **Generate Domain**
3. Copie a URL (ex: `https://report-terra-backend.up.railway.app`)

### 3. Deploy do Frontend

#### 3.1. Adicionar Segundo Serviço
1. No mesmo projeto, clique em **"New"** → **"GitHub Repo"**
2. Selecione o mesmo repositório `Report_Terra`
3. Em **Settings** → **Service**, configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

#### 3.2. Configurar Variável de Ambiente
1. Vá em **Variables**
2. Adicione:
   ```
   NEXT_PUBLIC_API_URL=https://sua-url-do-backend.up.railway.app
   ```
   (Use a URL do backend copiada no passo 2.3)

#### 3.3. Gerar Domínio do Frontend
1. Vá em **Settings** → **Networking**
2. Clique em **Generate Domain**
3. Acesse a URL gerada (ex: `https://report-terra.up.railway.app`)

## Configurações Automáticas

### Backend (`railway.json`)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### Frontend (`railway.frontend.toml`)
```toml
[build]
builder = "NIXPACKS"
watchPatterns = ["frontend/**"]

[deploy]
startCommand = "cd frontend && npm run build && npm start"
healthcheckPath = "/"
```

## Deploy Contínuo (Automático)

Após configuração inicial, **tudo é automático**:

1. Faça alterações no código
2. Commit e push para GitHub:
   ```bash
   git add .
   git commit -m "sua mensagem"
   git push
   ```
3. Railway detecta automaticamente
4. Build e deploy acontecem automaticamente
5. Aplicação atualizada em ~2-5 minutos

## Verificação

### Backend
1. Acesse: `https://sua-url-backend.up.railway.app`
2. Deve retornar:
   ```json
   {
     "status": "online",
     "message": "Report Terra API está funcionando! 🚀"
   }
   ```
3. Acesse `/docs` para ver documentação da API

### Frontend
1. Acesse: `https://sua-url-frontend.up.railway.app`
2. Deve carregar o dashboard
3. Abra console (F12) - não deve haver erros
4. Teste upload de PDF

## Troubleshooting

### Backend não inicia
- Verifique logs no Railway
- Confirme que `Aptfile` está presente (necessário para poppler-utils)
- Verifique se todas as dependências estão em `requirements.txt`

### Frontend não conecta ao backend
- Verifique variável `NEXT_PUBLIC_API_URL`
- Confirme que URL do backend está correta
- Verifique CORS no backend (já configurado para aceitar todas as origens)

### Build falha
- Verifique logs de build no Railway
- Confirme que `package.json` está correto
- Verifique se `next.config.ts` tem `output: 'standalone'`

## Recursos do Railway

### Logs
- Acesse **Deployments** → Clique no deployment → **View Logs**
- Logs em tempo real de build e runtime

### Métricas
- CPU, memória, e uso de rede
- Disponível em **Metrics**

### Rollback
- Se algo der errado, clique em **Deployments**
- Selecione um deployment anterior
- Clique em **Redeploy**

## Melhorias Futuras

### Banco de Dados
1. No Railway, adicione **PostgreSQL**:
   - Clique em **New** → **Database** → **PostgreSQL**
2. Railway fornece variável `DATABASE_URL` automaticamente
3. Atualize código para usar PostgreSQL em vez de lista em memória

### Cache
1. Adicione **Redis**:
   - Clique em **New** → **Database** → **Redis**
2. Use para cache de estatísticas

### Domínio Customizado
1. Vá em **Settings** → **Networking**
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

## Custos

Railway oferece:
- **$5 de crédito grátis por mês**
- Suficiente para desenvolvimento e testes
- Plano pago disponível para produção

## Suporte

- Documentação: [docs.railway.app](https://docs.railway.app)
- Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Issues: Reporte problemas no repositório

## Resumo

✅ **Setup inicial**: ~10 minutos  
✅ **Deploy automático**: Push para GitHub  
✅ **Sem configuração manual**: Tudo via arquivos de config  
✅ **Escalável**: Adicione banco de dados quando necessário  

**Pronto para produção!** 🚀
