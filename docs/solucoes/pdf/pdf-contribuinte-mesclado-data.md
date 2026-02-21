# Contribuinte mesclado com data no PDF (ex: "PAS13/02/2026")

**Categoria:** `pdf`
**Data de resolução:** 2026-02-20
**Arquivo(s) afetado(s):** `backend/process_pdf.py`

---

## 🔴 Sintoma

Após fazer upload de um PDF, o campo **Contribuinte** na tabela de processos aparece com o nome cortado e com parte da data embutida. Por exemplo:

| ID | Contribuinte (errado) | Contribuinte (correto) |
|---|---|---|
| 001156 - 2026 | `102375128 - ANTONIO JOSE SILVA PAS13/02/2026` | `102375128 - ANTONIO JOSE SILVA PAS` |
| 001079 - 2026 | `100863154 - F M C REPRESENTACOES11/02/2026` | `100863154 - F M C REPRESENTACOES` |

---

## 🔍 Causa Raiz

O `pdfplumber` extrai palavras por bounding-box (caixa delimitadora). Quando a última palavra do nome do contribuinte está **muito próxima da coluna de datas** no PDF, os dois tokens são fundidos numa única "palavra" pelo parser, pois o espaço entre eles fica abaixo do threshold `x_tolerance=3`.

O resultado é um token único como `"PAS13/02/2026"` que o código então atribuía inteiramente à coluna de contribuinte.

---

## ✅ Solução

Adicionar um passo de limpeza em `process_pdf.py` que, para cada token da coluna contribuinte, verifica se há um padrão de data embutido (`DD/MM/YYYY`) e, se houver, mantém apenas o texto antes dela:

```python
# Em backend/process_pdf.py, após separar col_contrib por bounding-box
DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")
cleaned_contrib = []
for token in col_contrib:
    m = DATE_RE.search(token)
    if m:
        clean = token[:m.start()].strip()
        if clean:
            cleaned_contrib.append(clean)
    else:
        cleaned_contrib.append(token)

contribuinte = " ".join(cleaned_contrib).strip()
```

---

## 🧪 Como verificar

Execute o script de diagnóstico:

```bash
.venv\Scripts\python.exe debug_test_contrib.py
```

Verifique `debug_test_result.json`. Nenhum contribuinte deve conter padrão `DD/MM/YYYY`.

---

## 🔗 Referências

- `backend/process_pdf.py` — função `parse_pdf()`
- `debug_coords_result.json` — bounding-boxes reais do PDF analisado
