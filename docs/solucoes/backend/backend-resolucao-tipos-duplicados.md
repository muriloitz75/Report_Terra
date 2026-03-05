# ⚙️ Resolução de Tipos de Solicitação Duplicados (Variação de Hifens)

## 🐛 O Problema
Na interface (Tabela de Processos e Modal de Estatísticas), os filtros de **Tipo de Solicitação** começaram a exibir o mesmo tipo multiplicadas vezes (Ex: `CRÉDITO TRIBUTÁRIO - GERAÇÃO` aparecendo duas vezes separadas no Select). Além disso, os tipos `CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS` e `CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)` estavam sendo tratados e totalizados como itens separados pelos usuários.

Isso causava poluição visual e fragmentação nas estatísticas consolidadas mensais.

## 🕵️‍♂️ Causa Raiz
1. **Diferenças Visuais de Charcode:** Ao ler diferentes PDFs através do `pdfplumber`, o OCR reconhecia caracteres visualmente idênticos, mas tipograficamente diferentes no código unicode. O sistema extraia meia-risca (`–` `\u2013`), travessão (`—` `\u2014`) e o hífen padrão (`-`). O SQLite tratava essas strings como entidades completamente diferentes e agrupava em linhas únicas, quebrando os filtros do UI.
2. **Regra de Negócio Não Delineada:** O cancelamento de notas possui o nome de cadastro `CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)`, porém no sistema primário do município os processos entravam sob `CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS`, quebrando o sumário.

## ✅ A Solução

**1. Normalização Imediata (`backend/tipo_resolver.py`)**
A função `_normalize` e o fluxo final de `resolve_tipo` foram atualizados para ativamente substituir qualquer variação tipográfica de traços pelo hífen padrão do teclado ASCII:
```python
# Fase 3 do tipo_resolver.py
if resolved:
    resolved = resolved.replace('\u2013', '-').replace('\u2014', '-')
```
Também foi incluída uma checagem "Dura" para converter forçadamente `CANCELAMENTO DE NOTAS FISCAIS DE SERVIÇOS` para `CANCELAMENTO DE NFS-E (EXTEMPORÂNEO)` antes do salvamento da tabela.

**2. Migração de Limpeza do Banco Existente (`backend/migrate_types.py`)**
Como os dados já haviam sido salvos sujos, um script `migrate_types.py` foi criado na raiz do backend executando queries `UPDATE` para varrer todas as linhas buscando as variações de tracinho corrompidas e aplicando o hífen limpo. O banco foi sanitizado revertendo a fragmentação para uma opção coesa única na interface de Filtro Múltiplo.

## ⚠️ Prevenção
- Sempre que a prefeitura adicionar um "novo nome" ou novo PDF corrompido que utilize aspas inteligentes ou travessões matemáticos nativos do Word no cadastro, os parsers (`process_pdf` e `tipo_resolver`) precisam ter tratativas de normalização via `.replace()`.
