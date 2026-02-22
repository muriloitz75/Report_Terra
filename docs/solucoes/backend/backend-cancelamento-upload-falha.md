# 📝 Solução — Cancelamento de Upload Falho

> Problema: O botão "Cancelar" durante o upload e processamento do PDF parecia não surtir efeito ou exibia uma mensagem de erro genérica em vez de interromper limpamente o envio.

---

## Falha no Cancelamento de Processamento PDF

**Categoria:** `backend`, `frontend`, `pdf`
**Data de resolução:** 2026-02-22
**Arquivo(s) afetado(s):** 
- `backend/process_pdf.py`
- `backend/main.py`
- `frontend/app/processos/page.tsx`

---

## 🔴 Sintoma

Durante o upload de um arquivo PDF grande no ambiente de Produção, o usuário clica no botão "Cancelar", mas a barra continua carregando, ou um `alert()` nativo do navegador exibe:

```
Erro no processamento: Cancelado
```

Apesar da mensagem, os eventos de cancelamento não interrompem a extração em background e causam perda de dados se o processamento for finalizado.

---

## 🔍 Causa Raiz

Havia três falhas lógicas no fluxo de cancelamento entre o momento do clique no botão "Cancelar" no Frontend e o que efetivamente ocorria no Backend:

1. **Extração de PDF Bloqueante:** A função `parse_pdf` usava um loop fechado, página por página (`pdf.pages`), sem nenhuma verificação de estado. PDFs extensos ficavam travados nessa função por longos períodos sendo insensíveis à flag `should_cancel`.
2. **Exclusão Prematura de Dados:** A arquitetura previa limpar toda a base anterior do usuário do banco de dados (SQLite) **antes** de verificar se houve pedido de cancelamento, resultando em perda total dos registros na base de dados após clicar em "Cancelar".
3. **Frontend Confuso:** O `polling` que verificava o status de envio no Next.js interpretou a atribuição `status = "error"` e `error = "Cancelado"` como uma falha fatal, processando-a exatamente como se o servidor tivesse caído, mostrando o alert padrão para todo tipo de status `error`.

---

## ✅ Solução

Implementação de verificações explícitas de interrupção (Checkpoints) no Backend e tratamento amigável de status no Frontend.

### Passo 1: Interceptar Extração no PDF Plumber

No arquivo `backend/process_pdf.py`, o loop de leitura de páginas passou a receber um callback `cancel_check`.

```python
def parse_pdf(pdf_path, progress_callback=None, cancel_check=None):
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page_idx, page in enumerate(pdf.pages):
            # NOVO: Check for cancellation before processing each page
            if cancel_check and cancel_check():
                return processes
```

### Passo 2: Proteger os Dados no Banco

No arquivo `backend/main.py` a função de controle principal que limpa antigas records ganhou verificação com a flag e também passou a propriedade `cancel_check`.

```python
# Passando o callback no main.py (process_pdf_background)
def should_cancel():
    return user_state.get("should_cancel", False)

data = parse_pdf(tmp_path, progress_callback=extraction_progress, cancel_check=should_cancel)

# NOVO: Check cancel BEFORE deleting old records (prevents data loss)
if user_state.get("should_cancel"):
    logger.info(f"Upload cancelled by user {user_id} after extraction.")
    user_state["status"] = "error"
    user_state["message"] = "Upload cancelado pelo usuário."
    user_state["error"] = "Cancelado"
    return

# Antigo local de db.query(Process).filter(Process.user_id == user_id).delete()
```

### Passo 3: Silenciar o Erro no Frontend

No arquivo `frontend/app/processos/page.tsx` o _polling setInterval_ passou a checar explicitamente se o motivo do `error` era por conta do cancelamento.

```tsx
// Inside startPolling interval logic
} else if (status.status === 'error') {
    if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
    }

    // NOVO: Verifica de fato a razão do Erro Server-side
    const wasCancelled = status.error?.toLowerCase().includes('cancelado');

    if (wasCancelled) {
        // User-initiated cancel: reset cleanly
        setUploadMessage("Upload cancelado.");
        setUploadProgress(0);
        setTimeout(() => {
            setUploading(false);
            setUploadMessage("");
        }, 1500);
    } else {
        setUploading(false);
        setUploadMessage("");
        setUploadProgress(0);
        alert(`Erro no processamento: ${status.error}`);
    }
}
```

---

## 🧪 Como verificar

1. Em um ambiente com múltiplos registros (ex: 500 records em um Database Populado).
2. Tente fazer um upload de um PDF com milhares de páginas (para dar tempo humano de cancelamento na tela "Carregando" simulado em Production Build).
3. Aperte `Cancelar` durante a transição que mostra **(0% a 20%)**.
4. **Resolução visual:** O popup informará *Upload cancelado* em vez de soltar um `alert()` ruidoso.
5. **Resolução Server-Side:** Olhando o Dashboard após a saída do pop-up, todos os 500 registros antigos devem continuar intactos no Banco, comprovando que o cancelamento preveniu o `DELETE FROM` em massa prematuro.

---

## 🔗 Referências

- Correção Code Review e Debugging #4.
