# Contribuinte em branco ou fragmentado após extração do PDF

**Categoria:** `pdf`
**Data de resolução:** 2026-02-20
**Arquivo(s) afetado(s):** `backend/process_pdf.py`

---

## 🔴 Sintoma

Após fazer upload de um PDF, alguns processos aparecem na tabela com o **campo Contribuinte vazio** ou com apenas um **fragmento do sobrenome**:

| ID | Contribuinte (errado) | Contribuinte (correto) |
|---|---|---|
| 001088 - 2026 | `"BRA"` | `"101146941 - CELIANE SINGULANI BRA"` |
| 000849 - 2026 | `""` (vazio) | `"100835270 - MUVEE WOMAN LTDA"` |
| 000718 - 2026 | `"SERV"` | `"101059065 - AUTOGIRO PEÇAS E SERV"` |

---

## 🔍 Causa Raiz

O `pdfplumber` ocasionalmente renderiza palavras da **mesma linha lógica** em posições verticais (`top`) ligeiramente diferentes — por exemplo, o ID do processo em `top=139` e o CPF/nome do contribuinte em `top=140` (diferença de 1px).

O código original agrupava palavras usando `round(w["top"])`, o que colocava essas palavras em **grupos separados**. O grupo sem o ID era descartado (pois não começava com dígito), e o grupo do ID ficava sem o nome do contribuinte.

```python
# Código ANTIGO — problemático
row_key = round(w["top"])   # tops 139 e 140 viram grupos distintos
rows.setdefault(row_key, []).append(w)
```

---

## ✅ Solução

Substituir o agrupamento por `round()` por um **agrupamento tolerante** que une palavras cujos `top` estejam dentro de um threshold de **6px**:

```python
# Em backend/process_pdf.py — novo agrupamento
ROW_TOLERANCE = 6
row_groups = []  # lista de (top_representativo, [palavras])

for w in sorted(words, key=lambda w: w["top"]):
    placed = False
    for grp in row_groups:
        if abs(w["top"] - grp[0]) <= ROW_TOLERANCE:
            grp[1].append(w)
            placed = True
            break
    if not placed:
        row_groups.append((w["top"], [w]))

for _, row_words_unsorted in sorted(row_groups, key=lambda g: g[0]):
    row_words = sorted(row_words_unsorted, key=lambda w: w["x0"])
    # ... resto do processamento
```

> **Por que 6px?** A altura de cada linha no PDF é ~13px. Um threshold de 6px garante que palavras da mesma linha sejam unidas sem misturar linhas distintas.

---

## 🧪 Como verificar

Execute o script de diagnóstico:

```bash
.venv\Scripts\python.exe debug_test_contrib.py
```

Verifique `debug_test_result.json`. Nenhum contribuinte deve estar vazio ou conter apenas um fragmento de palavra.

---

## 🔗 Referências

- `backend/process_pdf.py` — função `parse_pdf()`
- `debug_coords_result.json` — bounding-boxes da página 1, registra `top=139` vs `top=140`
