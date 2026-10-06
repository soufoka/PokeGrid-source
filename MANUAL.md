# Manual do PokeGrid

Guia curto do que cada coisa faz. Se você só quer resolver um problema pontual, veja o [FAQ](FAQ.md).

## A barra do topo

| Botão | O que faz |
|---|---|
| **▶ Logar equipe** | Loga de uma vez, com as senhas salvas, as contas que estão fora do jogo. Conta que já está farmando não sai do jogo, a não ser que você tenha trocado o e-mail ou a senha dela no 👤 Treinadores |
| **👤 Treinadores** | Cadastra e-mail e senha de cada conta. O **Limpar cache** de cada conta apaga os dados do jogo dela (resolve conta bugada, a senha continua salva); a lixeira só limpa os campos do formulário, e nada muda até você clicar em Salvar |
| **⟳ Atualizar tudo** | Recarrega os painéis ligados, ignorando o cache (resolve tela de login velha presa) |
| **📊 Painel** | A barra lateral com os números de uma conta por vez (detalhes abaixo) |
| **🍃 Simples** | Esconde o jogo e mostra só os números das 4 contas. Gasta bem menos do PC |
| **IVs** | Abre a calculadora de IV do app, sem ligar nada nos Scripts. Passe o mouse num pokémon em qualquer painel, ou clique num anúncio do Mercado, que ela preenche sozinha (detalhes abaixo) |
| **☰ Opções** | Tudo o mais, em 5 grupos: Ferramentas (Hunt, Tierlist, Ditto, Scripts), Tela (painéis, grade, proporção, Limpar jogo, chat), Sistema (Modo Eco, PC acordado, bandeja, abrir com o Windows, idioma), Avisos e recuperação (Alertas, Venda protegida, Voltar pra hunt, som do shiny, silenciar) e Ajuda e dados (Manual, FAQ, exportar e importar config, Erros). Cada liga/desliga tem uma chave: verde é ligado |

Atalhos de teclado (só quando o foco está no app, não dentro do jogo, e com nenhuma janela do app aberta): **H** Hunt, **C** Simples, **L** Limpar jogo, **R** Atualizar, **T** Treinadores, **G** Tierlist, **D** Ditto, **O** Opções, **M** também Limpar jogo, **E** Eco, **A** Alertas. O **F2** liga e desliga o Limpar jogo até com o mouse dentro do jogo.

## O topo de cada painel

Ao lado do nome da conta fica o que ela está fazendo, o mesmo status da coluna do 🍃 Simples: **Caçando** (com a hunt e o tempo), **Na cidade**, **⚠ Parada há X min** (10 minutos sem kill), **Time derrotado**, **⚠ Potions p/ ~X h** ou **⚠ Pokébolas p/ ~X h**, **Erro ao carregar** e **Desconectada** (com o botão **Recarregar**), **⚠ Depósito cheio** (o jogo pausou o Auto-Catch: venda ou solte Pokémon), **Na tela de login**, **Aguardando…** e **Desligada**. Verde é farmando, âmbar pede atenção e vermelho parou. Depois vêm o zoom (− e +), o ⟳ que recarrega só aquele painel e o ⛶ que expande.

## 📊 Painel: a barra lateral

Mostra os números de uma conta por vez. Troque pela aba com o nome da conta no topo do Painel; a aba Σ soma todas.

Na **engrenagem ⚙** do topo dela você escolhe **quais seções aparecem** e arrasta pra reordenar. Duas seções precisam de um passo antes de mostrar algo:

**📌 Itens fixados.** Serve para acompanhar a quantidade de um item específico em todas as contas ao mesmo tempo. Na engrenagem, procure o item (ou a pokébola) pelo nome e clique. Ele passa a aparecer na seção com o total de cada conta. Útil pra bola, potion, pena, o que você estiver juntando.

**🎯 Alvo shiny.** Serve para acompanhar a caçada de um shiny específico. Na engrenagem, em "Alvo shiny", busque a espécie. A seção passa a mostrar se ele **já apareceu**, se foi **capturado** e **quantas bolas** você gastou nele. Sem escolher a espécie, a seção fica vazia explicando isso (antes ela sumia, e parecia que a opção não funcionava).

## 🍃 Simples: o painel de todas as contas

O jogo some e ficam só os números das 4 contas. Serve pra deixar farmando gastando pouco do PC. Minimizar ou mandar pra bandeja faz o mesmo com os jogos sozinho, e ao abrir a janela eles voltam. Seções principais:

- **Hoje**: gold, XP, kills e capturas do dia, com meta e o botão que exporta as planilhas
- **Hunts**: o ranking. Ordene por **Sugerido** e escolha o atacante em **"caçar com"**. Golpe de TM só entra na conta se aquele pokémon aprendeu o disco. Com Ditto no time, aparece a melhor transformação por elemento, respeitando o que cada Ditto pode copiar (o Shiny só vira espécie com forma shiny) e sem TM, que Ditto não aprende
- **Capturas / Shinies**: histórico com filtros por conta, IV, qualidade e período
- **Times & IV**: o time de cada conta com IV, qualidade e poder, e o poder projetado no nível que você escolher (até 3000)
- **Inventário**: soma a mochila **e o depósito** das 4 contas
- **Tendência**: gráficos de gold/h e XP/h, e de gold/dia dos últimos 30 dias

## 🏆 Tierlist (Opções, ou tecla G)

Ranking de todas as espécies do jogo por elemento, nota de 0 a 100.

No topo, **XP/h** ou **Gold/h** escolhe o que a nota mede. Gold/h é kills/h do modelo vezes o loot esperado por kill a preço de NPC (o mesmo preço que o Hunt Analyzer do jogo usa), sem captura, supply nem bônus de loot; em hunt onde o valor vem de drop raro, a média demora a aparecer. O chip **🎯 Pokémon** inverte a pergunta: escolha um Pokémon do seu time (vem com o nível, a qualidade, o IV e os TMs dele) ou digite o nome de qualquer um, e a lista mostra as melhores hunts pra ele até o seu nível, com kills/h, XP/h e gold/h estimados em cada linha. Com um Ditto, cada hunt mostra também a forma certa pra ela.

Escolha **seu nível** no topo da tierlist (vai até 3000): só entram as hunts que você alcança e só as espécies que dá pra ter nesse nível, caçando ou evoluindo. Cada pokémon é avaliado no nível de cada hunt, pra comparação entre espécies ser justa. A caixinha **com TM** conta os TMs como o jogo faz: o TM elemental é um golpe extra em área que dispara sozinho a cada 10 s (só do próprio tipo, poder 300) e o AoE TM faz o golpe normal acertar todos os selvagens do quadro; os dois convivem no mesmo pokémon. Fica desligada por padrão porque TM é item. A densidade da hunt (selvagens por salva) vem das suas medições; sem medição, 2. O golpe **físico** enfrenta a defesa física de cada hunt, o **especial** a defesa especial, e a **vida** do defensor segura o ritmo. A aba **Geral** compara todos os elementos juntos, e nela a nota é o rendimento somado em todas as hunts (quem rende em todo lugar vale mais que quem só brilha numa fraqueza ×4).

Na linha: **FÍS/ESP** é a categoria do golpe, **folga ×N** é quanto dano sobra além do necessário pra matar de um golpe, e **ORRE | OUT** são as melhores hunts em cada região, cada uma com sua nota.

Como a nota é calculada: o dano do melhor golpe segue as regras do próprio jogo (efetividade amplificada na hunt: ×2 vira ×2.5, ×4 vira ×5.5, resistências dividem por 1.5; STAB ×1.5 no golpe do tipo do pokémon; golpe físico contra a Defesa e especial contra a Defesa Especial do selvagem), e a vida do selvagem diz quantos golpes o kill leva. Matar de um golpe no limite não vale o mesmo que matar com folga: a nota usa a chance de matar de um golpe, então dois pokémon que "matam de um" não empatam mais em 100. A nota final é XP por hora: golpes esperados por kill × 2,1 s por golpe + 3,1 s por kill (tempos medidos: andar até o próximo selvagem e o spawn pesam tanto quanto o golpe), e XP da hunt por kill. O app se calibra sozinho com o que você farma: mede o dano real do seu líder em % da vida do selvagem e os kills/h de cada hunt, e ajusta o modelo (a dica no topo da tierlist e do painel do Ditto mostra o estado da calibração). A medição roda sozinha com o app aberto, em qualquer tela e até minimizado: cada conta que passa 5 minutos numa hunt vira uma amostra de dano, contando só os golpes do líder atual (se você trocar o líder, ou ele evoluir, no meio da sessão, aquela hunt só volta a ser medida depois de você trocar de hunt ou usar o ⟲ Zerar do app; o 🗑 do Hunt Analyzer do jogo não apaga os golpes já somados), e com 3 amostras (contas ou hunts diferentes, guardadas de uma abertura pra outra) a nota passa a usar o seu dano. Os tempos por golpe e por kill saem do padrão quando você tem 6 ou mais hunts medidas com números de golpes por kill diferentes. Hunts em que o pokémon levaria golpes demais por kill ficam fora da tierlist e do Ditto, com o mesmo corte do Simples. Hunts de **NIGHTMARE** (nível 2000 a 3000) levam esse rótulo na lista de hunts do Simples. Na tierlist elas só ganham linha quando são a de maior XP da espécie, o que hoje não acontece: o jogo paga menos XP nelas do que em Orre.

## ✨ Ditto (Opções, logo abaixo da Tierlist)

Onde caçar com um Ditto e em que pokémon virar. Escolha **Shiny** ou **Comum**, o **nível do Ditto** e o **nível da conta** (só entram hunts até esse nível; 0 mostra todas). **Meu Ditto…** preenche com um Ditto que esteja no time de uma conta ligada. Qualidade e IV não se escolhem: no jogo eles são fixos e iguais pra todo Ditto (comum 1.4 e 89, shiny 2.0 e 119), e o app usa esses.

**Por hunt** é o ranking das hunts, cada uma com a melhor transformação pra ela; **Por tipo** é a melhor forma de cada elemento e onde farmar com ela. A nota vai de 0 a 100 (100 = a melhor hunt da lista), com o golpe, a efetividade e a folga, como na tierlist. As regras são as do jogo: o Ditto não copia lendários, Mega, Nightmare, bosses de Orre nem Outland; o Shiny só vira espécie com forma shiny; nenhum usa TM. Os debuffs também entram na conta: Shiny Ditto -20% de Ataque e Sp. Atk (e -25% de HP e defesas, que não pesam no ranking), comum -25% de Ataque e defesas. A transformação do comum dura 12 h; a do shiny é permanente. Premissa do cálculo: o transformado usa as bases e os golpes da espécie copiada no nível do próprio Ditto.

## IVs: a calculadora de IV

É do próprio app e funciona sempre. Abra no botão **IVs** e passe o mouse num pokémon em qualquer painel (mochila, caixa e time, depósito, troca, link do chat) ou clique num anúncio do Mercado ou do Remote Mark. O card tem cinco abas, e a última que você usou é a que abre da próxima vez.

No topo do card ficam o sprite do jogo com o selo de nível, os tipos e os selos de qualidade, IV total e poder.

**Leitor** mostra o IV de cada atributo, o potencial e o poder. A barra de cada atributo tem a cor da nota do IV (dourado 28 ou mais, verde 22, azul 15, cinza abaixo), e o melhor e o pior atributo ficam destacados. O jogo não mostra o IV de cada atributo, só os atributos, o nível, a qualidade e o IV total. O card refaz a conta pela fórmula do jogo, com os atributos-base do catálogo do próprio jogo. Em nível baixo dois IV podem dar o mesmo atributo, e aí aparece a faixa (12-13); o IV total da tela fecha a conta quando dá. A qualidade que o jogo mostra vem arredondada em 2 casas: quando ela não fecha os atributos, o card acha a de verdade pelos próprios atributos e pelo Poder do jogo. Mude o **Nível** no card pra ver o poder em outro nível; qualidade, atual e base também recalculam na hora. Ditto mostra só o IV total: no jogo o IV e a qualidade dele são fixos, e os atributos são os da forma copiada, com redução.

**Análise** mostra o melhor e o pior atributo e, pra cada um, quanto falta de IV pra chegar no 32 e quanto isso daria de atributo no nível do card (em faixa quando o IV não é exato). Embaixo vem a efetividade de tipos com a regra da hunt, em que ×2 vira ×2,5, ×4 vira ×5,5 e as resistências dividem por 1,5 (×0,5 vira ×0,33; imunidade continua ×0): as fraquezas, resistências e imunidades do pokémon e contra quais tipos os golpes do tipo dele (STAB) batem forte, fraco ou não afetam.

**Golpes** lista os golpes da espécie por nível, com os que o nível ainda não aprendeu apagados e os de disco marcados como TM. Quando o pokémon do card é o líder (⚔) do painel de onde ele veio e esse painel está numa hunt, aparecem em cima o golpe que ele está usando e o TM elemental, com os acertos e o dano médio em % da vida do selvagem, medidos pelo app. Enquanto não há medição, essa parte não aparece.

**Comparar** põe o pokémon do card lado a lado com os fixados: nível, qualidade, IV total, poder e o IV e o atributo de cada stat, com a diferença em verde quando o fixado tem mais e em vermelho quando tem menos. Pra fixar, use o 📌 no topo do card (até 3; eles continuam fixados quando você fecha o app). O ✕ na coluna tira o fixado.

**Histórico** guarda os últimos 20 pokémons lidos, de qualquer painel, com a cor da conta. Clique num pra abrir no card. **Limpar histórico** apaga a lista.

O campo **🔍 Buscar espécie** sugere espécies do catálogo do jogo enquanto você digita (Enter abre a primeira). A espécie escolhida abre no card sem leitura: digite o nível, a qualidade e os atributos que o jogo mostra e o IV sai pela mesma conta. Antes disso o card já mostra as bases, os tipos, os golpes e a efetividade.

O ⏸ no topo trava o card no pokémon atual: os próximos que você passar o mouse vão só pro histórico, e o cabeçalho mostra "travado" até você clicar de novo. **Copiar texto** copia um resumo pra colar no Discord (nome, nível, qualidade, tipos, IV total e por atributo, poder), e **Copiar JSON** copia os dados do card.

## Proteções

- **🛡 Venda protegida**: pede confirmação antes de vender shiny, qualidade Lendária ou acima e itens raros. Na engrenagem do Painel dá pra travar seus próprios itens (**🔒 Cadeado de venda**)
- **🔔 Alertas**: avisa quando aparece shiny, uma conta cai, para de farmar, fica sem suprimento ou tem o time inteiro derrotado (a conta vai pro Centro Pokémon e o farm para). Na engrenagem do Simples você escolhe quais tipos avisam no Windows, um por um. Com webhook do Discord configurado, o aviso também chega no celular
- **💾 Exportar/Importar config**: leva suas configurações e seu histórico pra outro PC. Scripts e webhook ficam de fora, de propósito. Importar troca o histórico pelo do arquivo e guarda uma cópia do seu antes. O app também salva um backup sozinho toda semana em `%APPDATA%\pokegrid\backups`, a mesma pasta do `hunts-historico.csv` (as hunts que passam das 150 guardadas) e do `hunts-historico-drops.csv`

## Coisas que confundem no começo

- **A opção marcada não mudou nada?** Provavelmente é uma seção que precisa de configuração (Fixados e Alvo shiny). Elas agora dizem isso na tela
- **Os avisos de combate sumiram** ("X derrotado! +XP"): é o **🧼 Limpar jogo**. Desligue-o pra vê-los de novo
- **Não consigo trocar a pokébola**: é o **🧼 Limpar jogo** escondendo o Auto-Helper. Passe o mouse no canto que ele aparece
- **O ouro da sessão**: desde a 1.5.16 vem do próprio servidor do jogo, então é o mesmo número do Hunt Analyzer (menos as Rare Pokemon Picture, se **Considerar preço dos itens no Mercado** estiver marcado, que é o padrão do jogo)
- **Conta travada quando saio do PC**: corrigido na 1.5.16; atualize
