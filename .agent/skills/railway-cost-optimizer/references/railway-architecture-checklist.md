# Railway Architecture Checklist

## Checklist de economia e arquitetura enxuta

### Serviços ativos
- [ ] Existe mais de um serviço web sem necessidade clara?
- [ ] Há worker separado com justificativa concreta?
- [ ] Algum serviço poderia ser consolidado sem perda relevante?
- [ ] Existe serviço ativo ocioso grande parte do tempo?

### Escalabilidade
- [ ] Há réplicas ativas sem evidência real de saturação?
- [ ] O aumento de recurso foi decidido com base em sinais concretos?
- [ ] O gargalo pode ser de configuração ou código, e não de infraestrutura?
- [ ] A escala atual é proporcional ao tráfego real?

### Persistência
- [ ] O app depende de filesystem local sem necessidade forte?
- [ ] O uso de volume é realmente inevitável?
- [ ] Object storage seria opção melhor?
- [ ] A persistência local dificulta tornar o app stateless?

### Banco de dados
- [ ] Há banco duplicado entre ambientes?
- [ ] O banco está dimensionado acima da demanda?
- [ ] O custo do banco está coerente com o estágio do projeto?
- [ ] Existem ambientes com banco ligado sem uso relevante?

### Ambientes e branches
- [ ] Existem preview environments ou branches permanentes gerando custo recorrente?
- [ ] Todos os ambientes ativos têm justificativa operacional real?
- [ ] O fluxo de validação poderia ser simplificado?
- [ ] Há duplicação de infraestrutura só por conveniência?

### Operação
- [ ] O deploy automático está criando ambientes demais?
- [ ] O tempo de boot do serviço está aceitável?
- [ ] Há complexidade operacional desnecessária?
- [ ] O ambiente foi desenhado para simplicidade antes de robustez avançada?

## Interpretação final
Se houver muitos itens marcados como problema, a recomendação padrão é:
1. reduzir serviços;
2. consolidar arquitetura;
3. eliminar ambientes ociosos;
4. revisar volume e banco;
5. só depois considerar escalar.
