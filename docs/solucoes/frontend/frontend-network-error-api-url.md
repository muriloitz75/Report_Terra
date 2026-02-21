# Network Error ao buscar dados da API

**Categoria:** `frontend`
**Data de resolução:** 2026-02-17
**Arquivo(s) afetado(s):** `frontend/.env.local`, `frontend/lib/api.ts`

---

## 🔴 Sintoma

O dashboard carrega mas não exibe dados. O console do browser mostra:

```
Network Error
AxiosError: Network Error
    at XMLHttpRequest.onError (axios/lib/adapters/xhr.js)
```

As requisições para a API falham sem nenhuma resposta do servidor.

---

## 🔍 Causa Raiz

A variável `NEXT_PUBLIC_API_URL` não estava definida no arquivo `frontend/.env.local`, ou estava apontando para um endereço incorreto. O `Axios` tentava fazer requests para `undefined` ou para uma URL de produção (Railway) quando o backend estava rodando localmente.

Este arquivo **não é comitado** no repositório (está no `.gitignore`), portanto ao clonar o projeto em um novo PC o arquivo não existe.

---

## ✅ Solução

Crie ou edite o arquivo `frontend/.env.local` na raiz da pasta `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> ⚠️ **Atenção:** Reinicie o servidor do Next.js após qualquer alteração no `.env.local`.

O `setup.bat` já cria este arquivo automaticamente na primeira execução.

---

## 🧪 Como verificar

1. Acesse `http://localhost:8000/docs` — o Swagger da API deve abrir.
2. Acesse `http://localhost:3000/dashboard` — os KPIs e gráficos devem carregar normalmente.

---

## 🔗 Referências

- `frontend/lib/api.ts` — configuração do cliente Axios
