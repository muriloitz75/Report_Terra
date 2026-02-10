# 🚀 Guia de Deploy no Railway

## Visão Geral

Este guia mostra como fazer deploy da aplicação Report Terra no Railway de forma **100% automática**.

## Pré-requisitos

- ✅ Conta no [Railway](https://railway.app)
- ✅ Repositório no GitHub com o código
- ✅ Arquivos de configuração (já incluídos neste repo)

## Arquitetura de Deploy (Unificado)

A aplicação é implantada como **um único serviço** no Railway.

- **Nixpacks** constrói tanto o frontend (Node.js) quanto o backend (Python).
- O backend **FastAPI** serve a API *e* os arquivos estáticos do frontend.

## Passo a Passo

### 1. Criar Projeto
1. No Railway, **New Project** → **GitHub Repo**.
2. Selecione `Report_Terra`.
3. **Pronto!** O Railway detecta `nixpacks.toml` e faz tudo sozinho.

### 2. Variáveis de Ambiente
Vá em **Variables** e configure:
- `LOG_LEVEL`: `INFO`
- `NEXT_PUBLIC_API_URL`: Use a própria URL do serviço (será gerada no próximo passo, mas como é tudo no mesmo domínio, o frontend local deve usar `/api` ou a URL relativa se configurado, ou a URL absoluta se necessário).
  - *Nota*: Como o backend serve o frontend, as chamadas para `/upload` etc funcionam no mesmo domínio. O `NEXT_PUBLIC_API_URL` pode ser vazio ou a URL do próprio site.

### 3. URL Pública
1. Settings → Networking → **Generate Domain**.
2. Acesse o site!

## Configuração Interna

- `nixpacks.toml`: Define instalação de Python + Node.js e comandos de build.
- `frontend/next.config.ts`: `output: 'export'` gera arquivos estáticos em `frontend/out`.
- `backend/main.py`: Serve arquivos de `frontend/out` para rotas não-API.

## Troubleshooting

### Build Falha
- Verifique se `nixpacks.toml` está na raiz.
- Verifique logs de build.

### Página em Branco
- Verifique se `frontend/out/index.html` foi gerado.
- Verifique logs do backend ("Frontend not built...").

## Como Excluir Serviços Antigos

Se você está migrando para o deploy unificado, pode querer remover os serviços antigos (Backend e Frontend separados):

1. Clique no **card do serviço** que deseja excluir.
2. Vá em **Settings**.
3. Role até o final da página (Danger Zone).
4. Clique no botão vermelho **Delete Service**.
5. Confirme digitando o nome do serviço.


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
