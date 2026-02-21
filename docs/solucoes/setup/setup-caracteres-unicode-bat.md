# setup.bat falha com "... foi inesperado neste momento"

**Categoria:** `setup`
**Data de resolução:** 2026-02-20
**Arquivo(s) afetado(s):** `setup.bat`

---

## 🔴 Sintoma

Ao executar o `setup.bat` pelo duplo clique ou pelo terminal, o script para na etapa `[3/5]` com a mensagem:

```
cmd : ... foi inesperado neste momento.
```

O processo é encerrado imediatamente sem concluir o setup.

---

## 🔍 Causa Raiz

O arquivo `setup.bat` continha caracteres **unicode** nos comentários — especificamente o traço longo `──` (U+2500, Box Drawing Light Horizontal) usado em blocos como:

```bat
:: ── 3. Ambiente Virtual Python (.venv) ──────────────────
```

O `cmd.exe` (interpretador padrão do Windows para arquivos `.bat`) **não consegue processar caracteres fora do ASCII** quando o arquivo está salvo em UTF-8 sem BOM, mesmo que `chcp 65001` esteja ativo. O comando `chcp 65001` só altera a página de código do console (output), não a interpretação do arquivo em si pelo parser do `cmd.exe`.

---

## ✅ Solução

Substituir **todos os comentários** do `.bat` por versões que usam apenas caracteres ASCII puro (`-`, `=`, letras e números).

**Antes (causa o erro):**
```bat
:: ── 3. Ambiente Virtual Python (.venv) ──────────────────
```

**Depois (funciona corretamente):**
```bat
:: --- 3. Ambiente Virtual Python (.venv) ---
```

### Regra geral para arquivos .bat

> ❌ **Nunca use** caracteres unicode em comentários ou textos de `.bat`:
> traços longos (`─`, `━`, `–`, `—`), setas (`→`, `←`), emojis, caracteres acentuados em comentários `::`.
>
> ✅ **Use apenas** ASCII: `- = / \ | # * ~`

---

## 🧪 Como verificar

Execute no terminal:
```powershell
cmd /c setup.bat 2>&1
```
O script deve passar por todas as 5 etapas sem erros e exibir `SETUP CONCLUIDO COM SUCESSO!`

---

## 🔗 Referências

- [Documentação cmd.exe — limitações de encoding](https://ss64.com/nt/chcp.html)
