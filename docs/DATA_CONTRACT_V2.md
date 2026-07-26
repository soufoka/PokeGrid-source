# Contrato de dados V2

Ticket: PG-010  
Versão do contrato: 1  
Data: 2026-07-26

## Objetivo

Separar dados remotos não confiáveis do restante da interface. As telas recebem
somente modelos normalizados, com tipos, limites e origem explícitos.

Este documento é o handoff de implementação. Ele não altera o formato emitido
pelo jogo.

## Regras gerais

- Todo payload remoto é `unknown` até passar pelo adaptador.
- `0`, `false` e string vazia válida não podem ser confundidos com ausência.
- Campos ausentes não apagam o valor anterior durante `poke-delta`.
- Número não finito, negativo onde não cabe ou string excessiva é descartado.
- Nome é apresentação e índice secundário; ID é identidade.
- Nenhum texto remoto entra em `innerHTML` sem escape.
- Falha de uma linha não invalida o catálogo inteiro.
- Cada resultado declara `schemaVersion`, `source` e `loadedAt`.

Limites sugeridos:

| Campo | Limite |
|---|---:|
| Nome de Pokémon/item/golpe | 80 caracteres |
| Descrição | 500 caracteres |
| Tipos | 2 por espécie |
| Ataques | 24 por espécie |
| Drops | 64 por espécie |
| Integrantes do time exibidos | 6 |
| IV individual | 0–32 |
| IV total | 0–192 |
| Nível projetado | 1–500 |

## Envelope de catálogo

```text
CatalogResult<T>
  schemaVersion: 1
  source: "idleworld-creatures" | "idleworld-items"
  loadedAt: timestamp em milissegundos
  status: "ready" | "partial" | "unavailable"
  records: T[]
  rejected: number
  warnings: string[]
```

`partial` significa que ao menos uma entrada foi rejeitada, mas ainda existem
registros válidos. `unavailable` preserva o último snapshot válido em memória,
se houver.

## Espécie normalizada

```text
Species
  id: number
  name: string
  normalizedName: string
  looktype: number | null
  description: string
  types: string[]
  rarity: string
  baseStats:
    hp, atk, def, spa, spd, speed: number
  huntLevel: number | null
  evolvesToId: number | null
  evolveLevel: number | null
  npcPrice: number
  sellValue: number
  experience: number
  attacks: Attack[]
  loot: LootEntry[]
```

```text
Attack
  name: string
  type: string
  category: "PHYSICAL" | "SPECIAL" | "STATUS" | "UNKNOWN"
  power: number | null
  cooldownMs: number | null
  learnLevel: number | null
```

```text
LootEntry
  name: string
  chance: number | null
  minCount: number
  maxCount: number
```

### Mapeamento de `creatures.json`

| Remoto | Normalizado |
|---|---|
| `pokeId` | `id` |
| `name` | `name` |
| `baseHp` | `baseStats.hp` |
| `baseAtk` | `baseStats.atk` |
| `baseDef` | `baseStats.def` |
| `baseSpAtk` | `baseStats.spa` |
| `baseSpDef` | `baseStats.spd` |
| `baseSpeed` | `baseStats.speed` |
| `attacks[].learnLevel` | `attacks[].learnLevel` |
| `loot[].chance` | `loot[].chance` |
| `priceNpc` | `npcPrice` |

`sellValue` permanece separado de `npcPrice`, mesmo quando hoje são iguais.

### Índices

- primário: `Map<number, Species>` por `id`;
- secundário: `Map<string, number[]>` por `normalizedName`;
- nunca armazenar somente uma espécie por nome.

O catálogo atual contém IDs únicos, mas nomes não necessariamente únicos:
`Blastoise` aparece com os IDs `9` e `10001`. Portanto:

1. resolver primeiro por `speciesId/pokeId`;
2. usar nome somente quando houver um único candidato;
3. em nome ambíguo, não calcular IV com base escolhida por adivinhação;
4. fuzzy match por `includes` é proibido para cálculos.

`Ditto` não possui ataques no catálogo atual. Lista vazia é estado válido, não
falha do adaptador.

## Item normalizado

```text
CatalogItem
  id: number
  name: string
  category: string
  rare: boolean
  npcPrice: number
  iconUrl: string | null
  iconStatus: "ready" | "missing" | "rejected"
```

### Política de ícones

Formatos observados no catálogo:

- URL HTTPS em `pokexguides.com`;
- caminho absoluto relativo à origem, como `/assets/stones/ancient_stone.gif`;
- string vazia.

Normalização:

1. caminho iniciado por `/` é resolvido contra
   `https://poke.idleworld.online`;
2. URL deve usar HTTPS;
3. hosts permitidos para item: `poke.idleworld.online` e `pokexguides.com`;
4. URL vazia vira `null` com `iconStatus: "missing"`;
5. esquema ou host não permitido vira `null` com `iconStatus: "rejected"`;
6. erro no carregamento visual usa placeholder empacotado no PokeGrid.

O `src` final ainda passa por escape e lista branca no renderer.

## Entrada de inventário

```text
InventoryEntry
  itemId: number
  quantity: number
```

```text
InventoryViewItem
  itemId: number
  name: string
  quantity: number
  category: string
  rare: boolean
  npcUnitValue: number
  npcTotalValue: number
  iconUrl: string | null
  catalogStatus: "matched" | "missing"
```

Junção por `itemId`. Quantidade negativa é rejeitada. Item sem catálogo continua
visível como `Item #ID`, sem preço e com placeholder.

## Instância do time

```text
TeamPokemon
  instanceId: string
  speciesId: number | null
  name: string
  normalizedName: string
  slot: number | null
  team: boolean
  leader: boolean
  shiny: boolean
  level: number | null
  hp:
    current: number | null
    max: number | null
  quality:
    multiplier: number | null
    label: string
  iv:
    total: number | null
    max: 192
    source: "server" | "estimated" | "unknown"
    individual:
      hp, atk, def, spa, spd, speed: number | null
  observedStats:
    hp, atk, def, spa, spd, speed: number | null
  power:
    server: number | null
    estimated: number | null
  types: string[]
  catalogStatus: "matched-id" | "matched-name" | "ambiguous" | "missing"
  incomplete: boolean
  updatedAt: timestamp em milissegundos
```

### Campos remotos já observados

O coletor atual usa diretamente:

`id`, `speciesId/pokeId`, `name`, `team`, `slot`, `leader`, `level`, `hp`,
`quality`, `ivTotal`, `shiny`, `type1`, `type2`, `sellValue`.

Campos que o jogo não enviar permanecem `null`; o adaptador não inventa
`maxHp`, stats individuais ou poder.

`instanceId` é `String(id)`. Sem `id`, a entrada é rejeitada para merge porque
nome + nível não identifica uma captura.

## Merge de `poke-delta`

Algoritmo contratual:

1. validar que existe `poke` objeto e `poke.id`;
2. buscar a instância por `String(poke.id)`;
3. se já existe, copiar somente propriedades remotas presentes e válidas;
4. preservar todo campo ausente;
5. aceitar explicitamente `hp: 0`, `team: false` e `leader: false`;
6. recalcular os campos derivados depois do merge;
7. se `speciesId/pokeId` mudou, invalidar o enriquecimento anterior;
8. se a instância não existe, criar entrada `incomplete: true` e aguardar
   snapshot `pokes`;
9. atualizar `updatedAt` somente após merge válido.

Um snapshot completo `pokes`:

- substitui a coleção bruta;
- normaliza cada entrada de forma independente;
- remove instâncias ausentes do snapshot;
- ordena o time por `slot`, deixando `null` ao final.

## Enriquecimento e precedência

| Campo | 1ª fonte | 2ª fonte | Regra |
|---|---|---|---|
| Instância, nível, HP, qualidade, IV total | WebSocket | tooltip JustPokedex | servidor vence |
| Base stats | `creatures.json` por ID | PokeAPI | PokeAPI apenas se espécie não existir no jogo |
| Tipos | WebSocket | espécie | servidor vence quando presente |
| Ataques | `creatures.json.attacks` | nenhum | nunca usar moves da PokeAPI |
| Sprite | PokeAPI por ID | placeholder local | não bloqueia o restante |
| Ícone de item | `items.json.icon` | placeholder local | host validado |
| Poder observado | servidor/tooltip | cálculo local | apresentar ambos, sem substituir |

Base stats da PokeAPI são fallback técnico, não fonte de regra do Idle World.

## Sprite de Pokémon

```text
PokemonSprite
  speciesId: number
  frontStill: string | null
  backStill: string | null
  frontAnimated: string | null
  backAnimated: string | null
  source: "pokeapi" | "placeholder"
```

- consultar a PokeAPI por ID, nunca por nome quando o ID existe;
- aceitar somente HTTPS em
  `raw.githubusercontent.com/PokeAPI/sprites/`;
- cachear a Promise por espécie durante a sessão;
- animação somente no palco em foco;
- falha de sprite não altera `catalogStatus` da espécie.

## IV e projeção

Os adaptadores não calculam regra de negócio. Eles fornecem dados para um módulo
de cálculo único.

```text
stat = round((base + 2 × growth) × level/100 × quality^exp)
power = round(sum(stats arredondados) × quality)
```

Expoentes:

```text
hp 0.95 · atk 0.80 · def 0.80 · spa 0.80 · spd 0.80 · speed 0.95
```

Quando o IV total vem do jogo, `iv.source = "server"`. Os IVs individuais podem
continuar estimados; a interface deve mostrar as duas origens separadamente.

## Cache e recuperação

- catálogo de espécies: uma Promise por webview/sessão;
- catálogo de itens: uma Promise por webview/sessão;
- sprite: uma Promise por `speciesId`;
- requisição concorrente reaproveita a Promise em andamento;
- erro não é cacheado para sempre: permitir nova tentativa manual ou na próxima
  sessão;
- durante indisponibilidade, manter o último snapshot válido em memória;
- não persistir payload bruto de conta, token ou mensagem WebSocket.

## Vetores de teste obrigatórios

### Espécies

| Caso | Entrada | Resultado |
|---|---|---|
| Gyarados | `pokeId: 130` | seis base stats, 9 ataques e 11 drops |
| Nome duplicado | `Blastoise` sem ID | `ambiguous`, sem base para IV |
| Nome duplicado com ID | `pokeId: 9` | espécie exata |
| Sem ataques | `pokeId: 132` | `attacks: []`, registro válido |
| Ataque inválido | poder não numérico | ataque preservado com `power: null` |

### Itens

| Caso | Entrada | Resultado |
|---|---|---|
| Externo permitido | URL em `pokexguides.com` | `ready` |
| Relativo | `/assets/stones/ancient_stone.gif` | URL absoluta Idle World |
| Vazio | `""` | `missing`, sem exceção |
| Host estranho | HTTPS fora da allowlist | `rejected` |
| Sem catálogo | quantidade para ID desconhecido | placeholder, quantidade preservada |

### Delta

Estado inicial:

```text
id=abc · hp=120 · level=50 · team=true · leader=true
```

| Delta | Resultado |
|---|---|
| `{id:"abc", hp:0}` | HP vira 0; demais campos permanecem |
| `{id:"abc", team:false}` | sai do time; nível e HP permanecem |
| `{id:"abc", level:"inválido"}` | nível 50 preservado |
| `{id:"novo", hp:30}` | nova instância incompleta |
| sem `id` | delta rejeitado |

### Fórmula de referência

Gyarados:

- base: `95, 125, 79, 60, 100, 81`;
- growth: `31, 30, 28, 27, 30, 31`;
- qualidade: `1,53`.

| Nível | Stats esperados | Poder esperado |
|---:|---|---:|
| 138 | `325, 359, 262, 221, 310, 296` | 2.713 |
| 500 | `1176, 1300, 949, 801, 1124, 1071` | 9.824 |

## Ordem de implementação

1. tipos/validadores primitivos;
2. adaptador de espécies e índices;
3. adaptador de itens e política de URL;
4. normalizador de snapshot `pokes`;
5. merge de `poke-delta`;
6. seletores de time e inventário;
7. módulo único de fórmula;
8. adaptador de sprite;
9. somente então conectar as telas.

Arquivos de produção sugeridos para o agente implementador:

```text
src/data/primitives.js
src/data/species.js
src/data/items.js
src/data/team.js
src/data/sprites.js
src/domain/power.js
test/fixtures/
test/data/
```

Se o projeto ainda não tiver a base modular do PG-002/PG-003, criar primeiro o
menor runner de testes possível. Não colocar os adaptadores novamente dentro do
template string de `index.html`.

