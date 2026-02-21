# Falha no npm install durante build Docker (conflito Tremor/React 19)

**Categoria:** `deploy`
**Data de resolução:** 2026-02-10
**Arquivo(s) afetado(s):** `Dockerfile`

---

## 🔴 Sintoma

O build Docker falha durante a etapa de `npm install` com uma mensagem de conflito de dependências:

```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error
npm error While resolving: frontend@0.1.0
npm error Found: react@19.x.x
npm error node_modules/react
npm error   react@"^19" from the root project
npm error
npm error Could not resolve dependency:
npm error   peer react@"^18" from @tremor/react@3.x.x
```

---

## 🔍 Causa Raiz

A biblioteca **Tremor** (`@tremor/react`) declara compatibilidade apenas com **React 18** como peer dependency. O projeto usa **React 19**, que foi lançado após o Tremor ter fixado sua declaração de peer deps. O `npm` por padrão trata isso como erro fatal no install.

---

## ✅ Solução

Adicionar a flag `--legacy-peer-deps` ao comando `npm install` no `Dockerfile`. Esta flag instrui o npm a ignorar conflitos de peer dependencies e usar o comportamento do npm v6, resolvendo as dependências de forma mais permissiva.

```dockerfile
# Antes (falha)
RUN npm install

# Depois (funciona)
RUN npm install --legacy-peer-deps
```

O mesmo vale para o `setup.bat`:
```bat
npm install --legacy-peer-deps
```

> ⚠️ **Nota:** Esta flag é um contorno, não uma correção definitiva. Monitore atualizações do Tremor para quando lançarem suporte oficial ao React 19.

---

## 🧪 Como verificar

```bash
docker build -t report-terra . 2>&1 | tail -20
```

O build deve concluir sem erros de `ERESOLVE`.

---

## 🔗 Referências

- [npm docs — legacy-peer-deps](https://docs.npmjs.com/cli/v8/commands/npm-install#legacy-peer-deps)
- [Tremor GitHub Issue — React 19 support](https://github.com/tremorlabs/tremor/issues)
