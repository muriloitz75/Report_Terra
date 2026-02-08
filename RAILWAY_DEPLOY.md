# Report Terra - Deploy Railway

## 🚀 Deploy Rápido

### Backend (Já Deployado)
- **URL**: https://web-production-0d794.up.railway.app
- **Docs**: https://web-production-0d794.up.railway.app/docs
- **Status**: ✅ Online

### Frontend (Próximo Passo)

#### 1. Criar Service no Railway
```bash
Railway Dashboard → + New → GitHub Repo → Report_Terra
```

#### 2. Configurar
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

#### 3. Variável de Ambiente
```
NEXT_PUBLIC_API_URL=https://web-production-0d794.up.railway.app
```

#### 4. Generate Domain
```
Settings → Networking → Generate Domain
```

---

## 🔧 Otimizações Aplicadas

### Backend
- ✅ Import relativo corrigido
- ✅ Health check endpoint (`/`)
- ✅ Logging configurável via `LOG_LEVEL`
- ✅ 2 workers para melhor performance
- ✅ Metadados da API (título, versão)
- ✅ Healthcheck automático do Railway

### Frontend
- ✅ API URL via variável de ambiente
- ✅ Output standalone para Railway
- ✅ Compressão habilitada
- ✅ Otimização de imagens (AVIF/WebP)
- ✅ Headers de segurança

---

## 📝 Arquivos Modificados

### Backend
- `backend/main.py` - Logging e metadados
- `backend/__init__.py` - Pacote Python
- `Procfile` - 2 workers
- `railway.json` - Healthcheck
- `Aptfile` - Dependências do sistema

### Frontend
- `frontend/lib/api.ts` - Variável de ambiente
- `frontend/next.config.ts` - Otimizações
- `frontend/.env.local` - Dev local
- `frontend/.env.example` - Template

---

## 🧪 Testar

### Backend
```bash
curl https://web-production-0d794.up.railway.app/
```

### Frontend (após deploy)
```bash
curl https://seu-frontend.up.railway.app/
```

### Script de Teste
```bash
python test_railway_deploy.py
```

---

## 📚 Documentação Completa

- [Frontend Setup Guide](file:///C:/Users/Murilo/.gemini/antigravity/brain/3bbda5de-bb53-447b-ac67-0be24c5ff8ac/frontend_setup_guide.md)
- [Railway Setup Guide](file:///C:/Users/Murilo/.gemini/antigravity/brain/3bbda5de-bb53-447b-ac67-0be24c5ff8ac/railway_setup_guide.md)
- [Debug Report](file:///C:/Users/Murilo/.gemini/antigravity/brain/3bbda5de-bb53-447b-ac67-0be24c5ff8ac/debug_report.md)

---

**Tudo pronto para rodar no Railway!** 🎉
