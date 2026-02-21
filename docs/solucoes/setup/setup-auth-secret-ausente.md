# ClientFetchError — Erro de configuração do servidor (NextAuth)

**Categoria:** `setup`
**Data de resolução:** 2026-02-20
**Arquivo(s) afetado(s):** `frontend/.env.local`

---

## 🔴 Sintoma

Ao tentar acessar a aplicação no browser, a página de login exibe o erro:

```
ClientFetchError
There was a problem with the server configuration.
Check the server logs for more information.
Read more at https://errors.authjs.dev#autherror
```

O console do Next.js também pode mostrar:
```
[auth][error] MissingSecret: Please define a `secret` ...
```

---

## 🔍 Causa Raiz

O **NextAuth v5 (Auth.js)** exige obrigatoriamente a variável de ambiente `AUTH_SECRET` para assinar e verificar os tokens JWT de sessão. Sem ela, qualquer operação de autenticação falha com `ClientFetchError`.

Esta variável **não é criada automaticamente** e **não é comitada no repositório** (pois `.env.local` está no `.gitignore`). Portanto, ao clonar o projeto em um novo PC, o arquivo `.env.local` não existe, e o `AUTH_SECRET` também não.

---

## ✅ Solução

### Opção 1 — Automática (recomendada)

Execute o `setup.bat` — ele já cria o `frontend/.env.local` com o `AUTH_SECRET` incluído automaticamente.

### Opção 2 — Manual

Crie ou edite o arquivo `frontend/.env.local` e adicione:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
AUTH_SECRET=report-terra-secret-local-dev-2024
```

> ⚠️ **Em produção**, use um valor aleatório forte. Gere com:
> ```bash
> openssl rand -base64 32
> ```
> Ou acesse: https://generate-secret.vercel.app/32

### Passo final

**Reinicie o servidor do Next.js** após modificar o `.env.local`. O Next.js só carrega variáveis de ambiente no startup — alterações em tempo de execução não têm efeito.

---

## 🧪 Como verificar

Acesse `http://localhost:3000/login`. A página deve carregar normalmente sem exibir o `ClientFetchError`.

---

## 🔗 Referências

- [Auth.js — Documentação de configuração](https://authjs.dev/getting-started/installation#setup-environment)
- [Error: MissingSecret](https://errors.authjs.dev#missingsecret)
