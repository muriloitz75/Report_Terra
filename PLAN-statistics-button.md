# Plano: Botão de Estatísticas na Tabela de Processos

## Visão Geral
**Funcionalidade:** Criar um botão "Estatística" na tabela do menu "processos".
**Comportamento:** 
- O botão estará desabilitado por padrão.
- Ele ficará habilitado APENAS quando um "tipo de solicitação" for selecionado no filtro já existente.
- Quando acionado, o botão abrirá uma janela popup (modal) com um gráfico de barras verticais.
- O gráfico deve mostrar a evolução daquele tipo de solicitação no período selecionado no filtro existente.

## Tipo do Projeto
**WEB** (Next.js, React, TailwindCSS, Tremor/Recharts para gráficos)

## Critérios de Sucesso
- [ ] O botão aparece na UI e fica desabilitado quando nenhum "tipo de solicitação" estiver selecionado.
- [ ] O botão fica ativo assim que um "tipo de solicitação" for escolhido no filtro.
- [ ] Clicar no botão abre uma janela modal.
- [ ] A janela modal exibe um gráfico de barras verticais.
- [ ] Os dados do gráfico refletem com precisão o "tipo de solicitação" e o "período" escolhidos nos filtros.
- [ ] O componente é responsivo e segue o padrão visual (Design System) da aplicação.

## Stack Tecnológico
- Frontend Framework: Next.js (App Router) / React
- UI Components: Radix UI (para criação de Modais/Dialogs)
- Gráficos: Recharts ou Tremor (já disponíveis no `package.json`)
- Estilização: Tailwind CSS
- Requisições: API calls chamando endpoints para sumarização de dados.

## Estrutura de Arquivos Panejada
- `frontend/app/processos/page.tsx` (ou o componente de tabela específico): Será modificado para incluir o botão "Estatística" e sua lógica de "Habilitado/Desabilitado" baseada no estado dos filtros.
- `frontend/app/processos/components/StatisticsModal.tsx` (Novo Arquivo): O componente que abrigará o popup e o gráfico em si.
- `backend/main.py`: Se necessário, adicionar um endpoint sumário para agrupar e retornar os dados do gráfico (exemplo: evolução por mês/semana).

## Divisão de Tarefas (Tasks)

### Tarefa 1: Análise no Backend e Criação de Endpoint API (se necessário)
- **Agente:** backend-specialist
- **Skill:** api-patterns
- **Descrição:** Analisar os endpoints atuais para verificar se é possível extrair as agregações direto para o gráfico. Caso negativo, criar um novo GET endpoint (ex: `/api/statistics/evolution`) que aceite os parâmetros `tipo_solicitacao` e `periodo`, retornando a evolução (ex: `[{date: '2023-10', count: 15}]`).
- **INPUT:** `backend/main.py` e schemas atuais.
- **OUTPUT:** Endpoint sumário funcionando e enviando resposta em formato de agregação temporal.
- **VERIFY:** Consumir endpoint direto do frontend ou curl log para conferir a resposta JSON.

### Tarefa 2: Criação do Modal de Interface e Gráfico (Frontend)
- **Agente:** frontend-specialist
- **Skill:** frontend-design, react-best-practices
- **Descrição:** Construir o componente `StatisticsModal.tsx` utilizando Radix UI Dialog e Tremor/Recharts BarChart. Este componente precisará de parâmetros de entrada (props) como `isOpen`, `onClose`, `tipo_solicitacao` e `periodo`.
- **INPUT:** Regras lógicas do modal, documentação do Tremor/Recharts.
- **OUTPUT:** Componente React encapsulando o Radix Dialog e o BarChart.
- **VERIFY:** Observar no navegador e confirmar se o gráfico plota dados simulados correntamente no popup.

### Tarefa 3: Integração do Botão na Tabela Responsiva
- **Agente:** frontend-specialist
- **Skill:** react-best-practices
- **Descrição:** Localizar as variáveis de estado de filtro dentro de `processos`. Adicionar o Botão ao lado de controle da tabela e vincular a propriedade `disabled` a `!selectedTipoSolicitacao`. Acionar a abertura do `StatisticsModal` no `onClick`.
- **INPUT:** `frontend/app/processos/page.tsx`, `StatisticsModal.tsx`.
- **OUTPUT:** Botão adicionado e linkado perfeitamente com a lógica de abrir o Popup repassando props.
- **VERIFY:** Em tela, simular o clique com filtro em branco (nada ocorre). Ao filtrar, botão ficará ativo e abre o popup ao ser manipulado.

### Tarefa 4: Teste End-to-End
- **Agente:** test-engineer
- **Skill:** webapp-testing
- **Descrição:** Testar todo o ciclo unificadamente do início do filtro até o endpoint trazer dados fidedignos e exibir as barras do gráfico na UI.
- **INPUT:** O App executando dev server.
- **OUTPUT:** Confirmação manual/visual ou de interface, sem erros no console (100% liso).
- **VERIFY:** Cumprimento real da Spec / Success criteria em um checklist final.

## Fase X: Verificação e Auditorias Finais
- [ ] Lint: `npm run lint` deverá passar 100%.
- [ ] Build: `npm run build` deve consolidar a build sem erros.
- [ ] Teste Manual: Todas as lógicas do modal funcionais e a responsividade em OK (`ux_audit.py`).
