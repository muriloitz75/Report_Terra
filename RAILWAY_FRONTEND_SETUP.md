# Railway Frontend Service

## 🎯 Solução Alternativa: railway.toml

Se você não encontrou a opção "Root Directory" na interface do Railway, use este arquivo de configuração.

### Passos:

1. **Renomear o arquivo**:
   ```bash
   # Na raiz do projeto
   mv railway.frontend.toml railway.toml
   ```

2. **Commit e push**:
   ```bash
   git add railway.toml
   git commit -m "feat: adicionar configuração Railway para frontend"
   git push
   ```

3. **No Railway**:
   - O Railway vai detectar automaticamente o `railway.toml`
   - Ele vai usar `frontend/` como diretório base
   - O build vai funcionar automaticamente

---

## 🔍 Ou: Onde Encontrar Root Directory na Interface

### Na aba Settings:

1. Clique no serviço frontend
2. **Settings** (aba lateral)
3. Role até encontrar uma dessas seções:
   - **"Source"**
   - **"Build Configuration"**
   - **"Service Settings"**
4. Procure por:
   - **"Root Directory"** ou
   - **"Working Directory"** ou
   - **"Source Directory"**

### Aparência:
```
┌─────────────────────────────────┐
│ Root Directory                   │
│ ┌─────────────────────────────┐ │
│ │ frontend                     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🚀 Método Mais Simples (Recomendado)

**Use o arquivo `railway.toml` que criei!**

Isso garante que funcione independente da versão da interface do Railway.

### Execute:
```bash
cd "c:\Users\Murilo\Desktop\Report Terra"
git add railway.frontend.toml
git commit -m "feat: configuração Railway para frontend"
git push
```

Depois, o Railway vai detectar e usar automaticamente! ✅
