---
id: PG-012
tipo: feature
prioridade: p1
area: ux
estado: pronto
responsavel:
github_issue:
---

# Inventário visual com sprites e atenção

## Problema

O Grid conhece o catálogo e as quantidades, mas o inventário atual não usa o
ícone do item nem prioriza estoques que exigem ação.

## Resultado esperado

Inventário reconhecível por sprite, com visão inicial de atenção e coleção
completa sob demanda.

## Critérios de aceite

- [ ] Catálogo e quantidade são unidos por `itemId`.
- [ ] Ícones relativos e absolutos são resolvidos de forma segura.
- [ ] Placeholder local aparece em erro de imagem.
- [ ] Filtros incluem Atenção, Batalha, Loot, Raros e Todos.
- [ ] Metas de bolas, cura e revive podem ser configuradas por conta.
- [ ] Quantidade e valor NPC não são confundidos com preço de mercado.
- [ ] Teclado e leitor de tela identificam nome, quantidade e alerta.

## Dependências

PG-010 e PG-007.

## Log

### 2026-07-26 — Leo

- Estado: ticket criado.
- Evidência: `/game/items.json` já fornece `icon`, `category` e `npcPrice`.
- Próxima ação: definir as metas padrão e o fallback de ícones.

