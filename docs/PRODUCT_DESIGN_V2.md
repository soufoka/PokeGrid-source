# PokeGrid Experience V2

Data: 2026-07-26  
Estado: direção de produto aprovada para prototipação local

## Resultado pretendido

Transformar o PokeGrid de um painel que exibe muitos dados em um centro de
comando que responde, nesta ordem:

1. o que está acontecendo agora;
2. existe algo que exige atenção;
3. como as contas estão performando;
4. qual Pokémon ou item merece uma decisão.

A interface mantém a força operacional do Grid e recupera do Poke Launcher o
palco de batalha, a leitura visual por sprites e a sensação de produto vivo.

## Princípios de experiência

- **Resumo antes de detalhe:** quatro indicadores essenciais no primeiro nível.
- **Divulgação progressiva:** relatórios, histórico completo e configuração
  aparecem quando solicitados.
- **Uma decisão por área:** cada tela tem um foco e uma ação primária.
- **Visual com função:** sprites ajudam a reconhecer Pokémon e itens; não são
  decoração solta.
- **Estado explícito:** conta, hunt, conexão, fonte e horário do dado ficam
  visíveis.
- **Dados do jogo vencem dados genéricos:** a Pokepedia é a autoridade de regras.

## Arquitetura de informação

Navegação principal:

1. **Visão geral** — batalha atual, alertas, quatro KPIs e saúde das contas.
2. **Contas** — grade jogável e ações operacionais.
3. **Time & IV** — time atual, leitura de IV e detalhes da espécie.
4. **Laboratório** — comparação e projeção de nível.
5. **Inventário** — estoque visual, itens críticos e valor.

Configurações, layout e integrações saem da barra principal e entram em um único
menu de preferências. A Central de Eventos vira um painel lateral acessível em
qualquer área.

## 1. Visão geral: palco de batalha

O primeiro bloco é uma cena compacta da conta selecionada:

- Pokémon líder à esquerda, usando sprite traseiro quando disponível;
- inimigo atual à direita, usando sprite frontal;
- cenário coerente com a hunt ou, como fallback, com os tipos do inimigo;
- nome, nível e HP dos dois;
- último golpe e dano;
- hunt, turno e estado da conexão;
- realce de shiny e evento raro sem alterar toda a estrutura da tela.

O palco não deve competir com quatro webviews animadas. Apenas a conta em foco
usa animação; contas em segundo plano usam sprite estático.

Abaixo dele aparecem somente:

- saldo líquido/hora;
- XP/hora;
- abates/hora;
- capturas na sessão.

Depois vêm saúde das quatro contas e três eventos relevantes. Tabelas completas,
shiny dex e relatórios ficam no segundo nível.

## 2. Time atual

O Grid já recebe a lista `pokes` e atualizações `poke-delta`. O adaptador deve
preservar, no mínimo:

- id da instância e da espécie;
- nome, nível, slot e líder;
- HP atual e máximo;
- qualidade e IV total;
- stats observados usados no cálculo;
- shiny, tipos e poder, quando fornecidos.

Cada integrante aparece como uma linha visual:

`sprite · nome/nível · qualidade · IV/192 · HP · poder`

Selecionar um integrante abre:

- seis IVs individuais;
- base stats da espécie;
- qualidade e influência no poder;
- tipos, fraquezas e resistências;
- golpes da espécie com tipo, categoria, poder, cooldown e nível de aprendizado;
- drops e valor NPC, em uma aba secundária.

Se o servidor já entregar IV individual, ele vence a estimativa. Caso contrário,
o Grid calcula a partir dos stats observados e identifica o valor como
**estimado**.

## 3. Laboratório de IV

O laboratório trabalha com uma ou duas instâncias reais do time. O usuário pode:

- comparar Pokémon da mesma espécie;
- comparar espécies diferentes por poder e distribuição de stats;
- alterar o nível de projeção de 1 a 500;
- manter ou alterar qualidade em um cenário separado;
- visualizar valor atual, projetado e diferença absoluta/percentual;
- salvar dois cenários temporários lado a lado.

Fórmula oficial:

```text
stat = round((base + 2 × growth) × level/100 × quality^exp)
power = round((HP + Atk + Def + SpAtk + SpDef + Spd) × quality)
```

Expoentes usados pelo leitor atual:

| Stat | Expoente |
|---|---:|
| HP | 0,95 |
| Ataque | 0,80 |
| Defesa | 0,80 |
| Ataque especial | 0,80 |
| Defesa especial | 0,80 |
| Velocidade | 0,95 |

Regras de apresentação:

- projeção mantém espécie, IVs e qualidade fixos;
- evolução é outro cenário porque altera base stats;
- qualidade aparece com mais destaque que o IV, pois entra nos stats e novamente
  no poder;
- o resultado nunca deve ser descrito como previsão exata de dano.

## 4. Inventário visual

O catálogo `/game/items.json` já oferece `id`, `name`, `icon`, `category`,
`rare` e `npcPrice`. A quantidade vem da mensagem `inventory`.

O adaptador deve:

1. juntar quantidade e catálogo pelo `itemId`;
2. resolver ícone relativo contra a origem do jogo;
3. permitir somente origens de imagem conhecidas;
4. usar placeholder local se o ícone falhar;
5. calcular valor NPC total sem misturar com preço de mercado.

O inventário abre em modo **Atenção**, com bolas, cura/revive abaixo da meta,
itens raros recém-obtidos e itens fixados. “Todos” mostra a coleção completa por
categoria.

Cada item exibe:

`sprite · nome/contexto · quantidade · valor ou alerta`

## Fontes e precedência

| Dado | Fonte primária | Fallback |
|---|---|---|
| Instância do Pokémon, nível, qualidade, IV, HP | WebSocket do jogo | nenhum |
| Base stats, ataques, drops, hunt e XP | `/game/creatures.json` | página da Pokepedia |
| Item, categoria, ícone e preço NPC | `/game/items.json` | placeholder local |
| Regra de poder | Pokepedia `/systems/power` | fórmula versionada localmente |
| Sprite do Pokémon | PokeAPI sprites | sprite estático/placeholder local |
| Lista de golpes do jogo | `creatures.json.attacks` | Pokepedia da espécie |

A lista de golpes genérica da PokeAPI **não** representa os golpes disponíveis no
Poke Idle World e não deve alimentar a tela.

## Estratégia de sprites

Normalização do nome:

1. preferir `speciesId/pokeId`;
2. consultar `https://pokeapi.co/api/v2/pokemon/{id}`;
3. escolher sprite animado apenas no palco em foco;
4. escolher `back_default` para aliado e `front_default` para inimigo;
5. armazenar em cache a URL resolvida por espécie;
6. voltar para sprite estático e depois placeholder se a imagem falhar.

O cenário é local ao PokeGrid: gradientes, camadas e partículas leves escolhidas
por hunt/tipo. Não depende de uma imagem remota para continuar legível.

## Estados obrigatórios

Todas as novas áreas precisam de:

- carregando sem saltos de layout;
- dados ainda não recebidos;
- conta offline;
- catálogo indisponível;
- sprite indisponível;
- cálculo estimado versus IV confirmado;
- atualização antiga, com horário da última mensagem.

## Rollout seguro

1. Criar adaptadores puros para espécie, item e time.
2. Testar fórmula e normalização com fixtures.
3. Introduzir nova navegação sem remover o Modo Simples.
4. Entregar Time & IV e Inventário.
5. Entregar palco global estático.
6. Habilitar animação e comparação após medir CPU com quatro contas.
7. Só então decidir quais painéis antigos serão removidos ou recolhidos.

## Métricas de sucesso

- usuário identifica uma conta com problema em menos de 5 segundos;
- time atual e IV de qualquer integrante em até 2 interações;
- projeção para nível 500 em até 3 interações;
- redução de controles persistentes na barra superior;
- nenhuma regressão de foco nas contas jogáveis;
- animação global não aumenta uso médio de CPU de forma perceptível.

## Protótipo

O protótipo navegável desta direção foi criado no artefato de conversa
`pokegrid-experience.html`. Os dados nele são demonstrativos; nenhuma conta real
foi acessada.

## Implementação local de prévia

Em 2026-07-26, a direção foi integrada ao cliente local em
`src/ui/experience-v2.css` e `src/ui/experience-v2.js`.

O botão `✨ Novo painel` abre a experiência por cima da grade sem destruir,
desligar ou recriar os webviews. O módulo:

- lê estado e catálogos dentro da própria origem do jogo;
- usa dados reais quando a conta está conectada;
- usa demonstração neutra e explicitamente identificada durante o login;
- implementa palco global, Time & IV, comparação/projeção e inventário;
- mantém o Modo Simples e o painel antigo disponíveis.

É uma prévia funcional para validação visual. Os adaptadores ainda devem ser
extraídos para `src/data/*` antes de a experiência substituir painéis existentes.
