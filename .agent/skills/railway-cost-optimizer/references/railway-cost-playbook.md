# Railway Cost Playbook

## Objetivo
Este playbook orienta revisões rápidas e profundas de custo na Railway com foco em simplificação, redução de desperdício e previsibilidade financeira.

## Processo de auditoria

### 1. Mapear a topologia atual
Levantar:
- quantidade de serviços web;
- workers separados;
- bancos ativos;
- volumes persistentes;
- ambientes por branch;
- cron jobs e tarefas assíncronas.

### 2. Classificar cada componente
Para cada item, responder:
- é essencial hoje?
- poderia ser consolidado?
- está ocioso parte do tempo?
- existe alternativa mais barata?
- gera complexidade maior que o benefício?

### 3. Identificar custo estrutural
Apontar se o gasto vem principalmente de:
- excesso de serviços;
- separação prematura em web + worker;
- banco duplicado entre ambientes;
- uso indevido de volume;
- memória/CPU acima da necessidade;
- preview environments permanentes.

### 4. Aplicar simplificação progressiva
Priorizar nesta ordem:
1. desligar o que não é essencial;
2. consolidar serviços duplicados;
3. remover componentes de conveniência;
4. tornar o app mais stateless;
5. só depois discutir escala.

## Heurísticas de economia

### Serviço web único
É a opção preferencial quando:
- o tráfego é baixo ou moderado;
- não há processamento pesado contínuo;
- jobs assíncronos não são críticos;
- simplicidade operacional pesa mais que isolamento.

### Worker separado
Só se justifica quando:
- tarefas longas prejudicam o HTTP;
- há filas reais e recorrentes;
- o isolamento evita timeouts ou instabilidade;
- manter tudo junto ficaria mais caro em ineficiência.

### Banco de dados
Questionar sempre:
- há mais de um banco ativo sem necessidade?
- ambientes paralelos estão duplicando custo?
- a carga atual realmente precisa do setup existente?

### Volumes
Usar com critério. Perguntar:
- o dado precisa mesmo estar no filesystem local?
- object storage resolveria melhor?
- o volume está mascarando um acoplamento ruim?

## Sinais clássicos de desperdício
- worker criado “por boa prática”, mas sem necessidade real;
- branches com deploy ativo o tempo todo;
- volume para uploads simples que poderiam estar fora do container;
- web service superdimensionado para tráfego baixo;
- ambiente de homologação idêntico à produção sem justificativa;
- tentativa de resolver código ruim com mais recurso.

## Recomendação padrão
Sempre responder com:
1. diagnóstico do custo atual;
2. maior risco financeiro;
3. arquitetura mais barata viável;
4. opção intermediária;
5. gatilho real para gastar mais.

## Resultado esperado
Ao final da revisão, o usuário deve saber:
- o que manter;
- o que cortar;
- o que consolidar;
- o que adiar;
- o que só deve ser pago quando houver demanda real.
