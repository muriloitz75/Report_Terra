# 📚 Manual de Soluções — Report Terra

> Este diretório é a **base de conhecimento de erros resolvidos** do projeto Report Terra.
> Toda vez que um bug for identificado e corrigido, ele deve ser documentado aqui para evitar retrabalho.

---

## 🗂️ Como usar este manual

- Ao encontrar um erro, **consulte este índice primeiro** antes de debugar do zero.
- Ao resolver um erro novo, **crie um arquivo `.md`** nesta pasta seguindo o [template](TEMPLATE.md).
- Os arquivos são organizados por categoria.

---

## 📁 Índice de Soluções

### 🔧 Setup & Ambiente

| Arquivo | Erro | Status |
|---|---|---|
| [setup-caracteres-unicode-bat.md](setup/setup-caracteres-unicode-bat.md) | `... foi inesperado neste momento` no `setup.bat` | ✅ Resolvido |
| [setup-auth-secret-ausente.md](setup/setup-auth-secret-ausente.md) | `ClientFetchError` / erro de configuração do servidor NextAuth | ✅ Resolvido |

### 📄 Parser de PDF

| Arquivo | Erro | Status |
|---|---|---|
| [pdf-contribuinte-mesclado-data.md](pdf/pdf-contribuinte-mesclado-data.md) | Contribuinte mesclado com data (ex: `"PAS13/02/2026"`) | ✅ Resolvido |
| [pdf-contribuinte-vazio-linha-fragmentada.md](pdf/pdf-contribuinte-vazio-linha-fragmentada.md) | Contribuinte em branco ou com fragmento (`"BRA"`, `""`) | ✅ Resolvido |

### 🌐 Frontend / Next.js

| Arquivo | Erro | Status |
|---|---|---|
| [frontend-network-error-api-url.md](frontend/frontend-network-error-api-url.md) | `Network Error` ao buscar dados da API | ✅ Resolvido |

### 🐳 Deploy / Docker

| Arquivo | Erro | Status |
|---|---|---|
| [deploy-docker-legacy-peer-deps.md](deploy/deploy-docker-legacy-peer-deps.md) | Falha no `npm install` durante build Docker (conflito Tremor/React 19) | ✅ Resolvido |

---

## ➕ Adicionando uma nova solução

1. Identifique a categoria (`setup/`, `pdf/`, `frontend/`, `deploy/`)
2. Copie o [TEMPLATE.md](TEMPLATE.md)
3. Preencha todos os campos
4. Adicione uma linha na tabela acima
5. Faça commit com a mensagem: `docs: adicionar solução para [nome-do-erro]`

---

*Última atualização: 2026-02-20*
