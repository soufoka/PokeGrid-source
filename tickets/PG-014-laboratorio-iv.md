---
id: PG-014
tipo: feature
prioridade: p1
area: calculator
estado: pronto
responsavel:
github_issue:
---

# Laboratório de comparação e projeção de IV

## Problema

O leitor atual estima IV e poder, mas não oferece um fluxo direto para comparar
integrantes do time e projetá-los até o nível 500.

## Resultado esperado

Laboratório integrado ao time, com comparação de duas instâncias e projeção
reprodutível de stats/poder.

## Critérios de aceite

- [ ] Nível pode variar de 1 a 500.
- [ ] Projeção mantém espécie, IV e qualidade por padrão.
- [ ] Atual e projetado mostram seis stats, poder e diferença.
- [ ] Comparação suporta mesma espécie e espécies diferentes.
- [ ] Cenário de qualidade alterada é explícito e reversível.
- [ ] Fórmula é isolada, versionada e coberta por testes de referência.
- [ ] Arredondamento ocorre em cada stat antes da soma do poder.
- [ ] A interface explica que projeção não é previsão exata de dano.

## Dependências

PG-010 e PG-013.

## Log

### 2026-07-26 — Leo

- Estado: ticket criado.
- Evidência: fórmula oficial documentada em `/pokepedia/systems/power`.
- Próxima ação: extrair a fórmula já usada por `JustPokedex` e criar fixtures.

