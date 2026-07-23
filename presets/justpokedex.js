// ==UserScript==
// @name         JustPokedex
// @namespace    poke-idle-world-tools
// @version      3.0
// @description  Lê os dados dos Pokémon e estima seus IVs individuais
// @match        https://poke.idleworld.online/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const CONFIG = {
        tooltipSelector: ".inv-tip",
        panelId: "pokemon-reader-panel",
        storageKey: "pokemon-reader-panel-state",

        maxIVIndividual: 32,
        maxIVTotal: 192,
        qualidadeMaxima: 1.80,

        expoentes: {
            hp: 0.95,
            atk: 0.80,
            def: 0.80,
            spa: 0.80,
            spd: 0.80,
            vel: 0.95
        }
    };

    const NOMES_STATS = {
        hp: "HP",
        atk: "Ataque",
        def: "Defesa",
        spa: "Ataque especial",
        spd: "Defesa especial",
        vel: "Velocidade"
    };

    const NOMES_STATS_CURTOS = {
        hp: "HP",
        atk: "Atk",
        def: "Def",
        spa: "SpA",
        spd: "SpD",
        vel: "Vel"
    };

    const ICONES_STATS = {
        hp: "♥",
        atk: "⚔",
        def: "⬢",
        spa: "✦",
        spd: "⬟",
        vel: "➤"
    };

    let ultimoTexto = "";
    let ultimoPokemon = null;
    let pokemonManualAtual = null;
    let abaAtual = "leitor";
    let consultaEmAndamento = null;
    let formularioRecolhido = false;
    let pokemonFixado = null;
    let mouseTrackingEnabled = true;
    let historicoPokemon = [];

    // WebSocket Proxy & Damage tracker
    const danoPorGolpe = new Map();

    function extrairDanoDeObjeto(obj, depth = 0, resultados = []) {
        if (!obj || typeof obj !== "object" || depth > 6) return resultados;
        const nomeGolpe = obj.moveName || obj.attackName || obj.spellName ||
            (typeof obj.move === "string" ? obj.move : obj.move?.name) ||
            (typeof obj.attack === "string" ? obj.attack : null) ||
            (typeof obj.skill === "string" ? obj.skill : obj.skill?.name);
        const dano = Number(obj.damage ?? obj.dmg ?? obj.dano ?? obj.amount);
        if (typeof nomeGolpe === "string" && nomeGolpe.trim() && Number.isFinite(dano)) {
            resultados.push({
                name: nomeGolpe.trim(),
                dmg: dano,
                type: typeof obj.type === "string" ? obj.type : null,
                eff: Number.isFinite(Number(obj.eff)) ? Number(obj.eff) : null
            });
            return resultados;
        }
        for (const val of Object.values(obj)) {
            extrairDanoDeObjeto(val, depth + 1, resultados);
        }
        return resultados;
    }

    let ultimoGolpeUsado = null;

    function registrarDanos(dados) {
        const golpes = extrairDanoDeObjeto(dados);
        if (golpes.length === 0) return;
        for (const g of golpes) {
            const chave = g.name.toLowerCase();
            ultimoGolpeUsado = chave;
            const atual = danoPorGolpe.get(chave) || { count: 0, total: 0 };
            danoPorGolpe.set(chave, {
                name: g.name,
                lastDmg: g.dmg,
                total: atual.total + g.dmg,
                count: atual.count + 1,
                type: g.type || atual.type,
                eff: g.eff
            });
        }
        atualizarPainelMoves();
    }

    try {
        const originalWS = window.WebSocket;
        window.WebSocket = new Proxy(originalWS, {
            construct(target, args) {
                const ws = new target(...args);
                ws.addEventListener("message", (event) => {
                    try {
                        if (typeof event.data === "string") {
                            const parsed = JSON.parse(event.data);
                            registrarDanos(parsed);
                        }
                    } catch (e) { }
                });
                return ws;
            }
        });
        window.WebSocket.prototype = originalWS.prototype;
    } catch (e) {
        console.warn("[Poké Leitor] Falha ao interceptar WebSocket:", e);
    }

    const SPRITE_ONERROR = "if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';}else{this.style.display='none'}";
    const CACHE_KEY = "pokemon-api-cache";
    let apiCache = {};
    try {
        apiCache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    } catch (e) { }

    function salvarCache() {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(apiCache));
        } catch (e) { }
    }

    function isShiny(pokemon) {
        if (!pokemon) return false;
        if (pokemon.nome && pokemon.nome.toLowerCase().includes("shiny")) return true;
        if (pokemon.multiplicadorQualidade > 1.8) return true;
        if (pokemon.qualidade && pokemon.qualidade.toLowerCase().includes("shiny")) return true;
        return false;
    }

    function obterUrlsSprite(id, shiny) {
        const pastaShiny = shiny ? "shiny/" : "";
        const baseUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
        return {
            anim: `${baseUrl}/versions/generation-v/black-white/animated/${pastaShiny}${id}.gif`,
            still: `${baseUrl}/${pastaShiny}${id}.png`
        };
    }

    const TYPE_SYSTEM = {
        CHART: {
            normal: { rock: 0.5, ghost: 0, steel: 0.5 },
            fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
            water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
            electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
            grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
            ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
            fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
            poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
            ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
            flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
            psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
            bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
            rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
            ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
            dragon: { dragon: 2, steel: 0.5, fairy: 0 },
            dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
            steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
            fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
        },
        COLORS: {
            normal: "#a8a878",
            fire: "#f08030",
            water: "#6890f0",
            electric: "#f8d030",
            grass: "#78c850",
            ice: "#98d8d8",
            fighting: "#c03028",
            poison: "#a040a0",
            ground: "#e0c068",
            flying: "#a890f0",
            psychic: "#f85888",
            bug: "#a8b820",
            rock: "#b8a038",
            ghost: "#705898",
            dragon: "#7038f8",
            dark: "#705848",
            steel: "#b8b8d0",
            fairy: "#ee99ac"
        },
        TRADUCOES: {
            normal: "Normal",
            fire: "Fogo",
            water: "Água",
            electric: "Elétrico",
            grass: "Planta",
            ice: "Gelo",
            fighting: "Lutador",
            poison: "Veneno",
            ground: "Terra",
            flying: "Voador",
            psychic: "Psíquico",
            bug: "Inseto",
            rock: "Pedra",
            ghost: "Fantasma",
            dragon: "Dragão",
            dark: "Sombrio",
            steel: "Aço",
            fairy: "Fada"
        },
        TRADUCOES_INVERSAS: {
            "normal": "normal",
            "fogo": "fire",
            "agua": "water",
            "eletrico": "electric",
            "planta": "grass",
            "gelo": "ice",
            "lutador": "fighting",
            "veneno": "poison",
            "terra": "ground",
            "voador": "flying",
            "psiquico": "psychic",
            "inseto": "bug",
            "pedra": "rock",
            "fantasma": "ghost",
            "dragao": "dragon",
            "sombrio": "dark",
            "aco": "steel",
            "fada": "fairy"
        }
    };

    function obterChaveTipo(tipoPt) {
        if (!tipoPt) return null;
        const pt = tipoPt.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (TYPE_SYSTEM.COLORS[pt]) {
            return pt;
        }
        return TYPE_SYSTEM.TRADUCOES_INVERSAS[pt] || null;
    }

    function typeBadgeHtml(tipoEng) {
        const cor = TYPE_SYSTEM.COLORS[tipoEng] || "#888";
        const nomePt = TYPE_SYSTEM.TRADUCOES[tipoEng] || tipoEng;
        return `<span class="type-badge" style="background:${cor}">${escapeHtml(nomePt)}</span>`;
    }

    function obterEfetividadeHtml(pokemon) {
        const tiposEng = pokemon.tipos
            .map(t => obterChaveTipo(t))
            .filter(Boolean);

        if (tiposEng.length === 0) return "";

        const todosTipos = Object.keys(TYPE_SYSTEM.CHART);
        const a = tiposEng.map(t => new Set(todosTipos.filter(def => TYPE_SYSTEM.CHART[t][def] === 2)));
        const da4x = tiposEng.length === 2 ? todosTipos.filter(def => a[0].has(def) && a[1].has(def)) : [];
        const da2x = todosTipos.filter(def => a.some(set => set.has(def)) && !da4x.includes(def));

        const toma4x = [];
        const toma2x = [];
        const imune = [];

        for (const atk of todosTipos) {
            const multiplicador = tiposEng.reduce((acc, def) => acc * (TYPE_SYSTEM.CHART[atk][def] ?? 1), 1);
            if (multiplicador === 2) {
                toma2x.push(atk);
            } else if (multiplicador === 4) {
                toma4x.push(atk);
            } else if (multiplicador === 0) {
                imune.push(atk);
            }
        }

        const criarLinhaEfetividade = (icone, rotulo, lista, corTexto) => {
            if (lista.length === 0) return "";
            return `
                <div class="eff-row" style="display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 11px;">
                    <span class="eff-label" style="color:${corTexto}; font-weight: bold; width: 75px; flex-shrink: 0;">${icone} ${escapeHtml(rotulo)}</span>
                    <div class="eff-badges" style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${lista.map(t => typeBadgeHtml(t)).join("")}
                    </div>
                </div>
            `;
        };

        return `
            <div class="efetividade-card" style="margin-top: 10px; padding: 10px; background: rgba(0, 0, 0, 0.2); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <div class="sec-title" style="font-size: 9px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #8390a5; margin-bottom: 8px;">📊 Efetividade</div>
                ${criarLinhaEfetividade("⚔", "Dá 4x", da4x, "#ffd54a")}
                ${criarLinhaEfetividade("⚔", "Dá 2x", da2x, "#61f6a4")}
                ${criarLinhaEfetividade("🛡", "Toma 4x", toma4x, "#ff6b6b")}
                ${criarLinhaEfetividade("🛡", "Toma 2x", toma2x, "#ffb04a")}
                ${criarLinhaEfetividade("🛡", "Imune", imune, "#85c5ff")}
            </div>
        `;
    }

    let creaturesData = [];
    let creaturesMapByName = new Map();

    async function carregarCreatures() {
        try {
            const resposta = await fetch("/game/creatures.json");
            if (resposta.ok) {
                const dados = await resposta.json();
                creaturesData = Array.isArray(dados?.creatures) ? dados.creatures : [];
                for (const c of creaturesData) {
                    if (c && c.name) {
                        creaturesMapByName.set(c.name.toLowerCase().trim(), c);
                    }
                }
                console.log("[Poké Leitor] Dados de creatures.json carregados:", creaturesMapByName.size);
            }
        } catch (e) {
            console.warn("[Poké Leitor] Não foi possível carregar creatures.json:", e);
        }
    }

    function obterMovesDoPokemon(pokemon) {
        if (!pokemon || !pokemon.nome) return [];

        const nomeBruto = pokemon.nome.toLowerCase().trim();
        const nomeNorm = normalizarNomePokemon(pokemon.nome).replace(/-/g, " ");

        let c = creaturesMapByName.get(nomeBruto) || creaturesMapByName.get(nomeNorm);

        if (!c) {
            for (const [key, val] of creaturesMapByName.entries()) {
                if (key.includes(nomeNorm) || (nomeNorm && nomeNorm.includes(key))) {
                    c = val;
                    break;
                }
            }
        }
        if (!c) return [];

        const extrair = s => {
            if (typeof s === "string") return { name: s };
            if (!s || typeof s !== "object") return null;
            const nome = s.name || s.moveName || s.move || s.id;
            return nome ? {
                name: String(nome),
                power: s.power ?? s.basePower ?? s.damage ?? s.dmg ?? null,
                type: s.type ? String(s.type) : (s.element ? String(s.element) : null)
            } : null;
        };

        const listaOriginais = [c.moves, c.attacks, c.skills, c.spells];
        for (const arr of listaOriginais) {
            if (Array.isArray(arr) && arr.length > 0) {
                return arr.map(extrair).filter(Boolean);
            }
        }
        return [];
    }

    let mostrarAbaMoves = false;

    function alternarPainelMoves() {
        const movesPanel = document.getElementById("moves-panel");
        const btn = document.querySelector('[data-tab="moves"]');
        if (!movesPanel) return;

        mostrarAbaMoves = !mostrarAbaMoves;
        movesPanel.style.display = mostrarAbaMoves ? "flex" : "none";

        if (btn) {
            btn.classList.toggle("active", mostrarAbaMoves);
        }

        if (mostrarAbaMoves) {
            atualizarPainelMoves();
            atualizarPosicaoPainelMoves();
        }
    }

    function atualizarPosicaoPainelMoves() {
        const mainPanel = document.getElementById(CONFIG.panelId);
        const movesPanel = document.getElementById("moves-panel");
        if (!mainPanel || !movesPanel || movesPanel.style.display === "none") return;

        const rect = mainPanel.getBoundingClientRect();
        let left = rect.right + 8;

        if (left + 300 > window.innerWidth - 8) {
            left = rect.left - 308;
        }

        movesPanel.style.left = `${Math.max(8, left)}px`;
        movesPanel.style.top = `${rect.top}px`;
        movesPanel.style.height = "auto";
        movesPanel.style.maxHeight = `calc(100vh - ${rect.top + 16}px)`;
    }



    function atualizarPainelMoves() {
        const movesPanel = document.getElementById("moves-panel");
        if (!movesPanel || movesPanel.style.display === "none") return;

        if (!ultimoPokemon) {
            movesPanel.innerHTML = `
                <div class="moves-header">
                    <strong>⚔ Golpes</strong>
                </div>
                <div class="moves-body" style="display: flex; align-items: center; justify-content: center; flex: 1; padding: 20px; color: #8c98aa; text-align: center;">
                    <div>
                        <div class="loading-ball-mini" style="width: 24px; height: 24px; border: 1.5px solid #171717; border-radius: 50%; background: linear-gradient(to bottom, #f34848 0%, #f34848 43%, #151515 43%, #151515 57%, #f7f7f7 57%); animation: spin 1.1s linear infinite; position: relative;"><span style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; border: 1px solid #171717; border-radius: 50%; background: #fff; transform: translate(-50%, -50%);"></span></div>
                        <strong>Aguardando Pokémon</strong>
                        <small style="display: block; margin-top: 5px; font-size: 11px;">Passe o mouse sobre um Pokémon.</small>
                    </div>
                </div>
            `;
            return;
        }

        const moves = obterMovesDoPokemon(ultimoPokemon);

        if (moves.length === 0) {
            movesPanel.innerHTML = `
                <div class="moves-header">
                    <strong>⚔ Golpes — ${escapeHtml(ultimoPokemon.nome)}</strong>
                </div>
                <div class="moves-body" style="display: flex; align-items: center; justify-content: center; flex: 1; padding: 20px; color: #8c98aa; text-align: center;">
                    <div>
                        <strong>Sem golpes cadastrados</strong>
                        <small style="display: block; margin-top: 5px; font-size: 11px;">Não encontramos golpes em creatures.json.</small>
                    </div>
                </div>
            `;
            return;
        }

        const nomesNossosGolpes = new Set(moves.map(m => m.name.toLowerCase().trim()));

        let html = `
            <div class="moves-header">
                <strong>⚔ Moves — ${escapeHtml(ultimoPokemon.nome)}</strong>
            </div>
            <div class="moves-body" style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
        `;

        for (const m of moves) {
            const chave = m.name.toLowerCase().trim();
            const danoInfo = danoPorGolpe.get(chave);
            const tipoEng = m.type ? obterChaveTipo(m.type) : null;
            const badgeHtml = tipoEng ? typeBadgeHtml(tipoEng) : "";
            const isAtivo = ultimoGolpeUsado === chave;

            if (isAtivo) {
                const dmgFormatado = danoInfo ? formatarNumero(danoInfo.lastDmg) : "-";
                const effTexto = danoInfo && danoInfo.eff && danoInfo.eff !== 1 ? `${danoInfo.eff}x` : "";

                html += `
                    <div class="move-card active" style="display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border: 2px solid #f1c644; background: rgba(241,198,68,0.04); border-radius: 10px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <strong style="color: #fff; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                                <span style="color: #ffd84f;">▶</span> ${escapeHtml(m.name)}
                            </strong>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                ${badgeHtml}
                                ${m.power ? `<span style="color: #8c98aa; font-size: 9px;">poder ${m.power}</span>` : ""}
                            </div>
                            <span style="color: #ffd54a; font-weight: bold; font-size: 11px;">
                                💥 ${dmgFormatado} ${effTexto ? `<small style="font-size: 8px; opacity: 0.8; color: #6ee0a0;">${effTexto}</small>` : ""}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                let danoExtraHtml = "";
                if (danoInfo) {
                    const dmgFormatado = formatarNumero(danoInfo.lastDmg);
                    danoExtraHtml = `<span style="color: #ffd54a; font-weight: bold; font-size: 10px; margin-left: 4px;">💥 ${dmgFormatado}</span>`;
                }

                html += `
                    <div class="move-card" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; min-height: 32px;">
                        <strong style="color: #fff; font-size: 11px; font-weight: normal; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml(m.name)}
                        </strong>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${badgeHtml}
                            ${m.power ? `<span style="color: #8c98aa; font-size: 9px;">poder ${m.power}</span>` : ""}
                            ${danoExtraHtml}
                        </div>
                    </div>
                `;
            }
        }

        const golpesTomados = Array.from(danoPorGolpe.values())
            .filter(g => !nomesNossosGolpes.has(g.name.toLowerCase().trim()));

        if (golpesTomados.length > 0) {
            html += `
                <div class="section-divider" style="font-size: 8px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; color: #66758b; margin: 10px 0 2px 2px; display: flex; align-items: center; gap: 4px;">
                    <span>🛡️ GOLPES TOMADOS</span>
                    <span style="opacity: 0.5; font-size: 7px; font-weight: normal;">- nesta hunt</span>
                </div>
            `;

            for (const g of golpesTomados) {
                const tipoEng = g.type ? obterChaveTipo(g.type) : null;
                const badgeHtml = tipoEng ? typeBadgeHtml(tipoEng) : "";
                const dmgFormatado = formatarNumero(g.lastDmg);

                html += `
                    <div class="move-card taken" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(240,90,98,0.02); border: 1px solid rgba(240,90,98,0.06); border-radius: 10px; min-height: 32px;">
                        <strong style="color: #edf4ff; font-size: 11px; font-weight: normal; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml(g.name)}
                        </strong>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${badgeHtml}
                            <span style="color: #ff7a83; font-weight: bold; font-size: 10px; display: flex; align-items: center; gap: 2px;">
                                🛡️ ${dmgFormatado}
                            </span>
                        </div>
                    </div>
                `;
            }
        }

        html += `</div>`;
        movesPanel.innerHTML = html;
    }

    function numero(texto) {
        if (
            texto === null ||
            texto === undefined ||
            texto === ""
        ) {
            return null;
        }

        const convertido = Number(
            String(texto)
                .replace(/\s/g, "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
        );

        return Number.isFinite(convertido)
            ? convertido
            : null;
    }

    function numeroDecimal(texto) {
        if (
            texto === null ||
            texto === undefined ||
            texto === ""
        ) {
            return null;
        }

        const convertido = Number(
            String(texto)
                .replace(",", ".")
                .replace(/[^\d.-]/g, "")
        );

        return Number.isFinite(convertido)
            ? convertido
            : null;
    }

    function limitar(valor, minimo, maximo) {
        return Math.min(
            maximo,
            Math.max(minimo, valor)
        );
    }

    function arredondar(valor, casas = 1) {
        const fator = 10 ** casas;
        return Math.round(valor * fator) / fator;
    }

    function parsePokemon(texto) {
        if (!texto) return null;

        const linhas = texto
            .split("\n")
            .map(linha => linha.trim())
            .filter(Boolean);

        if (!linhas.length) return null;

        const nome = linhas[0] || "Desconhecido";
        const tipos = [];

        for (const linha of linhas.slice(1)) {
            if (
                /^(Ativo|Active|Nv\s|Lv\s|Qualidade|Quality|IV\s|HP\s|Atk\s|Def\s|SpA\s|SpD\s|Vel\s|Spe\s|.*(?:Poder|Power))/i.test(
                    linha
                )
            ) {
                break;
            }

            // o jogo as vezes cola o status "Ativo"/"Active" (com icone) junto dos tipos;
            // so aceita a linha se sobrar um tipo real, pra nao criar um chip "Ativo" duplicado
            const limpa = linha.replace(/ativo|active/ig, "").trim();
            if (limpa && obterChaveTipo(limpa)) tipos.push(limpa);
        }

        const ivMatch =
            texto.match(/IV\s*(\d+)\s*\/\s*(\d+)/i);

        const qualidadeTexto =
            texto.match(/(?:Qualidade|Quality)\s+([^\n]+)/i)?.[1]?.trim() ||
            null;

        const multiplicador =
            numeroDecimal(
                qualidadeTexto?.match(
                    /(?:×|x)\s*([\d.,]+)/i
                )?.[1]
            );

        return {
            nome,
            tipos,

            ativo: linhas.some(linha =>
                /ativo|active/i.test(linha)
            ),

            nivel: numero(
                texto.match(/(?:Nv|Lv)\s*(\d+)/i)?.[1]
            ),

            qualidade: qualidadeTexto,
            multiplicadorQualidade: multiplicador,

            ivAtual: numero(ivMatch?.[1]),
            ivMaximo: numero(ivMatch?.[2]),

            hp: numero(
                texto.match(/HP\s+([\d.,]+)/i)?.[1]
            ),

            atk: numero(
                texto.match(/Atk\s+([\d.,]+)/i)?.[1]
            ),

            def: numero(
                texto.match(/Def\s+([\d.,]+)/i)?.[1]
            ),

            spa: numero(
                texto.match(/SpA\s+([\d.,]+)/i)?.[1]
            ),

            spd: numero(
                texto.match(/SpD\s+([\d.,]+)/i)?.[1]
            ),

            vel: numero(
                texto.match(/(?:Vel|Spe)\s+([\d.,]+)/i)?.[1]
            ),

            poder: numero(
                texto.match(/(?:Poder|Power)\s+([\d.,]+)/i)?.[1]
            )
        };
    }

    function escapeHtml(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizarNomePokemon(nome) {
        if (!nome) return "";
        let n = String(nome)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .toLowerCase();

        // 1. Remove emojis e símbolos unicode
        n = n.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "");

        // 2. Remove o termo "shiny" (palavra completa, sufixo ou prefixo)
        n = n.replace(/\bshiny\b/g, "").replace(/shiny/g, "");

        // 3. Substituições de gênero
        n = n.replace(/♀/g, "-f").replace(/♂/g, "-m");

        // 4. Mantém apenas letras, números, hífens e espaços
        n = n.replace(/[^a-z0-9\s-]/g, "").trim();

        // 5. Substitui espaços por hífen e limpa hífens extras
        n = n.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

        return n;
    }

    function formatarNumero(valor) {
        if (
            valor === null ||
            valor === undefined ||
            !Number.isFinite(Number(valor))
        ) {
            return "-";
        }

        return new Intl.NumberFormat("pt-BR").format(valor);
    }

    function formatarDecimal(valor, casas = 1) {
        if (
            valor === null ||
            valor === undefined ||
            !Number.isFinite(Number(valor))
        ) {
            return "-";
        }

        return Number(valor).toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: casas,
                maximumFractionDigits: casas
            }
        );
    }

    function linha(rotulo, valor) {
        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return "";
        }

        return `
            <div class="row">
                <span>${escapeHtml(rotulo)}</span>

                <strong>
                    ${escapeHtml(String(valor))}
                </strong>
            </div>
        `;
    }

    function salvarEstadoPainel(painel) {
        try {
            const rect = painel.getBoundingClientRect();
            const isMin = painel.classList.contains("minimized");

            let anterior = {};
            try {
                const salvo = localStorage.getItem(CONFIG.storageKey);
                if (salvo) anterior = JSON.parse(salvo);
            } catch (e) { }

            const estado = {
                left: rect.left,
                top: rect.top,
                width: isMin ? (anterior.width || 340) : rect.width,
                height: isMin ? (anterior.height || null) : rect.height,
                minimized: isMin,
                abaAtual,
                formularioRecolhido
            };

            localStorage.setItem(
                CONFIG.storageKey,
                JSON.stringify(estado)
            );
        } catch (erro) {
            console.warn(
                "[Poké Leitor] Não foi possível salvar o painel.",
                erro
            );
        }
    }

    function restaurarEstadoPainel(painel) {
        try {
            const salvo =
                localStorage.getItem(CONFIG.storageKey);

            if (!salvo) return;

            const estado = JSON.parse(salvo);

            if (Number.isFinite(estado.left)) {
                painel.style.left = `${estado.left}px`;
                painel.style.right = "auto";
            }

            if (Number.isFinite(estado.top)) {
                painel.style.top = `${estado.top}px`;
            }

            if (Number.isFinite(estado.width) && estado.width > 100) {
                painel.style.width = `${estado.width}px`;
            }

            if (Number.isFinite(estado.height) && estado.height > 100) {
                painel.style.height = `${estado.height}px`;
            }

            if (estado.minimized) {
                painel.classList.add("minimized");
            }

            if (
                estado.abaAtual === "leitor" ||
                estado.abaAtual === "analise"
            ) {
                abaAtual = estado.abaAtual;
            }

            formularioRecolhido =
                Boolean(estado.formularioRecolhido);
        } catch (erro) {
            console.warn(
                "[Poké Leitor] Não foi possível restaurar o painel.",
                erro
            );
        }
    }

    function ativarRedimensionamento(painel) {
        const handle = document.getElementById("resize-handle");
        if (!handle) return;

        let startWidth, startHeight, startX, startY;

        handle.addEventListener("mousedown", initResize, false);
        handle.addEventListener("touchstart", initResizeTouch, { passive: false });

        function initResize(e) {
            e.preventDefault();
            e.stopPropagation();

            startWidth = painel.offsetWidth;
            startHeight = painel.offsetHeight;
            startX = e.clientX;
            startY = e.clientY;

            document.documentElement.addEventListener("mousemove", doResize, false);
            document.documentElement.addEventListener("mouseup", stopResize, false);
        }

        function doResize(e) {
            const newWidth = Math.max(260, startWidth + (e.clientX - startX));
            const newHeight = Math.max(180, startHeight + (e.clientY - startY));

            painel.style.width = newWidth + "px";
            painel.style.height = newHeight + "px";
        }

        function stopResize() {
            document.documentElement.removeEventListener("mousemove", doResize, false);
            document.documentElement.removeEventListener("mouseup", stopResize, false);

            salvarEstadoPainel(painel);
        }

        function initResizeTouch(e) {
            e.preventDefault();
            e.stopPropagation();

            startWidth = painel.offsetWidth;
            startHeight = painel.offsetHeight;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;

            document.documentElement.addEventListener("touchmove", doResizeTouch, { passive: false });
            document.documentElement.addEventListener("touchend", stopResizeTouch, false);
        }

        function doResizeTouch(e) {
            const newWidth = Math.max(260, startWidth + (e.touches[0].clientX - startX));
            const newHeight = Math.max(180, startHeight + (e.touches[0].clientY - startY));

            painel.style.width = newWidth + "px";
            painel.style.height = newHeight + "px";
        }

        function stopResizeTouch() {
            document.documentElement.removeEventListener("touchmove", doResizeTouch);
            document.documentElement.removeEventListener("touchend", stopResizeTouch);

            salvarEstadoPainel(painel);
        }
    }

    function limitarPainelNaTela(painel) {
        const rect = painel.getBoundingClientRect();

        const maxLeft = Math.max(
            0,
            window.innerWidth - rect.width
        );

        const maxTop = Math.max(
            0,
            window.innerHeight - rect.height
        );

        painel.style.left = `${Math.min(
            Math.max(0, rect.left),
            maxLeft
        )
            }px`;

        painel.style.top = `${Math.min(
            Math.max(0, rect.top),
            maxTop
        )
            }px`;

        painel.style.right = "auto";

        atualizarPosicaoPainelMoves();
    }

    function atualizarBotaoMinimizar(painel) {
        const botao =
            document.getElementById("minimize");

        if (!botao) return;

        const minimizado =
            painel.classList.contains("minimized");

        botao.textContent = minimizado ? "+" : "−";

        botao.title = minimizado
            ? "Restaurar"
            : "Minimizar";

        // minimizado, o painel vira o "botao IV's": titulo curto e clique pra abrir
        const titulo = document.getElementById("panel-title");
        if (titulo) titulo.textContent = minimizado ? "IV's" : "JustPokédex";
    }

    function alternarMinimizado(painel) {
        painel.classList.toggle("minimized");

        atualizarBotaoMinimizar(painel);
        limitarPainelNaTela(painel);
        salvarEstadoPainel(painel);
    }

    function ativarArraste(painel) {
        const handle =
            document.getElementById("drag-handle");

        if (!handle) return;

        let arrastando = false;
        let moveu = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener("mousedown", evento => {
            if (evento.button !== 0) return;
            if (evento.target.closest("button")) return;

            arrastando = true;
            moveu = false;

            const rect =
                painel.getBoundingClientRect();

            offsetX = evento.clientX - rect.left;
            offsetY = evento.clientY - rect.top;

            painel.style.left = `${rect.left}px`;
            painel.style.top = `${rect.top}px`;
            painel.style.right = "auto";

            painel.classList.add("dragging");
            document.body.style.userSelect = "none";

            evento.preventDefault();
        });

        document.addEventListener("mousemove", evento => {
            if (!arrastando) return;

            moveu = true;

            const maxLeft = Math.max(
                0,
                window.innerWidth - painel.offsetWidth
            );

            const maxTop = Math.max(
                0,
                window.innerHeight - painel.offsetHeight
            );

            const left = Math.min(
                Math.max(
                    0,
                    evento.clientX - offsetX
                ),
                maxLeft
            );

            const top = Math.min(
                Math.max(
                    0,
                    evento.clientY - offsetY
                ),
                maxTop
            );

            painel.style.left = `${left}px`;
            painel.style.top = `${top}px`;

            atualizarPosicaoPainelMoves();
        });

        document.addEventListener("mouseup", () => {
            if (!arrastando) return;

            arrastando = false;

            painel.classList.remove("dragging");
            document.body.style.userSelect = "";

            salvarEstadoPainel(painel);
        });

        window.addEventListener("resize", () => {
            limitarPainelNaTela(painel);
            salvarEstadoPainel(painel);
        });

        // clique simples (sem arraste) no cabecalho minimizado abre o painel
        handle.addEventListener("click", evento => {
            if (evento.target.closest("button")) return;
            if (moveu) return;
            if (painel.classList.contains("minimized")) {
                alternarMinimizado(painel);
            }
        });
    }

    function htmlAguardando() {
        return `
            <div class="empty">
                <div class="empty-ball">
                    <span></span>
                </div>

                <strong>Aguardando Pokémon</strong>

                <small>
                    Passe o mouse sobre um Pokémon
                    do inventário.
                </small>
            </div>
        `;
    }

    function htmlAnaliseVazia() {
        return `
            <div class="analysis-empty">
                <div class="analysis-empty-icon">
                    <span>IV</span>
                </div>

                <strong>Análise de IV</strong>

                <span>
                    Passe o mouse sobre um Pokémon para
                    preencher os dados automaticamente.
                </span>

                <div class="empty-tips">
                    <div>
                        <b>1</b>
                        Selecione um Pokémon
                    </div>

                    <div>
                        <b>2</b>
                        Confira os atributos
                    </div>

                    <div>
                        <b>3</b>
                        Veja o potencial
                    </div>
                </div>
            </div>
        `;
    }

    function criarPainel() {
        if (
            document.getElementById(CONFIG.panelId)
        ) {
            return;
        }

        const painel = document.createElement("div");
        painel.id = CONFIG.panelId;

        painel.innerHTML = `
            <div class="header" id="drag-handle">
                <div class="title-area">
                    <div class="pokeball">
                        <span></span>
                    </div>

                    <div>
                        <strong id="panel-title">JustPokédex</strong>
                    </div>
                </div>

                <div class="header-actions">
                    <button
                        id="toggle-tracking"
                        type="button"
                        style="margin-right: 4.5px; font-size: 11px; padding: 0 4px;"
                    >
                        🐭
                    </button>

                    <button
                        id="minimize"
                        type="button"
                        title="Minimizar"
                    >
                        −
                    </button>

                    <button
                        id="close"
                        type="button"
                        title="Fechar"
                    >
                        ×
                    </button>
                </div>
            </div>

            <div class="led-area">
                <div class="main-led"></div>
                <div class="small-led led-red"></div>
                <div class="small-led led-yellow"></div>
                <div class="small-led led-green"></div>
            </div>

            <div id="panel-body">
                <div class="tabs">
                    <button
                        class="tab-button"
                        data-tab="leitor"
                        type="button"
                    >
                        <span class="tab-icon">◉</span>
                        Pokémon
                    </button>

                    <button
                        class="tab-button"
                        data-tab="analise"
                        type="button"
                    >
                        <span class="tab-icon">⌁</span>
                        Análise de IV
                    </button>

                    <button
                        class="tab-button"
                        data-tab="comparacao"
                        type="button"
                    >
                        <span class="tab-icon">⚖</span>
                        Comparar
                    </button>

                    <button
                        class="tab-button"
                        data-tab="moves"
                        type="button"
                    >
                        <span class="tab-icon">⚔</span>
                        Moves
                    </button>
                </div>

                <div
                    id="tab-leitor"
                    class="tab-content"
                >
                    <div id="content">
                        ${htmlAguardando()}
                    </div>

                    <div class="actions">
                        <button
                            id="fix"
                            type="button"
                            style="background: linear-gradient(#4d5a75, #2e3b52); border-color: #5c6c8c; color: #fff;"
                        >
                            📌 Fixar
                        </button>

                        <button
                            id="copy"
                            type="button"
                        >
                            📋 Copiar dados
                        </button>

                        <button
                            id="json"
                            type="button"
                        >
                            { } Copiar JSON
                        </button>
                    </div>
                </div>

                <div
                    id="tab-analise"
                    class="tab-content"
                >
                    <div class="analysis-search-container" style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); background: #0c131f; position: relative;">
                        <div style="position: relative; display: flex; align-items: center; gap: 8px; background: #151d2a; border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; padding: 7px 10px; transition: border-color 0.15s ease;">
                            <span style="color: #66758a; font-size: 13px; flex: 0 0 auto; pointer-events: none;">🔍</span>
                            <input type="text" id="analysis-search-input" placeholder="Buscar Pokémon para análise manual..." style="flex: 1; background: transparent; border: none; color: #e2ecfa; font-size: 11px; outline: none; box-sizing: border-box; padding: 0;" onfocus="this.parentElement.style.borderColor='rgba(202,48,53,0.5)'" onblur="this.parentElement.style.borderColor='rgba(255,255,255,0.09)'">
                            <button id="analysis-search-clear" style="background: transparent; border: none; color: #66758a; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; opacity: 0.7;" title="Limpar">×</button>
                        </div>
                        <div id="analysis-search-results" style="display: none; position: absolute; left: 12px; right: 12px; top: calc(100%); max-height: 200px; overflow-y: auto; background: #101827; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; z-index: 100; box-shadow: 0 6px 20px rgba(0,0,0,0.6);"></div>
                    </div>
                    <div id="analysis-content">
                        ${htmlAnaliseVazia()}
                    </div>
                </div>

                <div
                    id="tab-comparacao"
                    class="tab-content"
                >
                    <div id="comparison-content">
                        <!-- Conteúdo da comparação será renderizado dinamicamente -->
                    </div>
                </div>



                <div class="footer">
                    Poke Idle World Tools
                </div>
            </div>
            <div id="resize-handle"></div>
        `;

        const estilo = document.createElement("style");
        estilo.textContent = criarCSS();

        document.head.appendChild(estilo);
        document.body.appendChild(painel);

        const movesPanel = document.createElement("div");
        movesPanel.id = "moves-panel";
        movesPanel.style.display = "none";
        document.body.appendChild(movesPanel);

        restaurarEstadoPainel(painel);
        painel.classList.add("minimized"); // sempre comeca minimizado; expande no clique do "IV's"
        atualizarBotaoMinimizar(painel);
        ativarArraste(painel);
        ativarRedimensionamento(painel);
        trocarAba(abaAtual);
        limitarPainelNaTela(painel);

        document
            .getElementById("minimize")
            .addEventListener("click", evento => {
                evento.stopPropagation();
                alternarMinimizado(painel);
            });

        document
            .getElementById("close")
            .addEventListener("click", evento => {
                evento.stopPropagation();
                painel.style.display = "none";
                const movesPanelEl = document.getElementById("moves-panel");
                if (movesPanelEl) movesPanelEl.style.display = "none";
                mostrarAbaMoves = false;
                const btn = document.querySelector('[data-tab="moves"]');
                if (btn) btn.classList.remove("active");
            });

        const btnTracking = document.getElementById("toggle-tracking");
        function atualizarEstiloTracking() {
            if (!btnTracking) return;
            if (mouseTrackingEnabled) {
                btnTracking.style.opacity = "1";
                btnTracking.title = "Leitura com Mouse: ATIVADA (Clique para Desativar)";
            } else {
                btnTracking.style.opacity = "0.4";
                btnTracking.title = "Leitura com Mouse: DESATIVADA (Clique para Ativar)";
            }
        }
        if (btnTracking) {
            atualizarEstiloTracking();
            btnTracking.addEventListener("click", evento => {
                evento.stopPropagation();
                mouseTrackingEnabled = !mouseTrackingEnabled;
                localStorage.setItem("pokemon-reader-tracking", mouseTrackingEnabled);
                atualizarEstiloTracking();
            });
        }

        document
            .getElementById("copy")
            .addEventListener("click", copiarTexto);

        document
            .getElementById("json")
            .addEventListener("click", copiarJson);

        document
            .getElementById("fix")
            .addEventListener("click", () => {
                if (!ultimoPokemon) return;
                const isFixed = pokemonFixado &&
                    normalizarNomePokemon(pokemonFixado.nome) === normalizarNomePokemon(ultimoPokemon.nome) &&
                    pokemonFixado.nivel === ultimoPokemon.nivel &&
                    pokemonFixado.poder === ultimoPokemon.poder;
                if (isFixed) {
                    desfixarPokemon();
                } else {
                    fixarPokemon(ultimoPokemon);
                }
            });

        document
            .querySelectorAll(".tab-button")
            .forEach(botao => {
                botao.addEventListener("click", () => {
                    trocarAba(botao.dataset.tab);
                });
            });

        // Debounce helper
        let searchDebounce = null;

        const searchInput = document.getElementById("analysis-search-input");
        const searchResults = document.getElementById("analysis-search-results");
        const searchClear = document.getElementById("analysis-search-clear");

        if (searchInput && searchResults) {
            searchInput.addEventListener("input", () => {
                clearTimeout(searchDebounce);
                const query = searchInput.value.trim().toLowerCase();
                if (query.length < 1) {
                    searchResults.style.display = "none";
                    searchResults.innerHTML = "";
                    return;
                }
                searchDebounce = setTimeout(async () => {
                    searchResults.style.display = "block";
                    searchResults.innerHTML = `<div style="padding: 10px 12px; color: #66758a; font-size: 11px;">Buscando...</div>`;
                    try {
                        const url = `https://pokeapi.co/api/v2/pokemon?limit=1302&offset=0`;
                        let lista = window._piwPokeList;
                        if (!lista) {
                            const resp = await fetch(url);
                            const data = await resp.json();
                            window._piwPokeList = data.results;
                            lista = data.results;
                        }
                        const matches = lista
                            .filter(p => p.name.includes(query))
                            .slice(0, 15);
                        if (matches.length === 0) {
                            searchResults.innerHTML = `<div style="padding: 10px 12px; color: #66758a; font-size: 11px;">Nenhum Pokémon encontrado.</div>`;
                            return;
                        }
                        searchResults.innerHTML = matches.map(p => {
                            const speciesId = p.url.split("/").filter(Boolean).pop();
                            const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
                            const label = p.name.charAt(0).toUpperCase() + p.name.slice(1);
                            return `<div class="search-result-item" data-name="${p.name}" style="display: flex; align-items: center; gap: 10px; padding: 6px 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.1s;">
                                <img src="${spriteUrl}" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain;image-rendering:pixelated;">
                                <span style="color: #e2ecfa; font-size: 11px; font-weight: bold;">${label}</span>
                                <span style="color: #66758a; font-size: 9px; margin-left:auto;">#${speciesId}</span>
                            </div>`;
                        }).join("");

                        searchResults.querySelectorAll(".search-result-item").forEach(item => {
                            item.addEventListener("mouseenter", () => { item.style.background = "rgba(255,255,255,0.06)"; });
                            item.addEventListener("mouseleave", () => { item.style.background = ""; });
                            item.addEventListener("click", async () => {
                                const pokeName = item.dataset.name;
                                searchInput.value = pokeName.charAt(0).toUpperCase() + pokeName.slice(1);
                                searchResults.style.display = "none";
                                const area = document.getElementById("analysis-content");
                                if (area) {
                                    area.innerHTML = `<div class="loading"><div class="loading-ball"><span></span></div><strong>Carregando dados...</strong></div>`;
                                }
                                try {
                                    const bases = await buscarAtributosBase(pokeName);
                                    const pokemonManual = {
                                        nome: pokeName.charAt(0).toUpperCase() + pokeName.slice(1),
                                        nivel: 1,
                                        tipos: bases.tipos || [],
                                        multiplicadorQualidade: 1.0,
                                        hp: null, atk: null, def: null,
                                        spa: null, spd: null, vel: null,
                                        ivAtual: null, ivMaximo: 192,
                                        poder: null, qualidade: null,
                                        ativo: false,
                                        _manual: true
                                    };
                                    renderizarFormularioAnalise(pokemonManual, bases);
                                } catch (err) {
                                    const area2 = document.getElementById("analysis-content");
                                    if (area2) area2.innerHTML = `<div class="warning"><strong>Pokémon não encontrado</strong><span>${escapeHtml(pokeName)}</span></div>`;
                                }
                            });
                        });
                    } catch (err) {
                        searchResults.innerHTML = `<div style="padding: 10px 12px; color: #f87171; font-size: 11px;">Erro ao buscar lista de Pokémon.</div>`;
                    }
                }, 300);
            });

            searchInput.addEventListener("keydown", e => {
                if (e.key === "Escape") {
                    searchResults.style.display = "none";
                    searchResults.innerHTML = "";
                }
            });

            document.addEventListener("click", e => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.style.display = "none";
                }
            });
        }

        if (searchClear) {
            searchClear.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                if (searchResults) {
                    searchResults.style.display = "none";
                    searchResults.innerHTML = "";
                }
            });
        }
    }

    function trocarAba(nome) {
        if (nome === "moves") {
            alternarPainelMoves();
            return;
        }

        if (
            nome !== "leitor" &&
            nome !== "analise" &&
            nome !== "comparacao"
        ) {
            return;
        }

        abaAtual = nome;

        document
            .querySelectorAll(".tab-button")
            .forEach(botao => {
                if (botao.dataset.tab !== "moves") {
                    botao.classList.toggle(
                        "active",
                        botao.dataset.tab === nome
                    );
                }
            });

        document
            .querySelectorAll(".tab-content")
            .forEach(conteudo => {
                conteudo.classList.remove("active");
            });

        document
            .getElementById(`tab-${nome}`)
            ?.classList.add("active");

        const painel =
            document.getElementById(CONFIG.panelId);

        if (painel) {
            limitarPainelNaTela(painel);
            salvarEstadoPainel(painel);
        }

        if (nome === "comparacao") {
            atualizarPainelComparacao();
        }
    }

    function adicionarAoHistorico(pokemon) {
        if (!pokemon) return;
        const index = historicoPokemon.findIndex(p =>
            normalizarNomePokemon(p.nome) === normalizarNomePokemon(pokemon.nome) &&
            p.nivel === pokemon.nivel &&
            p.poder === pokemon.poder
        );
        if (index !== -1) {
            historicoPokemon.splice(index, 1);
        }
        historicoPokemon.unshift({ ...pokemon });
        if (historicoPokemon.length > 10) {
            historicoPokemon.pop();
        }
        try {
            localStorage.setItem("pokemon-reader-history", JSON.stringify(historicoPokemon));
        } catch (e) { }
    }

    function carregarPokemonDoHistorico(pokemon) {
        ultimoPokemon = pokemon;
        ultimoTexto = `HIST-${pokemon.nome}-${pokemon.nivel}-${pokemon.poder}`;
        atualizarPainelLeitor(pokemon);
        carregarAnalise(pokemon);
        atualizarPainelMoves();
        atualizarPosicaoPainelMoves();
        atualizarPainelComparacao();
    }

    function atualizarPainelLeitor(pokemon) {
        adicionarAoHistorico(pokemon);

        const conteudo =
            document.getElementById("content");

        const painel =
            document.getElementById(CONFIG.panelId);

        if (!conteudo || !painel) return;

        painel.style.display = "flex";

        const ivPercentual =
            pokemon.ivAtual !== null &&
                pokemon.ivMaximo
                ? (
                    (
                        pokemon.ivAtual /
                        pokemon.ivMaximo
                    ) * 100
                ).toFixed(1)
                : null;

        const nomeNormalizado = normalizarNomePokemon(pokemon.nome);
        const cacheInfo = apiCache[nomeNormalizado];
        let htmlSprite = "";

        if (cacheInfo && cacheInfo.id) {
            const shiny = isShiny(pokemon);
            const urls = obterUrlsSprite(cacheInfo.id, shiny);
            htmlSprite = `<img class="sprite" src="${urls.anim}" data-fallback="${urls.still}" onerror="${SPRITE_ONERROR}" alt="${escapeHtml(pokemon.nome)}">`;
        } else {
            htmlSprite = `<div class="loading-ball-mini" style="width: 24px; height: 24px; border: 1.5px solid #171717; border-radius: 50%; background: linear-gradient(to bottom, #f34848 0%, #f34848 43%, #151515 43%, #151515 57%, #f7f7f7 57%); animation: spin 1.1s linear infinite; position: relative;"><span style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; border: 1px solid #171717; border-radius: 50%; background: #fff; transform: translate(-50%, -50%);"></span></div>`;

            buscarAtributosBase(pokemon.nome).then(() => {
                if (ultimoPokemon && normalizarNomePokemon(ultimoPokemon.nome) === nomeNormalizado) {
                    atualizarPainelLeitor(ultimoPokemon);
                }
            }).catch(() => { });
        }

        const chipsTipos = pokemon.tipos
            .map(tipo => {
                const eng = obterChaveTipo(tipo);
                const cor = (eng && TYPE_SYSTEM.COLORS[eng]) || "#7650a9";
                return `
                <span class="type-chip" style="background:${cor}">
                    ${escapeHtml(tipo)}
                </span>
            `;
            })
            .join("");

        const chipAtivo = pokemon.ativo
            ? `
                <span
                    class="type-chip active-chip"
                >
                    ⚔ Ativo
                </span>
            `
            : "";

        const maxStatValue = Math.max(
            pokemon.hp || 0,
            pokemon.atk || 0,
            pokemon.def || 0,
            pokemon.spa || 0,
            pokemon.spd || 0,
            pokemon.vel || 0,
            1
        );

        function renderCardStat(label, val, cor) {
            if (val === null || val === undefined) return "";
            const percent = Math.max(4, Math.min(100, (val / maxStatValue) * 100));
            return `
                <div class="display-stat-card" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-top: 3px solid ${cor};
                    border-radius: 8px;
                    padding: 5px 4px;
                    gap: 2px;
                    box-sizing: border-box;
                ">
                    <span style="color: ${cor}; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
                    <strong style="color: #fff; font-size: 12px; font-weight: bold; line-height: 1.15;">${val}</strong>
                    <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.06); border-radius: 9px; overflow: hidden; margin-top: 2px;">
                        <div style="height: 100%; background: ${cor}; width: ${percent}%;"></div>
                    </div>
                </div>
            `;
        }

        const htmlQualidade = pokemon.qualidade ? `
            <div style="background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); border: 1px solid rgba(241,198,68,0.15); border-radius: 8px; padding: 6px 9px; display: flex; flex-direction: column; gap: 2px;">
                <span style="color: #ca9e00; font-size: 7px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">Qualidade</span>
                <strong style="color: #f1c644; font-size: 11px;">${escapeHtml(pokemon.qualidade)}</strong>
            </div>
        ` : "";

        const htmlIV = pokemon.ivAtual !== null ? `
            <div style="background: linear-gradient(135deg, #161b22 0%, #0d1117 100%); border: 1px solid rgba(85,230,211,0.15); border-radius: 8px; padding: 6px 9px; display: flex; flex-direction: column; gap: 2px;">
                <span style="color: #00bcd4; font-size: 7px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">IV Total</span>
                <strong style="color: #55e6d3; font-size: 11px;">${pokemon.ivAtual}/${pokemon.ivMaximo} (${ivPercentual}%)</strong>
            </div>
        ` : "";

        conteudo.innerHTML = `
            <div class="pokemon-card">
                <div class="pokemon-top" style="display: flex; gap: 10px; align-items: center; padding: 8px 10px;">
                    <div class="sprite-container" style="flex: 0 0 50px; height: 50px; display: grid; place-items: center; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.2) 100%); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
                        ${htmlSprite}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="name-line" style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                            <div class="name" style="font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; font-weight: bold; color: #fff;">
                                ${escapeHtml(pokemon.nome)}
                            </div>

                            <div class="level-badge" style="background: rgba(202,48,53,0.15); border: 1px solid rgba(202,48,53,0.3); border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #ff767b; white-space: nowrap;">
                                Nv ${escapeHtml(pokemon.nivel ?? "-")}
                            </div>
                        </div>

                        <div class="types" style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 4px;">
                            <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                                ${chipsTipos}
                                ${chipAtivo}
                            </div>
                            <button id="btn-historico" type="button" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #8795aa; cursor: pointer; font-size: 11px; flex: 0 0 auto; padding: 1px 5px; border-radius: 4px; line-height: 1.4; outline: none; transition: all 0.15s ease;" onmouseenter="this.style.background='rgba(255,255,255,0.08)';" onmouseleave="this.style.background='rgba(255,255,255,0.04)';" title="Histórico de Análises">
                                🕒
                            </button>
                        </div>
                    </div>
                </div>

                <div class="info-area" style="padding: 0 10px 10px; display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                        ${htmlQualidade}
                        ${htmlIV}
                    </div>

                    <div class="stats-display-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 2px;">
                        ${renderCardStat("HP", pokemon.hp, "#4caf50")}
                        ${renderCardStat("Atk", pokemon.atk, "#ff9800")}
                        ${renderCardStat("Def", pokemon.def, "#ffeb3b")}
                        ${renderCardStat("SpA", pokemon.spa, "#2196f3")}
                        ${renderCardStat("SpD", pokemon.spd, "#00bcd4")}
                        ${renderCardStat("Vel", pokemon.vel, "#e91e63")}
                    </div>

                    <div class="power" style="margin-top: 4px;">
                        <span>⚡ Poder total</span>

                        <strong>
                            ${formatarNumero(
            pokemon.poder
        )}
                        </strong>
                    </div>
                    ${obterEfetividadeHtml(pokemon)}
                </div>
            </div>
        `;

        limitarPainelNaTela(painel);
        atualizarBotoesFixar();

        // Configuração de Event Listeners do histórico
        const btnHist = document.getElementById("btn-historico");
        if (btnHist) {
            btnHist.addEventListener("click", (e) => {
                e.stopPropagation();
                let popup = document.getElementById("historico-popup");
                if (popup) {
                    popup.remove();
                    return;
                }

                popup = document.createElement("div");
                popup.id = "historico-popup";
                popup.style.position = "absolute";
                popup.style.left = "12px";
                popup.style.right = "12px";
                popup.style.top = "105px";
                popup.style.background = "#101827";
                popup.style.border = "1px solid rgba(255,255,255,0.12)";
                popup.style.borderRadius = "8px";
                popup.style.zIndex = "1000";
                popup.style.boxShadow = "0 6px 20px rgba(0,0,0,0.6)";
                popup.style.padding = "6px 0";

                const items = historicoPokemon.filter(p =>
                    !(normalizarNomePokemon(p.nome) === normalizarNomePokemon(pokemon.nome) &&
                        p.nivel === pokemon.nivel &&
                        p.poder === pokemon.poder)
                ).slice(0, 3);

                if (items.length === 0) {
                    popup.innerHTML = `<div style="padding: 10px 12px; color: #66758a; font-size: 11px; text-align: center;">Nenhum histórico disponível.</div>`;
                } else {
                    popup.innerHTML = items.map((p, idx) => {
                        const nomeNorm = normalizarNomePokemon(p.nome);
                        const cache = apiCache[nomeNorm];
                        const spriteUrl = cache && cache.id
                            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${cache.id}.png`
                            : "";
                        const ivPercent = p.ivAtual !== null && p.ivMaximo
                            ? `${((p.ivAtual / p.ivMaximo) * 100).toFixed(1)}%`
                            : "-";

                        return `
                            <div class="historico-item" data-idx="${idx}" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-bottom: ${idx < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'}; transition: background 0.1s;">
                                ${spriteUrl ? `<img src="${spriteUrl}" style="width:24px;height:24px;object-fit:contain;image-rendering:pixelated;">` : `<span style="font-size:14px;width:24px;text-align:center;">◉</span>`}
                                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                                    <strong style="color: #fff; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p.nome)}</strong>
                                    <span style="color: #66758a; font-size: 8px;">Nv ${p.nivel} • IV: ${p.ivAtual !== null ? p.ivAtual : '-'}/${p.ivMaximo || 192} (${ivPercent})</span>
                                </div>
                                <span style="color: #66758a; font-size: 9px; margin-left: auto;">›</span>
                            </div>
                        `;
                    }).join("");

                    popup.querySelectorAll(".historico-item").forEach(itemEl => {
                        itemEl.addEventListener("mouseenter", () => { itemEl.style.background = "rgba(255,255,255,0.06)"; });
                        itemEl.addEventListener("mouseleave", () => { itemEl.style.background = ""; });
                        itemEl.addEventListener("click", () => {
                            const indexInFilter = parseInt(itemEl.dataset.idx);
                            const selected = items[indexInFilter];
                            carregarPokemonDoHistorico(selected);
                            popup.remove();
                        });
                    });
                }

                const tabLeitor = document.getElementById("tab-leitor");
                if (tabLeitor) {
                    tabLeitor.appendChild(popup);
                }
            });

            document.addEventListener("click", (e) => {
                const popup = document.getElementById("historico-popup");
                if (popup && !popup.contains(e.target) && !btnHist.contains(e.target)) {
                    popup.remove();
                }
            });
        }
    }

    function obterIVsEstimados(pokemon, bases) {
        if (!pokemon || !bases) return null;

        const ivs = {};
        const nivel = pokemon.nivel;
        const qualidade = pokemon.multiplicadorQualidade ?? 1;

        for (const chave of Object.keys(CONFIG.expoentes)) {
            const atual = pokemon[chave];
            const baseVal = bases[chave];

            if (atual === null || atual === undefined || baseVal === null || baseVal === undefined) {
                ivs[chave] = 0;
            } else {
                ivs[chave] = estimarIVIndividual({
                    atributoAtual: atual,
                    atributoBase: baseVal,
                    nivel,
                    qualidade,
                    expoente: CONFIG.expoentes[chave]
                });
            }
        }
        return ivs;
    }

    function obterSomaIV(ivs) {
        if (!ivs) return 0;
        return arredondar(
            Object.values(ivs).reduce((soma, valor) => soma + (valor || 0), 0),
            1
        );
    }

    function fixarPokemon(pokemon) {
        if (!pokemon) return;
        pokemonFixado = { ...pokemon };
        localStorage.setItem("pokemon-fixed", JSON.stringify(pokemonFixado));
        atualizarBotoesFixar();
        atualizarPainelComparacao();
    }

    function desfixarPokemon() {
        pokemonFixado = null;
        localStorage.removeItem("pokemon-fixed");
        atualizarBotoesFixar();
        atualizarPainelComparacao();
    }

    function atualizarBotoesFixar() {
        const btnFix = document.getElementById("fix");
        if (!btnFix || !ultimoPokemon) return;

        const isFixed = pokemonFixado &&
            normalizarNomePokemon(pokemonFixado.nome) === normalizarNomePokemon(ultimoPokemon.nome) &&
            pokemonFixado.nivel === ultimoPokemon.nivel &&
            pokemonFixado.poder === ultimoPokemon.poder;

        if (isFixed) {
            btnFix.innerHTML = "📌 Desfixar";
            btnFix.style.background = "linear-gradient(#f4d65e, #cba52a)";
            btnFix.style.color = "#171717";
            btnFix.style.borderColor = "#ffe984";
        } else {
            btnFix.innerHTML = "📌 Fixar";
            btnFix.style.background = "linear-gradient(#4d5a75, #2e3b52)";
            btnFix.style.color = "#fff";
            btnFix.style.borderColor = "#5c6c8c";
        }
    }

    function renderLinhaComparacao(label, cor, valFix, valAti) {
        let diffIcon = "=";
        let diffColor = "#8795aa";

        const numFix = Number(String(valFix ?? 0).replace(".", "").replace(",", "."));
        const numAti = Number(String(valAti ?? 0).replace(".", "").replace(",", "."));

        if (numAti > numFix) {
            diffIcon = "▲";
            diffColor = "#4caf50";
        } else if (numAti < numFix) {
            diffIcon = "▼";
            diffColor = "#e91e63";
        }

        return `
            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 0.4fr; align-items: center; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 11px;">
                <span style="color: ${cor}; font-weight: bold;">${label}</span>
                <span style="color: #cad6e7; text-align: center;">${valFix}</span>
                <span style="color: #fff; text-align: center; font-weight: bold;">${valAti}</span>
                <span style="color: ${diffColor}; font-weight: bold; text-align: right; font-size: 12px;">${diffIcon}</span>
            </div>
        `;
    }

    function atualizarPainelComparacao() {
        const area = document.getElementById("comparison-content");
        if (!area) return;

        if (!pokemonFixado) {
            area.innerHTML = `
                <div style="padding: 24px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                    <span style="font-size: 24px;">⚖</span>
                    <strong style="color: #cad6e7; font-size: 13px;">Nenhum Pokémon fixado</strong>
                    <span style="color: #6d7f96; font-size: 11px; line-height: 1.4; max-width: 220px;">
                        Vá na aba principal e clique em <strong>📌 Fixar</strong> para escolher o Pokémon base da comparação.
                    </span>
                </div>
            `;
            return;
        }

        const active = ultimoPokemon || pokemonFixado;

        const basesFix = apiCache[normalizarNomePokemon(pokemonFixado.nome)] || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, vel: 0 };
        const basesAct = apiCache[normalizarNomePokemon(active.nome)] || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, vel: 0 };

        const ivsFix = obterIVsEstimados(pokemonFixado, basesFix) || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, vel: 0 };
        const ivsAct = obterIVsEstimados(active, basesAct) || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, vel: 0 };

        const sumFix = obterSomaIV(ivsFix);
        const sumAct = obterSomaIV(ivsAct);

        const qualFix = pokemonFixado.multiplicadorQualidade ?? 1;
        const qualAct = active.multiplicadorQualidade ?? 1;

        const powerFix = pokemonFixado.poder ?? 0;
        const powerAct = active.poder ?? 0;

        area.innerHTML = `
            <div class="comparison-wrapper" style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px;">
                    <div style="background: linear-gradient(135deg, #18202d 0%, #0e1622 100%); border: 1px solid rgba(241,198,68,0.15); border-radius: 8px; padding: 8px; text-align: center; position: relative;">
                        <span style="position: absolute; top: 4px; left: 6px; color: #ca9e00; font-size: 6px; font-weight: bold; text-transform: uppercase;">📌 Fixado</span>
                        <strong style="color: #fff; font-size: 12px; display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(pokemonFixado.nome)}</strong>
                        <span style="color: #8795aa; font-size: 9px; display: block; margin-top: 2px;">Nv ${pokemonFixado.nivel ?? "-"}</span>
                    </div>

                    <div style="background: linear-gradient(135deg, #18202d 0%, #0e1622 100%); border: 1px solid rgba(85,230,211,0.15); border-radius: 8px; padding: 8px; text-align: center; position: relative;">
                        <span style="position: absolute; top: 4px; left: 6px; color: #00bcd4; font-size: 6px; font-weight: bold; text-transform: uppercase;">⚔ Ativo</span>
                        <strong style="color: #fff; font-size: 12px; display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(active.nome)}</strong>
                        <span style="color: #8795aa; font-size: 9px; display: block; margin-top: 2px;">Nv ${active.nivel ?? "-"}</span>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 0.4fr; background: rgba(0,0,0,0.2); padding: 6px 12px; font-size: 8px; color: #8795aa; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <span>Status / IV</span>
                        <span style="text-align: center;">Fixado</span>
                        <span style="text-align: center;">Ativo</span>
                        <span style="text-align: right;">Diff</span>
                    </div>

                    ${renderLinhaComparacao("HP", "#4caf50", ivsFix.hp, ivsAct.hp)}
                    ${renderLinhaComparacao("Atk", "#ff9800", ivsFix.atk, ivsAct.atk)}
                    ${renderLinhaComparacao("Def", "#ffeb3b", ivsFix.def, ivsAct.def)}
                    ${renderLinhaComparacao("SpA", "#2196f3", ivsFix.spa, ivsAct.spa)}
                    ${renderLinhaComparacao("SpD", "#00bcd4", ivsFix.spd, ivsAct.spd)}
                    ${renderLinhaComparacao("Spe", "#e91e63", ivsFix.vel, ivsAct.vel)}
                    
                    ${renderLinhaComparacao("Σ IV", "#cad6e7", sumFix, sumAct)}
                    ${renderLinhaComparacao("Qualidade", "#f1c644", formatarDecimal(qualFix, 2), formatarDecimal(qualAct, 2))}
                    ${renderLinhaComparacao("Poder total", "#ffb35c", formatarNumero(powerFix), formatarNumero(powerAct))}
                </div>

                ${(() => {
                const order = ["hp", "atk", "def", "spa", "spd", "vel"];
                const basesFixArr = order.map(k => basesFix[k]);
                const ivsFixArr = order.map(k => ivsFix[k]);
                const potFix = calcularPotencialExemplar(basesFixArr, ivsFixArr, qualFix, CONFIG.maxIVIndividual);

                const basesActArr = order.map(k => basesAct[k]);
                const ivsActArr = order.map(k => ivsAct[k]);
                const potAct = calcularPotencialExemplar(basesActArr, ivsActArr, qualAct, CONFIG.maxIVIndividual);
                const classFix = classificarPotencial(potFix);
                const classAct = classificarPotencial(potAct);
                const diffPot = arredondar(potAct - potFix, 1);
                const diffIcon = diffPot > 0 ? "▲" : diffPot < 0 ? "▼" : "=";
                const diffColor = diffPot > 0 ? "#4caf50" : diffPot < 0 ? "#e91e63" : "#8795aa";

                return `
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden;">
                            <div style="background: rgba(0,0,0,0.2); padding: 6px 12px; font-size: 8px; color: #8795aa; text-transform: uppercase; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                ⭐ Potencial do exemplar
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,0.04);">
                                <div style="background: #0d1420; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                                    <span style="color: #ca9e00; font-size: 7px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">📌 Fixado</span>
                                    <strong style="color: ${classFix.cor}; font-size: 22px; line-height: 1;">${formatarDecimal(potFix, 1)}%</strong>
                                    <span style="color: ${classFix.cor}; font-size: 9px; font-weight: bold; padding: 2px 7px; background: ${classFix.cor}18; border: 1px solid ${classFix.cor}33; border-radius: 99px;">${classFix.texto}</span>
                                </div>
                                <div style="background: #0d1420; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative;">
                                    <span style="color: #00bcd4; font-size: 7px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">⚔ Ativo</span>
                                    <strong style="color: ${classAct.cor}; font-size: 22px; line-height: 1;">${formatarDecimal(potAct, 1)}%</strong>
                                    <span style="color: ${classAct.cor}; font-size: 9px; font-weight: bold; padding: 2px 7px; background: ${classAct.cor}18; border: 1px solid ${classAct.cor}33; border-radius: 99px;">${classAct.texto}</span>
                                    <span style="position: absolute; top: 8px; right: 10px; color: ${diffColor}; font-weight: bold; font-size: 13px;">${diffIcon}</span>
                                </div>
                            </div>
                            <div style="padding: 8px 12px; background: rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between;">
                                <span style="color: #8795aa; font-size: 9px;">Diferença de potencial</span>
                                <span style="color: ${diffColor}; font-weight: bold; font-size: 11px;">${diffPot > 0 ? "+" : ""}${formatarDecimal(diffPot, 1)}%</span>
                            </div>
                        </div>
                    `;
            })()}
            </div>
        `;
    }

    async function buscarAtributosBase(nome) {
        const nomeNormalizado =
            normalizarNomePokemon(nome);

        if (!nomeNormalizado) {
            throw new Error(
                "Nome do Pokémon inválido."
            );
        }

        if (apiCache[nomeNormalizado]) {
            return apiCache[nomeNormalizado];
        }

        const nomeBrutoLimpo = String(nome || "").toLowerCase().trim();
        if (apiCache[nomeBrutoLimpo]) {
            return apiCache[nomeBrutoLimpo];
        }

        let resposta = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(nomeNormalizado)}`
        );

        // Fallback: Se o nome normalizado falhar (404) e tiver hífen, tenta buscar pelo primeiro termo (nome base da espécie)
        if (!resposta.ok && nomeNormalizado.includes("-")) {
            const primeiroNome = nomeNormalizado.split("-")[0];
            if (primeiroNome && primeiroNome !== nomeNormalizado) {
                resposta = await fetch(
                    `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(primeiroNome)}`
                );
            }
        }

        if (!resposta.ok) {
            throw new Error(
                `Pokémon não encontrado: ${nome}`
            );
        }

        const dados = await resposta.json();
        const mapa = {};

        for (const item of dados.stats || []) {
            mapa[item.stat.name] = item.base_stat;
        }

        const TRANSLATE_TYPES = {
            normal: "Normal",
            fighting: "Lutador",
            flying: "Voador",
            poison: "Veneno",
            ground: "Terra",
            rock: "Pedra",
            bug: "Inseto",
            ghost: "Fantasma",
            steel: "Aço",
            fire: "Fogo",
            water: "Água",
            grass: "Planta",
            electric: "Elétrico",
            psychic: "Psíquico",
            ice: "Gelo",
            dragon: "Dragão",
            dark: "Sombrio",
            fairy: "Fada"
        };

        const tiposEn = (dados.types || []).map(t => t.type.name);
        const tiposPt = tiposEn.map(t => TRANSLATE_TYPES[t] || (t.charAt(0).toUpperCase() + t.slice(1)));

        const info = {
            id: dados.id,
            hp: mapa.hp ?? null,
            atk: mapa.attack ?? null,
            def: mapa.defense ?? null,
            spa: mapa["special-attack"] ?? null,
            spd: mapa["special-defense"] ?? null,
            vel: mapa.speed ?? null,
            tipos: tiposPt
        };

        apiCache[nomeNormalizado] = info;
        salvarCache();

        return info;
    }

    async function carregarAnalise(pokemon) {
        const area =
            document.getElementById(
                "analysis-content"
            );

        if (!area) return;

        area.innerHTML = `
            <div class="loading">
                <div class="loading-ball">
                    <span></span>
                </div>

                <strong>
                    Preparando análise
                </strong>

                <span>
                    Buscando os atributos-base de
                    ${escapeHtml(pokemon.nome)}...
                </span>
            </div>
        `;

        const idConsulta =
            `${pokemon.nome}-${Date.now()}`;

        consultaEmAndamento = idConsulta;

        try {
            const bases =
                await buscarAtributosBase(
                    pokemon.nome
                );

            if (
                consultaEmAndamento !== idConsulta
            ) {
                return;
            }

            renderizarFormularioAnalise(
                pokemon,
                bases
            );
            atualizarPainelComparacao();
        } catch (erro) {
            console.warn(
                "[Poké Leitor] Falha ao buscar atributos-base.",
                erro
            );

            if (
                consultaEmAndamento !== idConsulta
            ) {
                return;
            }

            renderizarFormularioAnalise(
                pokemon,
                {
                    hp: 0,
                    atk: 0,
                    def: 0,
                    spa: 0,
                    spd: 0,
                    vel: 0
                },
                erro.message
            );
            atualizarPainelComparacao();
        }
    }

    function renderizarFormularioAnalise(
        pokemon,
        bases,
        aviso = ""
    ) {
        const area =
            document.getElementById(
                "analysis-content"
            );

        if (!area) return;

        // Registra se é um pokémon de análise manual (sem hover)
        if (pokemon._manual) {
            pokemonManualAtual = pokemon;
        } else {
            pokemonManualAtual = null;
        }

        const tipos = pokemon.tipos
            .map(tipo => `
                <span>${escapeHtml(tipo)}</span>
            `)
            .join("");

        const nomeNormalizado = normalizarNomePokemon(pokemon.nome);
        const cacheInfo = apiCache[nomeNormalizado];
        let htmlSpriteAnalysis = "<span>IV</span>";

        if (cacheInfo && cacheInfo.id) {
            const shiny = isShiny(pokemon);
            const urls = obterUrlsSprite(cacheInfo.id, shiny);
            htmlSpriteAnalysis = `<img class="sprite" src="${urls.anim}" data-fallback="${urls.still}" onerror="${SPRITE_ONERROR}" alt="${escapeHtml(pokemon.nome)}">`;
        }

        area.innerHTML = `
            <div class="analysis-hero">
                <div class="analysis-hero-pattern"></div>

                <div class="analysis-pokemon-icon" style="overflow: hidden; display: grid; place-items: center;">
                    ${htmlSpriteAnalysis}
                </div>

                <div class="analysis-identity">
                    <small>ANALISANDO</small>

                    <strong>
                        ${escapeHtml(pokemon.nome)}
                    </strong>

                    <div class="analysis-types">
                        ${tipos}
                    </div>

                    <div class="analysis-results-mini" id="analysis-results-mini" style="display: none; align-items: center; gap: 4px; margin-top: 6px; flex-wrap: nowrap;">
                        <span class="mini-badge quality" style="padding: 2px 4px; background: rgba(241,198,68,0.08); border: 1px solid rgba(241,198,68,0.25); border-radius: 4px; font-size: 8px; font-weight: bold; color: #f1c644; display: flex; align-items: center; gap: 2px; white-space: nowrap;">
                            Q: <span id="mini-val-quality">-</span>
                        </span>
                        <span class="mini-badge iv" style="padding: 2px 4px; background: rgba(85,230,211,0.08); border: 1px solid rgba(85,230,211,0.25); border-radius: 4px; font-size: 8px; font-weight: bold; color: #55e6d3; display: flex; align-items: center; gap: 2px; white-space: nowrap;">
                            IV: <span id="mini-val-iv">-</span>
                        </span>
                        <span class="mini-badge power" style="padding: 2px 4px; background: rgba(255,179,92,0.08); border: 1px solid rgba(255,179,92,0.25); border-radius: 4px; font-size: 8px; font-weight: bold; color: #ffb35c; display: flex; align-items: center; gap: 2px; white-space: nowrap;">
                            ⚡ <span id="mini-val-power">-</span>
                        </span>
                    </div>
                </div>

                <div class="analysis-level">
                    <small>NÍVEL</small>
                    <b id="hero-nivel-val">${escapeHtml(String(pokemon.nivel ?? "-"))}</b>
                </div>
            </div>

            ${pokemon.nivel && pokemon.nivel < 15
                ? `
                        <div class="warning level-warning" style="margin: 8px 12px; padding: 8px 10px; background: rgba(243, 154, 75, 0.15); border: 1px solid rgba(243, 154, 75, 0.4); border-radius: 8px; color: #ffd77d; font-size: 10px; display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 14px;">⚠️</span>
                            <div>
                                <strong style="color: #ffd77d; font-size: 10px;">Atenção: Nível abaixo do Nv. 15</strong>
                                <span style="display: block; font-size: 9px; color: #e2b069; margin-top: 1px;">Para o cálculo de IV ser preciso, o Pokémon precisa estar no Nv. 15 ou superior.</span>
                            </div>
                        </div>
                    `
                : ""
            }

            ${aviso
                ? `
                        <div class="warning">
                            <strong>⚠ Dados-base não encontrados</strong>

                            <span>
                                Preencha manualmente os
                                atributos-base abaixo.
                            </span>
                        </div>
                    `
                : ""
            }

            <div class="analysis-toolbar">
                <div>
                    <strong>Dados do cálculo</strong>

                    <span>
                        Confira ou ajuste os valores
                    </span>
                </div>

                <button
                    id="toggle-form"
                    type="button"
                >
                    ${formularioRecolhido
                ? "Mostrar"
                : "Recolher"
            }
                </button>
            </div>

            <div
                id="analysis-form"
                class="${formularioRecolhido
                ? "form-collapsed"
                : ""
            }"
            >
                <div class="primary-fields">
                    <label class="primary-field">
                        <span>
                            <i>◆</i>
                            Qualidade
                        </span>

                        <div class="input-with-suffix">
                            <input
                                id="quality-input"
                                type="number"
                                min="1"
                                max="3"
                                step="0.01"
                                value="${pokemon.multiplicadorQualidade ?? ""}"
                            >

                            <b>×</b>
                        </div>
                    </label>

                    <label class="primary-field">
                        <span>
                            <i>★</i>
                            Nível
                        </span>

                        <div class="input-with-suffix">
                            <input
                                id="level-input"
                                type="number"
                                min="1"
                                max="9999"
                                step="1"
                                value="${pokemon.nivel ?? ""}"
                            >

                            <b>Nv</b>
                        </div>
                    </label>

                </div>

                <div class="data-section">
                    <div class="data-section-heading" style="margin-bottom: 10px;">
                        <div class="section-icon" style="background: linear-gradient(135deg, #ffd84f 0%, #ca9e00 100%); color: #000; font-weight: bold; font-size: 10px;">⚡</div>

                        <div>
                            <strong>Atributos (Stats)</strong>

                            <span>
                                Valores atuais e valores-base (editáveis)
                            </span>
                        </div>
                    </div>

                    <div class="analysis-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        ${criarCardStatAnalise("hp", bases.hp, pokemon.hp, "#4caf50")}
                        ${criarCardStatAnalise("atk", bases.atk, pokemon.atk, "#ff9800")}
                        ${criarCardStatAnalise("def", bases.def, pokemon.def, "#ffeb3b")}
                        ${criarCardStatAnalise("spa", bases.spa, pokemon.spa, "#2196f3")}
                        ${criarCardStatAnalise("spd", bases.spd, pokemon.spd, "#00bcd4")}
                        ${criarCardStatAnalise("vel", bases.vel, pokemon.vel, "#e91e63")}
                    </div>
                </div>
            </div>

            <div id="iv-results"></div>
        `;

        document
            .getElementById("toggle-form")
            .addEventListener("click", () => {
                formularioRecolhido =
                    !formularioRecolhido;

                const formulario =
                    document.getElementById(
                        "analysis-form"
                    );

                const botao =
                    document.getElementById(
                        "toggle-form"
                    );

                formulario?.classList.toggle(
                    "form-collapsed",
                    formularioRecolhido
                );

                if (botao) {
                    botao.textContent =
                        formularioRecolhido
                            ? "Mostrar"
                            : "Recolher";
                }

                const painel =
                    document.getElementById(
                        CONFIG.panelId
                    );

                if (painel) {
                    limitarPainelNaTela(painel);
                    salvarEstadoPainel(painel);
                }
            });

        area
            .querySelectorAll("input")
            .forEach(input => {
                input.addEventListener(
                    "input",
                    calcularPelosInputs
                );
            });

        // Atualiza o box de nível no hero card em tempo real
        const levelInp = document.getElementById("level-input");
        const heroNivelEl = document.getElementById("hero-nivel-val");
        if (levelInp && heroNivelEl) {
            levelInp.addEventListener("input", () => {
                heroNivelEl.textContent = levelInp.value || "-";
            });
        }

        function criarCardStatAnalise(chave, baseVal, currentVal, cor) {
            const idBase = `base-${chave}`;
            const idCurrent = `current-${chave}`;
            const labelText = NOMES_STATS_CURTOS[chave] || chave.toUpperCase();

            return `
            <div class="analysis-stat-card" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                background: linear-gradient(135deg, #151d2a 0%, #0d141e 100%);
                border: 1px solid rgba(255,255,255,0.06);
                border-top: 3px solid ${cor};
                border-radius: 8px;
                padding: 6px;
                box-sizing: border-box;
                gap: 4px;
            ">
                <span style="color: ${cor}; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${labelText}</span>
                
                <input
                    id="${idCurrent}"
                    type="number"
                    min="0"
                    max="9999"
                    step="1"
                    value="${currentVal ?? ""}"
                    style="
                        width: 100%;
                        background: transparent;
                        border: none;
                        color: #fff;
                        font-size: 14px;
                        font-weight: bold;
                        text-align: center;
                        padding: 0;
                        margin: 0;
                        outline: none;
                        -moz-appearance: textfield;
                    "
                    class="flat-stat-input"
                >
                
                <div style="width: 100%; border-top: 1px dashed rgba(255,255,255,0.12); margin: 2px 0;"></div>
                
                <div style="display: flex; align-items: center; justify-content: center; gap: 3px; font-size: 10px; color: #8795aa; width: 100%;">
                    <span>base</span>
                    <input
                        id="${idBase}"
                        type="number"
                        min="0"
                        max="999"
                        step="1"
                        value="${baseVal ?? ""}"
                        style="
                            width: 30px;
                            background: transparent;
                            border: none;
                            color: #edf4ff;
                            font-size: 10px;
                            font-weight: bold;
                            text-align: left;
                            padding: 0;
                            margin: 0;
                            outline: none;
                            -moz-appearance: textfield;
                        "
                        class="flat-stat-input"
                    >
                </div>
            </div>
        `;
        }

        calcularPelosInputs();
    }

    function inputBase(chave, valor) {
        return criarInputStat(
            chave,
            valor,
            `base-${chave}`
        );
    }

    function inputAtual(chave, valor) {
        return criarInputStat(
            chave,
            valor,
            `current-${chave}`
        );
    }

    function criarInputStat(chave, valor, id) {
        return `
            <label
                class="stat-input-card"
                data-stat="${chave}"
            >
                <div class="stat-input-label">
                    <i>
                        ${ICONES_STATS[chave]}
                    </i>

                    <span>
                        ${NOMES_STATS_CURTOS[chave]}
                    </span>
                </div>

                <input
                    id="${id}"
                    type="number"
                    min="0"
                    max="999999"
                    step="1"
                    value="${valor ?? ""}"
                >
            </label>
        `;
    }

    function lerValorInput(id) {
        const campo =
            document.getElementById(id);

        if (!campo) return null;

        const valor =
            Number(
                String(campo.value)
                    .replace(",", ".")
            );

        return Number.isFinite(valor)
            ? valor
            : null;
    }

    function estimarIVIndividual({
        atributoAtual,
        atributoBase,
        nivel,
        qualidade,
        expoente
    }) {
        if (
            !Number.isFinite(atributoAtual) ||
            !Number.isFinite(atributoBase) ||
            !Number.isFinite(nivel) ||
            !Number.isFinite(qualidade) ||
            nivel <= 0 ||
            qualidade <= 0
        ) {
            return 0;
        }

        const fator = (nivel / 100) * Math.pow(qualidade, expoente);

        if (!Number.isFinite(fator) || fator <= 0) {
            return 0;
        }

        const ivFloat = (((atributoAtual / fator) - atributoBase) / 2);
        return limitar(ivFloat, 0, CONFIG.maxIVIndividual);
    }

    function calcularStat({
        base,
        iv,
        nivel,
        qualidade,
        expoente
    }) {
        return Math.round(
            (base + 2 * iv) *
            (nivel / 100) *
            Math.pow(qualidade, expoente)
        );
    }

    function calcularPoderEstimado({
        bases,
        ivs,
        nivel,
        qualidade
    }) {
        let soma = 0;

        for (
            const chave of Object.keys(
                CONFIG.expoentes
            )
        ) {
            soma += calcularStat({
                base: bases[chave],
                iv: ivs[chave],
                nivel,
                qualidade,
                expoente:
                    CONFIG.expoentes[chave]
            });
        }

        return soma * qualidade;
    }

    function calcularPotencialExemplar(
        baseStats,
        individualIvs,
        qualidade,
        maxIvIndividual = 32
    ) {
        // O IV (growth) mede o quão bem o Pokémon nasceu (0 a 192 total).
        // Seguindo a regra oficial: A Qualidade NÃO deve ser multiplicada pelo IV ("Mito do Tier * IV").
        // O IV reflete puramente a perfeição dos status de crescimento (Growth %) do espécime.
        const somaIvs = (individualIvs || []).reduce((total, iv) => total + (Number(iv) || 0), 0);
        const maxIvsTotal = maxIvIndividual * 6; // 192

        return Math.min(100, Math.max(0, (somaIvs / maxIvsTotal) * 100));
    }

    function calcularPelosInputs() {
        if (!ultimoPokemon && !pokemonManualAtual) return;

        const nivel =
            lerValorInput("level-input");

        const qualidade =
            lerValorInput("quality-input");

        const bases = {};
        const atuais = {};

        for (
            const chave of Object.keys(
                CONFIG.expoentes
            )
        ) {
            bases[chave] =
                lerValorInput(
                    `base-${chave}`
                );

            atuais[chave] =
                lerValorInput(
                    `current-${chave}`
                );
        }

        const ivTotalInputVal = lerValorInput("iv-total-input");
        const ivTotalFornecido = Number.isFinite(ivTotalInputVal) && ivTotalInputVal > 0;

        const camposInvalidos =
            !Number.isFinite(nivel) ||
            !Number.isFinite(qualidade) ||
            Object.values(bases).some(valor => !Number.isFinite(valor)) ||
            Object.values(atuais).some(valor => !Number.isFinite(valor));

        const area = document.getElementById("iv-results");
        if (!area) return;

        const miniContainer = document.getElementById("analysis-results-mini");

        if (camposInvalidos) {
            if (miniContainer) miniContainer.style.display = "none";
            area.innerHTML = `
                <div class="warning">
                    <strong>Preencha todos os campos</strong>

                    <span>
                        Todos os valores de atributos atuais e base são necessários para calcular os IVs.
                    </span>
                </div>
            `;

            return;
        }

        const ivsFloats = {};
        for (const chave of Object.keys(CONFIG.expoentes)) {
            ivsFloats[chave] = estimarIVIndividual({
                atributoAtual: atuais[chave],
                atributoBase: bases[chave],
                nivel,
                qualidade,
                expoente: CONFIG.expoentes[chave]
            });
        }

        const ivs = {
            hp: arredondar(ivsFloats.hp ?? 0, 1),
            atk: arredondar(ivsFloats.atk ?? 0, 1),
            def: arredondar(ivsFloats.def ?? 0, 1),
            spa: arredondar(ivsFloats.spa ?? 0, 1),
            spd: arredondar(ivsFloats.spd ?? 0, 1),
            vel: arredondar(ivsFloats.vel ?? 0, 1)
        };

        // Soma direta dos floats brutos (sem perda de precisão)
        const somaFloatExact = Object.values(ivsFloats).reduce((s, v) => s + (v || 0), 0);

        // IV Total oficial (Math.ceil da soma dos floats)
        const ivTotal = Math.ceil(somaFloatExact);
        const percentualIV = (somaFloatExact / CONFIG.maxIVTotal) * 100;

        const ivsMaximos = {
            hp: CONFIG.maxIVIndividual,
            atk: CONFIG.maxIVIndividual,
            def: CONFIG.maxIVIndividual,
            spa: CONFIG.maxIVIndividual,
            spd: CONFIG.maxIVIndividual,
            vel: CONFIG.maxIVIndividual
        };

        const poderEstimado = calcularPoderEstimado({
            bases,
            ivs,
            nivel,
            qualidade
        });

        const baseStatsArr = [bases.hp, bases.atk, bases.def, bases.spa, bases.spd, bases.vel];
        const individualIvsArr = [ivs.hp, ivs.atk, ivs.def, ivs.spa, ivs.spd, ivs.vel];
        const potencial = calcularPotencialExemplar(baseStatsArr, individualIvsArr, qualidade, CONFIG.maxIVIndividual);

        const classificacao = classificarPotencial(potencial);
        const grausCirculo = limitar(potencial, 0, 100) * 3.6;

        const miniQuality = document.getElementById("mini-val-quality");
        const miniIv = document.getElementById("mini-val-iv");
        const miniPower = document.getElementById("mini-val-power");

        if (miniQuality && miniIv && miniPower && miniContainer) {
            miniQuality.textContent = formatarDecimal(qualidade, 2);
            miniIv.textContent = formatarDecimal(ivTotal, 1);
            miniPower.textContent = formatarNumero(Math.round(poderEstimado));
            miniContainer.style.display = "flex";
        }

        area.innerHTML = `
            <div class="result-wrapper">
                ${nivel < 15 ? `
                    <div class="warning level-warning" style="margin-bottom: 10px; padding: 8px 10px; background: rgba(243, 154, 75, 0.15); border: 1px solid rgba(243, 154, 75, 0.4); border-radius: 8px; color: #ffd77d; font-size: 10px; display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">⚠️</span>
                        <div>
                            <strong style="color: #ffd77d; font-size: 10px;">Atenção: Nível Nv. ${nivel} (&lt; 15)</strong>
                            <span style="display: block; font-size: 9px; color: #e2b069; margin-top: 1px;">Para o cálculo de IV ser preciso, o Pokémon precisa estar no Nv. 15 ou superior.</span>
                        </div>
                    </div>
                ` : ""}

                <div class="result-title">
                    <div>
                        <span class="result-eyebrow">
                            RESULTADO DA ANÁLISE
                        </span>

                        <strong>
                            Potencial do exemplar
                        </strong>
                    </div>

                    <span class="result-check">
                        ✓
                    </span>
                </div>

                <div class="result-main-card">
                    <div
                        class="score-circle"
                        style="
                            --score:${grausCirculo}deg;
                            --score-color:${classificacao.cor};
                        "
                    >
                        <div>
                            <strong>
                                ${Math.round(potencial)}%
                            </strong>

                            <span>
                                potencial
                            </span>
                        </div>
                    </div>

                    <div class="result-description">
                        <small>
                            CLASSIFICAÇÃO
                        </small>

                        <strong
                            style="
                                color:${classificacao.cor}
                            "
                        >
                            ${escapeHtml(
            classificacao.texto
        )}
                        </strong>

                        <p>
                            ${escapeHtml(
            classificacao.descricao
        )}
                        </p>
                    </div>
                </div>

                <div class="overall-progress">
                    <div>
                        <span>
                            Eficiência total de IV
                        </span>

                        <strong>
                            ${formatarDecimal(
            percentualIV,
            1
        )}%
                        </strong>
                    </div>

                    <div class="overall-track">
                        <div
                            style="
                                width:${limitar(
            percentualIV,
            0,
            100
        )}%;
                                background:${classificacao.cor};
                            "
                        ></div>
                    </div>
                </div>
            </div>

            <div class="individual-section">
                <div class="individual-heading">
                    <div>
                        <strong>IVs individuais</strong>

                        <span>
                            Desempenho por atributo
                        </span>
                    </div>

                    <span class="individual-total">
                        ${ivTotal}/192
                    </span>
                </div>

                <div class="iv-grid">
                    ${resultadoIV("hp", ivs.hp)}
                    ${resultadoIV("atk", ivs.atk)}
                    ${resultadoIV("def", ivs.def)}
                    ${resultadoIV("spa", ivs.spa)}
                    ${resultadoIV("spd", ivs.spd)}
                    ${resultadoIV("vel", ivs.vel)}
                </div>
            </div>

            <div class="analysis-note">
                <span>ⓘ</span>

                <p>
                    <strong>Fórmula Oficial:</strong> Power = (Soma dos Stats) × Qualidade.<br>
                    A Qualidade pesa mais que o IV porque reforça cada stat e multiplica o Power final. O IV (growth) representa o nascimento do Pokémon (0 a 192 total).
                </p>
            </div>
        `;

        const painel =
            document.getElementById(CONFIG.panelId);

        if (painel) {
            limitarPainelNaTela(painel);
        }
    }

    function classificarPotencial(percentual) {
        if (percentual >= 95) {
            return {
                texto: "Excepcional",
                cor: "#61f6a4",
                descricao:
                    "Um exemplar extremamente próximo do potencial máximo."
            };
        }

        if (percentual >= 85) {
            return {
                texto: "Excelente",
                cor: "#54e7d2",
                descricao:
                    "Ótimos atributos e excelente eficiência geral."
            };
        }

        if (percentual >= 72) {
            return {
                texto: "Muito bom",
                cor: "#5ed7b9",
                descricao:
                    "Um Pokémon forte e acima da média."
            };
        }

        if (percentual >= 58) {
            return {
                texto: "Bom",
                cor: "#69b7ff",
                descricao:
                    "Bom equilíbrio de atributos para uso geral."
            };
        }

        if (percentual >= 42) {
            return {
                texto: "Mediano",
                cor: "#f1c644",
                descricao:
                    "Possui atributos equilibrados, mas pode melhorar."
            };
        }

        if (percentual >= 25) {
            return {
                texto: "Abaixo da média",
                cor: "#f39a4b",
                descricao:
                    "Alguns atributos importantes estão abaixo do ideal."
            };
        }

        return {
            texto: "Fraco",
            cor: "#f05a62",
            descricao:
                "Baixo potencial geral em comparação ao máximo possível."
        };
    }

    function classificarIV(valor) {
        if (valor >= 31.5) {
            return {
                texto: "Perfeito",
                classe: "perfect"
            };
        }

        if (valor >= 27) {
            return {
                texto: "Ótimo",
                classe: "great"
            };
        }

        if (valor >= 21) {
            return {
                texto: "Bom",
                classe: "good"
            };
        }

        if (valor >= 14) {
            return {
                texto: "Médio",
                classe: "average"
            };
        }

        return {
            texto: "Baixo",
            classe: "low"
        };
    }

    function resultadoIV(chave, valor) {
        const percentual =
            limitar(
                (
                    valor /
                    CONFIG.maxIVIndividual
                ) * 100,
                0,
                100
            );

        const classificacao =
            classificarIV(valor);

        return `
            <div
                class="iv-item"
                data-stat="${chave}"
            >
                <div class="iv-item-top">
                    <div class="iv-stat-name">
                        <span>
                            ${ICONES_STATS[chave]}
                        </span>

                        <div>
                            <strong>
                                ${escapeHtml(
            NOMES_STATS_CURTOS[chave]
        )}
                            </strong>

                            <small>
                                ${escapeHtml(
            NOMES_STATS[chave]
        )}
                            </small>
                        </div>
                    </div>

                    <div class="iv-value">
                        <strong>
                            ${formatarDecimal(
            valor,
            1
        )}
                        </strong>

                        <span>/32</span>
                    </div>
                </div>

                <div class="iv-track">
                    <div
                        style="width:${percentual}%"
                    ></div>
                </div>

                <div class="iv-item-bottom">
                    <span
                        class="
                            iv-rating
                            ${classificacao.classe}
                        "
                    >
                        ${classificacao.texto}
                    </span>

                    <span>
                        ${formatarDecimal(
            percentual,
            0
        )}%
                    </span>
                </div>
            </div>
        `;
    }

    async function escreverClipboard(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            return true;
        } catch (erro) {
            const textarea =
                document.createElement("textarea");

            textarea.value = texto;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            const resultado =
                document.execCommand("copy");

            textarea.remove();

            return resultado;
        }
    }

    async function copiarTexto() {
        if (!ultimoPokemon) return;

        const p = ultimoPokemon;

        const texto = [
            `Nome: ${p.nome}`,
            `Tipos: ${p.tipos.join(", ")}`,
            `Ativo: ${p.ativo ? "Sim" : "Não"}`,
            `Nível: ${p.nivel ?? "-"}`,
            `Qualidade: ${p.qualidade ?? "-"}`,
            `IV: ${p.ivAtual !== null
                ? `${p.ivAtual}/${p.ivMaximo}`
                : "-"
            }`,
            `HP: ${p.hp ?? "-"}`,
            `Atk: ${p.atk ?? "-"}`,
            `Def: ${p.def ?? "-"}`,
            `SpA: ${p.spa ?? "-"}`,
            `SpD: ${p.spd ?? "-"}`,
            `Vel: ${p.vel ?? "-"}`,
            `Poder: ${p.poder ?? "-"}`
        ].join("\n");

        await escreverClipboard(texto);
    }

    async function copiarJson() {
        if (!ultimoPokemon) return;

        await escreverClipboard(
            JSON.stringify(
                ultimoPokemon,
                null,
                2
            )
        );
    }

    function processarTooltip(tooltip) {
        if (!mouseTrackingEnabled) return;

        const texto =
            tooltip?.innerText?.trim();

        if (!texto || texto === ultimoTexto) {
            return;
        }

        if (
            !/Poder|Power/i.test(texto) ||
            !/(?:Nv|Lv)\s*\d+/i.test(texto)
        ) {
            return;
        }

        const pokemon = parsePokemon(texto);

        if (!pokemon) return;

        if (ultimoPokemon && normalizarNomePokemon(ultimoPokemon.nome) !== normalizarNomePokemon(pokemon.nome)) {
            danoPorGolpe.clear();
            ultimoGolpeUsado = null;
        }

        ultimoTexto = texto;
        ultimoPokemon = pokemon;

        const painel =
            document.getElementById(CONFIG.panelId);

        if (painel) {
            painel.style.display = "flex";
        }

        atualizarPainelLeitor(pokemon);
        carregarAnalise(pokemon);
        atualizarPainelMoves();
        atualizarPosicaoPainelMoves();
        atualizarPainelComparacao();

        console.log(
            "[Poké Leitor] Pokémon capturado:",
            pokemon
        );
    }

    function observarTooltips() {
        const observer =
            new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (
                        const node of
                        mutation.addedNodes
                    ) {
                        if (
                            !(
                                node instanceof
                                HTMLElement
                            )
                        ) {
                            continue;
                        }

                        if (
                            node.matches?.(
                                CONFIG.tooltipSelector
                            )
                        ) {
                            processarTooltip(node);
                        }

                        const tooltipInterno =
                            node.querySelector?.(
                                CONFIG.tooltipSelector
                            );

                        if (tooltipInterno) {
                            processarTooltip(
                                tooltipInterno
                            );
                        }
                    }
                }

                const tooltipAtual =
                    document.querySelector(
                        CONFIG.tooltipSelector
                    );

                if (tooltipAtual) {
                    processarTooltip(
                        tooltipAtual
                    );
                }
            });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        console.log(
            "[Poké Leitor] Poké Leitor e Analisador iniciado."
        );
    }

    function criarCSS() {
        return `
            #${CONFIG.panelId} {
                position: fixed;
                top: 60px;
                right: 20px;
                width: 340px;
                max-height: calc(100vh - 20px);
                z-index: 2147483647;
                overflow: hidden;
                color: #e6edf3;
                background:
                    linear-gradient(
                        165deg,
                        #161b22 0%,
                        #0d1117 60%,
                        #0d1117 100%
                    );
                border: 1px solid #30363d;
                border-radius: 14px;
                box-shadow:
                    0 0 0 1px rgba(0,0,0,.6),
                    0 14px 40px rgba(0,0,0,.7);
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                font-size: 13px;
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId} * {
                box-sizing: border-box;
            }

            /* minimizado = "botao da extensao": pilula fixa no canto inferior direito,
               fora do caminho do login e do jogo; clique abre */
            #${CONFIG.panelId}.minimized {
                width: 110px !important;
                height: 40px !important;
                left: auto !important;
                top: auto !important;
                right: 12px !important;
                bottom: 12px !important;
                border-radius: 999px;
            }

            #${CONFIG.panelId}.minimized .header {
                cursor: pointer;
                min-height: 40px;
                padding: 5px 12px;
                border-bottom: none;
                border-radius: 999px;
            }

            #${CONFIG.panelId}.minimized .header-actions {
                display: none;
            }

            #${CONFIG.panelId}.minimized
            #panel-body,
            #${CONFIG.panelId}.minimized
            .led-area {
                display: none;
            }

            #${CONFIG.panelId}.dragging {
                opacity: .93;
                transform: scale(.99);
            }

            #${CONFIG.panelId} #resize-handle {
                position: absolute;
                right: 0;
                bottom: 0;
                width: 14px;
                height: 14px;
                cursor: se-resize;
                z-index: 10000;
                background: linear-gradient(135deg, transparent 45%, rgba(227,53,13,0.5) 45%, rgba(227,53,13,0.5) 55%, transparent 55%, transparent 65%, rgba(227,53,13,0.5) 65%);
                border-radius: 0 0 14px 0;
            }

            #${CONFIG.panelId}.minimized #resize-handle {
                display: none;
            }

            #${CONFIG.panelId} .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                min-height: 48px;
                padding: 9px 10px;
                cursor: grab;
                user-select: none;
                background:
                    linear-gradient(
                        180deg,
                        #e8403d,
                        #b91f27 55%,
                        #8e141c
                    );
                border-bottom: 3px solid #151515;
            }

            #${CONFIG.panelId}
            .title-area {
                display: flex;
                align-items: center;
                gap: 9px;
            }

            #${CONFIG.panelId}
            .title-area > div:last-child {
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .title-area strong {
                color: #fff;
                font-size: 14px;
            }

            #${CONFIG.panelId}
            .title-area small {
                margin-top: 3px;
                color: rgba(255,255,255,.72);
                font-size: 9px;
                letter-spacing: .7px;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .pokeball,
            #${CONFIG.panelId}
            .empty-ball,
            #${CONFIG.panelId}
            .loading-ball {
                position: relative;
                overflow: hidden;
                border: 2px solid #171717;
                border-radius: 50%;
                background:
                    linear-gradient(
                        to bottom,
                        #f34848 0%,
                        #f34848 43%,
                        #151515 43%,
                        #151515 57%,
                        #f7f7f7 57%
                    );
            }

            #${CONFIG.panelId}
            .pokeball {
                width: 29px;
                height: 29px;
            }

            #${CONFIG.panelId} .sprite {
                width: 100%;
                height: 100%;
                image-rendering: pixelated;
                object-fit: contain;
            }

            #${CONFIG.panelId} .type-badge {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 99px;
                font-size: 8px;
                font-weight: bold;
                color: #fff;
                text-shadow: 0 1px 1px rgba(0,0,0,0.5);
                box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
            }

            #${CONFIG.panelId}
            .empty-ball {
                width: 48px;
                height: 48px;
                margin-bottom: 8px;
                animation:
                    float 2.2s
                    ease-in-out infinite;
            }

            #${CONFIG.panelId}
            .loading-ball {
                width: 42px;
                height: 42px;
                margin-bottom: 12px;
                animation:
                    spin 1.1s
                    linear infinite;
            }

            #${CONFIG.panelId}
            .pokeball span,
            #${CONFIG.panelId}
            .empty-ball span,
            #${CONFIG.panelId}
            .loading-ball span {
                position: absolute;
                top: 50%;
                left: 50%;
                border: 2px solid #171717;
                border-radius: 50%;
                background: #fff;
                transform:
                    translate(-50%, -50%);
            }

            #${CONFIG.panelId}
            .pokeball span {
                width: 8px;
                height: 8px;
            }

            #${CONFIG.panelId}
            .empty-ball span,
            #${CONFIG.panelId}
            .loading-ball span {
                width: 12px;
                height: 12px;
            }

            #${CONFIG.panelId}
            .header-actions {
                display: flex;
                gap: 3px;
            }

            #${CONFIG.panelId}
            .header-actions button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                padding: 0;
                color: #fff;
                background: rgba(0,0,0,.18);
                border:
                    1px solid rgba(255,255,255,.18);
                border-radius: 7px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .led-area {
                display: flex;
                align-items: center;
                gap: 7px;
                height: 28px;
                padding: 0 12px;
                background:
                    linear-gradient(
                        #252a34,
                        #171b23
                    );
            }

            #${CONFIG.panelId}
            .main-led {
                width: 15px;
                height: 15px;
                margin-right: 3px;
                border: 2px solid #dceaff;
                border-radius: 50%;
                background: #4fc6ff;
                box-shadow:
                    inset 0 0 4px #fff,
                    0 0 7px #4fc6ff;
            }

            #${CONFIG.panelId}
            .small-led {
                width: 7px;
                height: 7px;
                border-radius: 50%;
            }

            #${CONFIG.panelId}
            .led-red {
                background: #ff4b4b;
            }

            #${CONFIG.panelId}
            .led-yellow {
                background: #ffd64c;
            }

            #${CONFIG.panelId}
            .led-green {
                background: #54d66b;
            }

            #${CONFIG.panelId}
            #panel-body {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color:
                    #ca3035 #111722;
            }

            #${CONFIG.panelId}
            .tabs {
                display: grid;
                grid-template-columns: 1fr 1fr;
                padding: 5px;
                gap: 4px;
                background: #0d1117;
                border-bottom:
                    1px solid #21262d;
            }

            #${CONFIG.panelId}
            .tab-button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 6px 4px;
                color: #7d899d;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                transition:
                    color .15s ease,
                    background .15s ease,
                    transform .15s ease;
            }

            #${CONFIG.panelId}
            .tab-button:hover {
                color: #dfe8f5;
                background: #151e2d;
            }

            #${CONFIG.panelId}
            .tab-button.active {
                color: #fff;
                background:
                    linear-gradient(
                        180deg,
                        #d83a3f,
                        #9f2228
                    );
                border-color: #f06468;
                box-shadow:
                    0 4px 10px rgba(159,34,40,.25);
            }

            #${CONFIG.panelId}
            .tab-icon {
                font-size: 12px;
            }

            #${CONFIG.panelId}
            .tab-content {
                display: none;
            }

            #${CONFIG.panelId}
            .tab-content.active {
                display: block;
            }

            #${CONFIG.panelId}
            #content {
                padding: 9px;
            }

            #${CONFIG.panelId}
            .empty,
            #${CONFIG.panelId}
            .analysis-empty,
            #${CONFIG.panelId}
            .loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 170px;
                padding: 18px;
                color: #8c98aa;
                text-align: center;
            }

            #${CONFIG.panelId}
            .empty strong,
            #${CONFIG.panelId}
            .analysis-empty strong,
            #${CONFIG.panelId}
            .loading strong {
                color: #f1c644;
                font-size: 14px;
            }

            #${CONFIG.panelId}
            .empty small,
            #${CONFIG.panelId}
            .analysis-empty > span,
            #${CONFIG.panelId}
            .loading span {
                margin-top: 5px;
                max-width: 230px;
                color: #758196;
                font-size: 11px;
                line-height: 1.45;
            }

            #${CONFIG.panelId}
            .analysis-empty-icon {
                display: grid;
                place-items: center;
                width: 58px;
                height: 58px;
                margin-bottom: 12px;
                background:
                    linear-gradient(
                        145deg,
                        #17304b,
                        #0b1728
                    );
                border: 1px solid #315a7c;
                border-radius: 18px;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,.07),
                    0 10px 25px rgba(0,0,0,.25);
            }

            #${CONFIG.panelId}
            .analysis-empty-icon span {
                color: #5de6d5;
                font-size: 18px;
                font-weight: 900;
            }

            #${CONFIG.panelId}
            .empty-tips {
                display: grid;
                gap: 5px;
                width: 100%;
                margin-top: 16px;
            }

            #${CONFIG.panelId}
            .empty-tips div {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 7px 9px;
                color: #8693a8;
                background: #101827;
                border: 1px solid #1c2a3e;
                border-radius: 7px;
                font-size: 9px;
                text-align: left;
            }

            #${CONFIG.panelId}
            .empty-tips b {
                display: grid;
                place-items: center;
                width: 18px;
                height: 18px;
                color: #09101b;
                background: #55e6d3;
                border-radius: 50%;
                font-size: 9px;
            }

            #${CONFIG.panelId}
            .pokemon-card {
                overflow: hidden;
                background:
                    linear-gradient(
                        145deg,
                        rgba(255,255,255,.06),
                        rgba(255,255,255,.015)
                    );
                border:
                    1px solid rgba(255,255,255,.09);
                border-radius: 11px;
            }

            #${CONFIG.panelId}
            .pokemon-top {
                padding: 12px;
                background:
                    radial-gradient(
                        circle at top right,
                        rgba(241,198,68,.2),
                        transparent 50%
                    ),
                    rgba(0,0,0,.18);
            }

            #${CONFIG.panelId}
            .name-line {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            #${CONFIG.panelId}
            .name {
                color: #ffd84f;
                font-size: 19px;
                font-weight: 800;
            }

            #${CONFIG.panelId}
            .level-badge {
                padding: 4px 8px;
                color: #fff;
                background: #ca3035;
                border: 1px solid #ff6b6f;
                border-radius: 999px;
                font-size: 10px;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .types {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 9px;
            }

            #${CONFIG.panelId}
            .type-chip {
                padding: 4px 8px;
                color: #fff;
                background:
                    linear-gradient(
                        #7650a9,
                        #513271
                    );
                border-radius: 999px;
                font-size: 9px;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .active-chip {
                background:
                    linear-gradient(
                        #e54b4f,
                        #9d252b
                    );
            }

            #${CONFIG.panelId}
            .info-area {
                padding: 8px 10px 10px;
            }

            #${CONFIG.panelId}
            .row {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                padding: 5px 2px;
                border-bottom:
                    1px solid rgba(255,255,255,.055);
            }

            #${CONFIG.panelId}
            .row span,
            #${CONFIG.panelId}
            .stat-label {
                color: #aeb7c7;
                font-size: 10px;
            }

            #${CONFIG.panelId}
            .stat-row {
                display: grid;
                grid-template-columns:
                    85px 1fr 38px;
                align-items: center;
                gap: 7px;
                padding: 4px 2px;
            }

            #${CONFIG.panelId}
            .stat-value {
                text-align: right;
            }

            #${CONFIG.panelId}
            .stat-track {
                overflow: hidden;
                height: 6px;
                background: #263146;
                border-radius: 99px;
            }

            #${CONFIG.panelId}
            .stat-fill {
                height: 100%;
                background:
                    linear-gradient(
                        90deg,
                        #e44045,
                        #f2c744,
                        #61ce70
                    );
            }

            #${CONFIG.panelId}
            .power {
                display: flex;
                justify-content: space-between;
                margin-top: 5px;
                padding: 6px 10px;
                color: #ffb968;
                background:
                    linear-gradient(
                        90deg,
                        rgba(227,53,13,.20),
                        rgba(227,53,13,.06)
                    );
                border:
                    1px solid rgba(227,53,13,.3);
                border-radius: 8px;
            }

            #${CONFIG.panelId}
            .actions {
                display: flex;
                gap: 7px;
                padding: 7px 10px;
            }

            #${CONFIG.panelId}
            .actions button {
                flex: 1;
                padding: 7px;
                color: #fff;
                background:
                    linear-gradient(
                        #d83a3f,
                        #9f2228
                    );
                border: 1px solid #f06468;
                border-radius: 8px;
                cursor: pointer;
                font-size: 10px;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .actions button:last-child {
                color: #171717;
                background:
                    linear-gradient(
                        #f4d65e,
                        #cba52a
                    );
                border-color: #ffe984;
            }

            #${CONFIG.panelId}
            .analysis-hero {
                position: relative;
                display: flex;
                align-items: center;
                gap: 10px;
                overflow: hidden;
                min-height: 88px;
                padding: 14px;
                background:
                    radial-gradient(
                        circle at 85% 10%,
                        rgba(85,230,211,.15),
                        transparent 40%
                    ),
                    linear-gradient(
                        135deg,
                        #102039,
                        #091321
                    );
                border-bottom:
                    1px solid rgba(255,255,255,.08);
            }

            #${CONFIG.panelId}
            .analysis-hero-pattern {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: .18;
                background-image:
                    linear-gradient(
                        rgba(255,255,255,.08) 1px,
                        transparent 1px
                    ),
                    linear-gradient(
                        90deg,
                        rgba(255,255,255,.08) 1px,
                        transparent 1px
                    );
                background-size: 14px 14px;
                mask-image:
                    linear-gradient(
                        90deg,
                        transparent,
                        #000
                    );
            }

            #${CONFIG.panelId}
            .analysis-pokemon-icon {
                position: relative;
                z-index: 1;
                display: grid;
                place-items: center;
                flex: 0 0 auto;
                width: 52px;
                height: 52px;
                background:
                    linear-gradient(
                        145deg,
                        #1b3858,
                        #0c192c
                    );
                border: 1px solid #3a6688;
                border-radius: 16px;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,.08),
                    0 8px 20px rgba(0,0,0,.3);
            }

            #${CONFIG.panelId}
            .analysis-pokemon-icon span {
                color: #5ce8d7;
                font-size: 16px;
                font-weight: 900;
                text-shadow:
                    0 0 12px rgba(92,232,215,.35);
            }

            #${CONFIG.panelId}
            .analysis-identity {
                position: relative;
                z-index: 1;
                display: flex;
                flex: 1;
                min-width: 0;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .analysis-identity > small {
                color: #58d9ca;
                font-size: 7px;
                font-weight: bold;
                letter-spacing: 1.4px;
            }

            #${CONFIG.panelId}
            .analysis-identity > strong {
                overflow: hidden;
                margin-top: 3px;
                color: #fff;
                font-size: 18px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            #${CONFIG.panelId}
            .analysis-types {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 6px;
            }

            #${CONFIG.panelId}
            .analysis-types span {
                padding: 3px 6px;
                color: #cad6e7;
                background: rgba(255,255,255,.07);
                border:
                    1px solid rgba(255,255,255,.08);
                border-radius: 999px;
                font-size: 7px;
                font-weight: bold;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .analysis-level {
                position: relative;
                z-index: 1;
                display: flex;
                flex: 0 0 auto;
                flex-direction: column;
                align-items: center;
                min-width: 45px;
                padding: 7px 8px;
                background: rgba(0,0,0,.24);
                border:
                    1px solid rgba(255,255,255,.1);
                border-radius: 10px;
            }

            #${CONFIG.panelId}
            .analysis-level small {
                color: #7889a1;
                font-size: 6px;
                letter-spacing: 1px;
            }

            #${CONFIG.panelId}
            .analysis-level b {
                margin-top: 2px;
                color: #f1c644;
                font-size: 15px;
            }

            #${CONFIG.panelId}
            .analysis-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 11px 13px;
                background: #0c1421;
                border-bottom:
                    1px solid rgba(255,255,255,.06);
            }

            #${CONFIG.panelId}
            .analysis-toolbar > div {
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .analysis-toolbar strong {
                color: #dce6f3;
                font-size: 11px;
            }

            #${CONFIG.panelId}
            .analysis-toolbar span {
                margin-top: 2px;
                color: #68768c;
                font-size: 8px;
            }

            #${CONFIG.panelId}
            #toggle-form {
                padding: 5px 8px;
                color: #8fded4;
                background: #112433;
                border: 1px solid #275268;
                border-radius: 6px;
                cursor: pointer;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .form-collapsed {
                display: none;
            }

            #${CONFIG.panelId}
            .primary-fields {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
                padding: 12px;
                background: #0b111c;
            }

            #${CONFIG.panelId}
            .primary-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            #${CONFIG.panelId}
            .primary-field > span {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #8f9db2;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .primary-field > span i {
                color: #55e6d3;
                font-style: normal;
            }

            #${CONFIG.panelId}
            .input-with-suffix {
                position: relative;
            }

            #${CONFIG.panelId}
            .input-with-suffix input {
                padding-right: 30px;
            }

            #${CONFIG.panelId}
            .input-with-suffix b {
                position: absolute;
                top: 50%;
                right: 9px;
                color: #587089;
                font-size: 9px;
                transform: translateY(-50%);
                pointer-events: none;
            }

            #${CONFIG.panelId} input {
                width: 100%;
                padding: 9px;
                color: #fff;
                background:
                    linear-gradient(
                        180deg,
                        #081321,
                        #07101c
                    );
                border: 1px solid #2b405f;
                border-radius: 6px;
                outline: none;
                font-size: 11px;
                font-weight: bold;
                transition:
                    border-color .15s ease,
                    box-shadow .15s ease;
            }

            #${CONFIG.panelId} input:focus {
                border-color: #55e6d3;
                box-shadow:
                    0 0 0 2px rgba(85,230,211,.12);
            }

            #${CONFIG.panelId}
            .data-section {
                margin: 0 12px 10px;
                overflow: hidden;
                background:
                    linear-gradient(
                        145deg,
                        #101926,
                        #0b121e
                    );
                border: 1px solid #1d2c41;
                border-radius: 10px;
            }

            #${CONFIG.panelId}
            .data-section-heading {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 9px 10px;
                background:
                    rgba(255,255,255,.025);
                border-bottom:
                    1px solid rgba(255,255,255,.05);
            }

            #${CONFIG.panelId}
            .section-icon {
                display: grid;
                place-items: center;
                width: 25px;
                height: 25px;
                color: #092018;
                background: #55e6d3;
                border-radius: 7px;
                font-size: 10px;
                font-weight: 900;
            }

            #${CONFIG.panelId}
            .section-icon.current {
                color: #071626;
                background: #69b7ff;
            }

            #${CONFIG.panelId}
            .data-section-heading > div:last-child {
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .data-section-heading strong {
                color: #dce6f3;
                font-size: 10px;
            }

            #${CONFIG.panelId}
            .data-section-heading span {
                margin-top: 2px;
                color: #65738a;
                font-size: 7px;
            }

            #${CONFIG.panelId}
            .input-stat-grid {
                display: grid;
                grid-template-columns:
                    repeat(3, 1fr);
                gap: 6px;
                padding: 8px;
            }

            #${CONFIG.panelId}
            .stat-input-card {
                display: flex;
                flex-direction: column;
                gap: 5px;
                padding: 6px;
                background: #0b1421;
                border: 1px solid #1b2a3e;
                border-radius: 7px;
                transition:
                    border-color .15s ease,
                    background .15s ease;
            }

            #${CONFIG.panelId}
            .stat-input-card:focus-within {
                background: #0e1a2a;
                border-color: #365e78;
            }

            #${CONFIG.panelId}
            .stat-input-label {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            #${CONFIG.panelId}
            .stat-input-label i {
                font-style: normal;
                font-size: 9px;
            }

            #${CONFIG.panelId}
            .stat-input-label span {
                color: #8390a5;
                font-size: 8px;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .stat-input-card input {
                padding: 6px;
                border-radius: 4px;
                font-size: 10px;
                text-align: center;
            }

            #${CONFIG.panelId}
            [data-stat="hp"] i {
                color: #ff6680;
            }

            #${CONFIG.panelId}
            [data-stat="atk"] i {
                color: #ffb45c;
            }

            #${CONFIG.panelId}
            [data-stat="def"] i {
                color: #65c8ff;
            }

            #${CONFIG.panelId}
            [data-stat="spa"] i {
                color: #d985ff;
            }

            #${CONFIG.panelId}
            [data-stat="spd"] i {
                color: #6ee0a0;
            }

            #${CONFIG.panelId}
            [data-stat="vel"] i {
                color: #ffe36a;
            }

            #${CONFIG.panelId}
            .calculate-button {
                display: flex;
                align-items: center;
                gap: 9px;
                width: calc(100% - 24px);
                margin: 3px 12px 13px;
                padding: 10px;
                color: #fff;
                background:
                    linear-gradient(
                        135deg,
                        #357fdb,
                        #285eb5
                    );
                border: 1px solid #68a9ff;
                border-radius: 9px;
                cursor: pointer;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,.18),
                    0 6px 15px rgba(30,90,180,.2);
                text-align: left;
                transition:
                    transform .15s ease,
                    filter .15s ease;
            }

            #${CONFIG.panelId}
            .calculate-button:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            #${CONFIG.panelId}
            .calculate-button:active {
                transform: translateY(1px);
            }

            #${CONFIG.panelId}
            .calculate-icon {
                display: grid;
                place-items: center;
                width: 31px;
                height: 31px;
                background: rgba(255,255,255,.12);
                border:
                    1px solid rgba(255,255,255,.15);
                border-radius: 8px;
                font-size: 17px;
            }

            #${CONFIG.panelId}
            .calculate-button > span:nth-child(2) {
                display: flex;
                flex: 1;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .calculate-button strong {
                font-size: 11px;
            }

            #${CONFIG.panelId}
            .calculate-button small {
                margin-top: 2px;
                color: rgba(255,255,255,.65);
                font-size: 8px;
            }

            #${CONFIG.panelId}
            .calculate-button > b {
                font-size: 20px;
            }

            #${CONFIG.panelId}
            .result-wrapper {
                padding: 13px 12px 4px;
                background:
                    linear-gradient(
                        180deg,
                        #09121f,
                        #080e18
                    );
                border-top:
                    1px solid rgba(255,255,255,.06);
            }

            #${CONFIG.panelId}
            .result-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 9px;
            }

            #${CONFIG.panelId}
            .result-title > div {
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .result-eyebrow {
                color: #55e6d3;
                font-size: 7px;
                font-weight: bold;
                letter-spacing: 1.1px;
            }

            #${CONFIG.panelId}
            .result-title strong {
                margin-top: 3px;
                color: #dce6f3;
                font-size: 12px;
            }

            #${CONFIG.panelId}
            .result-check {
                display: grid;
                place-items: center;
                width: 25px;
                height: 25px;
                color: #062419;
                background: #55e6d3;
                border-radius: 50%;
                font-size: 12px;
                font-weight: 900;
            }

            #${CONFIG.panelId}
            .result-main-card {
                display: flex;
                align-items: center;
                gap: 13px;
                padding: 13px;
                background:
                    radial-gradient(
                        circle at top right,
                        rgba(85,230,211,.09),
                        transparent 45%
                    ),
                    linear-gradient(
                        145deg,
                        #0e1b2b,
                        #091321
                    );
                border: 1px solid #20384f;
                border-radius: 12px;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,.04);
            }

            #${CONFIG.panelId}
            .score-circle {
                position: relative;
                display: grid;
                place-items: center;
                flex: 0 0 auto;
                width: 90px;
                height: 90px;
                border-radius: 50%;
                background:
                    conic-gradient(
                        var(--score-color)
                        var(--score),
                        #1c2a3b 0deg
                    );
                box-shadow:
                    0 0 25px
                    color-mix(
                        in srgb,
                        var(--score-color) 25%,
                        transparent
                    );
            }

            #${CONFIG.panelId}
            .score-circle::before {
                content: "";
                position: absolute;
                inset: 7px;
                background:
                    radial-gradient(
                        circle at 40% 30%,
                        #15263a,
                        #08111e 70%
                    );
                border:
                    1px solid rgba(255,255,255,.07);
                border-radius: 50%;
            }

            #${CONFIG.panelId}
            .score-circle > div {
                position: relative;
                z-index: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            #${CONFIG.panelId}
            .score-circle strong {
                color: #fff;
                font-size: 22px;
                line-height: 1;
            }

            #${CONFIG.panelId}
            .score-circle span {
                margin-top: 3px;
                color: #78879c;
                font-size: 7px;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .result-description {
                display: flex;
                flex: 1;
                flex-direction: column;
                min-width: 0;
            }

            #${CONFIG.panelId}
            .result-description small {
                color: #65758b;
                font-size: 7px;
                letter-spacing: 1px;
            }

            #${CONFIG.panelId}
            .result-description strong {
                margin-top: 4px;
                font-size: 16px;
            }

            #${CONFIG.panelId}
            .result-description p {
                margin: 6px 0 0;
                color: #8795aa;
                font-size: 9px;
                line-height: 1.4;
            }

            #${CONFIG.panelId}
            .result-metrics {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-top: 8px;
            }

            #${CONFIG.panelId}
            .result-metric {
                display: flex;
                align-items: center;
                gap: 7px;
                padding: 8px;
                background: #0c1624;
                border: 1px solid #1b2d42;
                border-radius: 8px;
            }

            #${CONFIG.panelId}
            .result-metric:last-child {
                grid-column: 1 / -1;
            }

            #${CONFIG.panelId}
            .metric-icon {
                display: grid;
                place-items: center;
                flex: 0 0 auto;
                width: 27px;
                height: 27px;
                border-radius: 7px;
                font-size: 9px;
                font-weight: 900;
            }

            #${CONFIG.panelId}
            .metric-icon.quality {
                color: #291d00;
                background: #f1c644;
            }

            #${CONFIG.panelId}
            .metric-icon.iv {
                color: #05201d;
                background: #55e6d3;
            }

            #${CONFIG.panelId}
            .metric-icon.power {
                color: #221606;
                background: #ffb35c;
            }

            #${CONFIG.panelId}
            .result-metric > div {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            #${CONFIG.panelId}
            .result-metric small {
                color: #68778d;
                font-size: 6px;
                letter-spacing: .8px;
            }

            #${CONFIG.panelId}
            .result-metric strong {
                margin-top: 1px;
                color: #edf4ff;
                font-size: 12px;
            }

            #${CONFIG.panelId}
            .result-metric > div > span {
                color: #66758a;
                font-size: 7px;
            }

            #${CONFIG.panelId}
            .overall-progress {
                margin-top: 8px;
                padding: 9px 10px;
                background: #0b1522;
                border: 1px solid #192b3f;
                border-radius: 8px;
            }

            #${CONFIG.panelId}
            .overall-progress > div:first-child {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 7px;
            }

            #${CONFIG.panelId}
            .overall-progress span {
                color: #8795aa;
                font-size: 8px;
            }

            #${CONFIG.panelId}
            .overall-progress strong {
                color: #eaf2fc;
                font-size: 10px;
            }

            #${CONFIG.panelId}
            .overall-track {
                overflow: hidden;
                height: 7px;
                background: #1e2b3e;
                border-radius: 99px;
            }

            #${CONFIG.panelId}
            .overall-track div {
                height: 100%;
                border-radius: inherit;
                box-shadow:
                    0 0 8px rgba(85,230,211,.25);
            }

            #${CONFIG.panelId}
            .individual-section {
                padding: 10px 12px 12px;
                background: #080e18;
            }

            #${CONFIG.panelId}
            .individual-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            #${CONFIG.panelId}
            .individual-heading > div {
                display: flex;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .individual-heading strong {
                color: #dfe8f4;
                font-size: 11px;
            }

            #${CONFIG.panelId}
            .individual-heading span {
                margin-top: 2px;
                color: #66758b;
                font-size: 7px;
            }

            #${CONFIG.panelId}
            .individual-total {
                padding: 4px 7px;
                color: #55e6d3 !important;
                background: rgba(85,230,211,.08);
                border: 1px solid rgba(85,230,211,.2);
                border-radius: 999px;
                font-size: 8px !important;
                font-weight: bold;
            }

            #${CONFIG.panelId}
            .iv-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 7px;
            }

            #${CONFIG.panelId}
            .iv-item {
                padding: 9px;
                background:
                    linear-gradient(
                        145deg,
                        #101a29,
                        #0b131f
                    );
                border: 1px solid #1e3046;
                border-radius: 9px;
                transition:
                    transform .15s ease,
                    border-color .15s ease;
            }

            #${CONFIG.panelId}
            .iv-item:hover {
                border-color: #34506e;
                transform: translateY(-1px);
            }

            #${CONFIG.panelId}
            .iv-item-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 5px;
            }

            #${CONFIG.panelId}
            .iv-stat-name {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
            }

            #${CONFIG.panelId}
            .iv-stat-name > span {
                display: grid;
                place-items: center;
                flex: 0 0 auto;
                width: 23px;
                height: 23px;
                background: rgba(255,255,255,.05);
                border:
                    1px solid rgba(255,255,255,.06);
                border-radius: 6px;
                font-size: 11px;
            }

            #${CONFIG.panelId}
            .iv-stat-name > div {
                display: flex;
                min-width: 0;
                flex-direction: column;
            }

            #${CONFIG.panelId}
            .iv-stat-name strong {
                color: #e9f1fb;
                font-size: 11px;
            }

            #${CONFIG.panelId}
            .iv-stat-name small {
                overflow: hidden;
                color: #66758a;
                font-size: 8px;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            #${CONFIG.panelId}
            .iv-value {
                display: flex;
                align-items: baseline;
                flex: 0 0 auto;
            }

            #${CONFIG.panelId}
            .iv-value strong {
                color: #fff;
                font-size: 14px;
            }

            #${CONFIG.panelId}
            .iv-value span {
                color: #66758a;
                font-size: 9px;
            }

            #${CONFIG.panelId}
            .iv-track {
                overflow: hidden;
                height: 6px;
                margin-top: 8px;
                background: #202d3f;
                border-radius: 99px;
            }

            #${CONFIG.panelId}
            .iv-track div {
                height: 100%;
                border-radius: inherit;
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="hp"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #e94e6b,
                        #ff7f96
                    );
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="atk"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #e8873d,
                        #ffbd6c
                    );
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="def"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #3d95d9,
                        #68c6ff
                    );
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="spa"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #a653d7,
                        #dc8cff
                    );
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="spd"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #3fb875,
                        #75e3a7
                    );
            }

            #${CONFIG.panelId}
            .iv-item[data-stat="vel"]
            .iv-track div {
                background:
                    linear-gradient(
                        90deg,
                        #d3b02c,
                        #ffe36a
                    );
            }

            #${CONFIG.panelId}
            .iv-item-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 6px;
            }

            #${CONFIG.panelId}
            .iv-item-bottom > span:last-child {
                color: #66758a;
                font-size: 10px;
            }

            #${CONFIG.panelId}
            .iv-rating {
                padding: 2px 6px;
                border-radius: 999px;
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
            }

            #${CONFIG.panelId}
            .iv-rating.perfect {
                color: #6af3aa;
                background: rgba(74,214,137,.1);
            }

            #${CONFIG.panelId}
            .iv-rating.great {
                color: #5ce0d2;
                background: rgba(85,230,211,.1);
            }

            #${CONFIG.panelId}
            .iv-rating.good {
                color: #70baff;
                background: rgba(105,183,255,.1);
            }

            #${CONFIG.panelId}
            .iv-rating.average {
                color: #f1c644;
                background: rgba(241,198,68,.1);
            }

            #${CONFIG.panelId}
            .iv-rating.low {
                color: #ff7a83;
                background: rgba(240,90,98,.1);
            }

            #${CONFIG.panelId}
            .warning {
                display: flex;
                flex-direction: column;
                gap: 3px;
                margin: 10px 12px;
                padding: 9px;
                color: #ffd77d;
                background: rgba(243,154,75,.12);
                border: 1px solid rgba(243,154,75,.4);
                border-radius: 7px;
                font-size: 9px;
                line-height: 1.4;
            }

            #${CONFIG.panelId}
            .warning strong {
                font-size: 9px;
            }

            #${CONFIG.panelId}
            .warning span {
                color: #d7a968;
                font-size: 8px;
            }

            #${CONFIG.panelId}
            .analysis-note {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                margin: 0 12px 12px;
                padding: 8px;
                color: #67768b;
                background: #0b131f;
                border: 1px solid #1b2b3f;
                border-radius: 7px;
            }

            #${CONFIG.panelId}
            .analysis-note span {
                color: #55e6d3;
                font-size: 10px;
            }

            #${CONFIG.panelId}
            .analysis-note p {
                margin: 0;
                font-size: 8px;
                line-height: 1.4;
            }

            #${CONFIG.panelId}
            .footer {
                padding: 5px;
                color: #5f6877;
                background: rgba(0,0,0,.22);
                font-size: 8px;
                letter-spacing: 1px;
                text-align: center;
                text-transform: uppercase;
            }

            #moves-panel {
                position: fixed;
                width: 300px;
                z-index: 2147483646;
                display: flex;
                flex-direction: column;
                color: #f7f7f7;
                background:
                    radial-gradient(
                        circle at top right,
                        rgba(67, 141, 243, 0.05),
                        transparent 42%
                    ),
                    linear-gradient(
                        165deg,
                        #151923 0%,
                        #0c0f16 55%,
                        #080a0f 100%
                    );
                border: 2px solid #f1c644;
                border-radius: 16px;
                box-shadow:
                    0 0 0 3px rgba(0,0,0,.75),
                    0 14px 40px rgba(0,0,0,.7);
                font-family: Arial, Helvetica, sans-serif;
                overflow: hidden;
                box-sizing: border-box;
            }

            #moves-panel * {
                box-sizing: border-box;
            }

            .moves-header {
                display: flex;
                align-items: center;
                min-height: 40px;
                padding: 10px 12px;
                background: linear-gradient(180deg, #1f2535, #121620);
                border-bottom: 2px solid #151515;
            }

            .moves-header strong {
                color: #ffd84f;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: .5px;
            }

            .moves-body {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                scrollbar-width: thin;
                scrollbar-color: #ca3035 #111722;
            }

            .move-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 10px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.05);
                border-radius: 10px;
                gap: 8px;
                transition: border-color 0.15s ease, background 0.15s ease;
            }

            .move-card.active {
                border-color: #f1c644;
                background: rgba(241,198,68,0.04);
                box-shadow: 0 0 10px rgba(241,198,68,0.1);
            }

            .move-card.taken {
                border-color: rgba(240,90,98,0.06);
                background: rgba(240,90,98,0.02);
            }

            .type-badge {
                display: inline-block;
                padding: 2px 7px;
                border-radius: 99px;
                font-size: 8px;
                font-weight: bold;
                color: #fff;
                text-shadow: 0 1px 1px rgba(0,0,0,0.5);
                box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
                line-height: 1.2;
                text-align: center;
            }

            input.flat-stat-input::-webkit-outer-spin-button,
            input.flat-stat-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            @keyframes float {
                0%,
                100% {
                    transform: translateY(0);
                }

                50% {
                    transform: translateY(-5px);
                }
            }
        `;
    }

    // =========================================================================
    // NOVO: SISTEMA DE LEITURA DO MERCADO GLOBAL (VIA CLIQUE NA LINHA)
    // =========================================================================
    function processarDadosMercado() {
        const lateral = document.querySelector("aside.mkt2-details");
        if (!lateral) return;

        // 1. Nome e Nível (Ex: "Geodude Lv.1")
        const nomeNivelTexto = lateral.querySelector(".mkt2-details-name")?.innerText?.trim() || "";
        if (!nomeNivelTexto) return;

        const nivelMatch = nomeNivelTexto.match(/Lv\.?\s*(\d+)/i);
        const nivel = nivelMatch ? Number(nivelMatch[1]) : 1;
        // Remove o "Lv.X" para isolar o nome limpo
        const nome = nomeNivelTexto.replace(/Lv\.?\s*\d+/i, "").trim();

        // 2. Qualidade / Multiplicador (Ex: "Lendária ×1.70" ou "Lendária x1.70")
        const qualidadeTexto = lateral.innerText.match(/(?:Raridade|Rarity)\s+([^\n]+)/i)?.[1]?.trim() || "";
        const multiplicador = numeroDecimal(qualidadeTexto?.match(/(?:×|x)\s*([\d.,]+)/i)?.[1]) || 1.0;

        // 3. IV Total observado (Ex: "148/182")
        const ivMatch = lateral.innerText.match(/IV\s*(\d+)\s*\/\s*(\d+)/i);
        const ivAtual = ivMatch ? Number(ivMatch[1]) : null;
        const ivMaximo = ivMatch ? Number(ivMatch[2]) : 192;

        // 4. Poder
        const poderMatch = lateral.innerText.match(/(?:Poder|Power)\s*.*?(\d+)/i);
        const poder = poderMatch ? Number(poderMatch[1]) : null;

        // 5. Tipos (Mapeia as badges de tipo dentro da lateral)
        const tipos = Array.from(lateral.querySelectorAll(".mkt2-card-badges span, .mkt2-statlist span"))
            .map(el => el.innerText.trim())
            .filter(txt => txt && !/Poder|Power|Ativo|Active|Somente|Only/i.test(txt));

        // 6. Atributos Atuais (Stats vindos da grid de células .mkt2-statcell)
        const statsCelas = Array.from(lateral.querySelectorAll(".mkt2-stats .mkt2-statcell"));
        const obterValorCela = (index) => {
            if (!statsCelas[index]) return null;
            // Pega o número que aparece na célula do atributo
            const numMatch = statsCelas[index].innerText.match(/(\d+)/);
            return numMatch ? Number(numMatch[1]) : null;
        };

        // Ordem padrão baseada na exibição comum do jogo (Geralmente: HP, Atk, Def, SpA, SpD, Vel)
        const hp = obterValorCela(0);
        const atk = obterValorCela(1);
        const def = obterValorCela(2);
        const spa = obterValorCela(3);
        const spd = obterValorCela(4);
        const vel = obterValorCela(5);

        // Monta o objeto estruturado identicamente ao seu leitor original
        const pokemon = {
            nome,
            tipos,
            ativo: false,
            nivel,
            qualidade: qualidadeTexto || "Comum",
            multiplicadorQualidade: multiplicador,
            ivAtual,
            ivMaximo,
            hp, atk, def, spa, spd, vel,
            poder
        };

        // Reseta o cache de golpes da caçada se mudar de Pokémon
        if (ultimoPokemon && normalizarNomePokemon(ultimoPokemon.nome) !== normalizarNomePokemon(pokemon.nome)) {
            danoPorGolpe.clear();
            ultimoGolpeUsado = null;
        }

        ultimoTexto = `MKT-${nome}-${nivel}-${poder}`; // Evita travamento de repetição idêntica
        ultimoPokemon = pokemon;

        const painel = document.getElementById(CONFIG.panelId);
        if (painel) painel.style.display = "flex";

        // Alimenta todas as abas e atualiza seu painel lateral da Pokédex automaticamente!
        atualizarPainelLeitor(pokemon);
        carregarAnalise(pokemon);
        atualizarPainelMoves();
        atualizarPosicaoPainelMoves();
        atualizarPainelComparacao();

        console.log("[Poké Leitor] Pokémon capturado do Mercado Global:", pokemon);
    }

    // =========================================================================
    // INICIALIZADORES E OBSERVERS ADAPTADOS
    // =========================================================================
    function iniciarEscutasEventos() {
        // Escuta Cliques no Mercado Global usando Event Delegation (suporta modo linhas e cards)
        document.addEventListener("click", (evento) => {
            const clicado = evento.target.closest(".mkt2-trow.clickable, .mkt2-card.clickable");
            if (clicado) {
                // Pequeno delay de 60ms para esperar o jogo renderizar os dados na barra lateral
                setTimeout(processarDadosMercado, 60);
            }
        });
    }

    function observarLogDeCapturas() {
        let listObserver = null;

        const observer = new MutationObserver(() => {
            const clogWindow = document.querySelector(".clog-window");
            if (!clogWindow) {
                if (listObserver) {
                    listObserver.disconnect();
                    listObserver = null;
                }
                return;
            }

            if (!document.getElementById("clog-filter-rarity")) {
                const head = clogWindow.querySelector(".clog-head");
                if (head) {
                    const filterBar = document.createElement("div");
                    filterBar.className = "clog-filter-bar";
                    filterBar.style.cssText = "display: flex; gap: 6px; padding: 6px 12px; background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.06); align-items: center;";
                    filterBar.innerHTML = `
                        <select id="clog-filter-rarity" style="flex: 1; background: #151d2a; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 10px; padding: 3px 6px; outline: none; height: 22px;">
                            <option value="">Todas Raridades</option>
                            <option value="Comum">Comum</option>
                            <option value="Incomum">Incomum</option>
                            <option value="Rara">Rara</option>
                            <option value="Épica">Épica</option>
                            <option value="Lendária">Lendária</option>
                            <option value="Mítica">Mítica</option>
                        </select>
                        <input type="number" id="clog-filter-iv" placeholder="IV Min (ex: 110)" style="width: 105px; background: #151d2a; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 10px; padding: 3px 6px; outline: none; height: 22px;" min="0" max="192">
                        <select id="clog-sort" title="Ordenar" style="width: 118px; background: #151d2a; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: #fff; font-size: 10px; padding: 3px 6px; outline: none; height: 22px;">
                            <option value="">Ordem padrão</option>
                            <option value="qual-desc">Qualidade ↓</option>
                            <option value="qual-asc">Qualidade ↑</option>
                            <option value="iv-desc">IV ↓</option>
                            <option value="iv-asc">IV ↑</option>
                        </select>
                    `;
                    head.insertAdjacentElement("afterend", filterBar);

                    const rSel = filterBar.querySelector("#clog-filter-rarity");
                    const iInp = filterBar.querySelector("#clog-filter-iv");
                    const sSel = filterBar.querySelector("#clog-sort");

                    rSel.addEventListener("change", aplicarFiltroClog);
                    iInp.addEventListener("input", aplicarFiltroClog);
                    sSel.addEventListener("change", aplicarFiltroClog);
                }
            }

            const clogList = clogWindow.querySelector(".clog-list");
            if (clogList && !listObserver) {
                listObserver = new MutationObserver(() => {
                    aplicarFiltroClog();
                });
                listObserver.observe(clogList, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ["style", "class"]
                });
                aplicarFiltroClog();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // ranking de raridade pra ordenar por qualidade (PT e EN)
        const RANK_RARIDADE = {
            comum: 1, common: 1, incomum: 2, uncommon: 2, rara: 3, raro: 3, rare: 3,
            epica: 4, epico: 4, epic: 4, lendaria: 5, lendario: 5, legendary: 5,
            mitica: 6, mitico: 6, mythic: 6, mythical: 6, anciao: 7, ancient: 7, divino: 8, divine: 8
        };

        let filtrandoClog = false;
        function aplicarFiltroClog() {
            if (filtrandoClog) return;
            const rarityFilter = document.getElementById("clog-filter-rarity")?.value || "";
            const ivFilterVal = parseInt(document.getElementById("clog-filter-iv")?.value || "0", 10);
            const sortMode = document.getElementById("clog-sort")?.value || "";

            const lista = document.querySelector(".clog-window .clog-list");
            const rows = document.querySelectorAll(".clog-window .clog-list .clog-row");
            if (!rows.length) return;

            filtrandoClog = true;

            // ordenacao via CSS order (nao move nos do DOM, entao nao briga com o React do jogo)
            if (lista) {
                if (sortMode) {
                    lista.style.setProperty("display", "flex", "important");
                    lista.style.setProperty("flex-direction", "column", "important");
                } else {
                    lista.style.removeProperty("display");
                    lista.style.removeProperty("flex-direction");
                }
            }

            rows.forEach(row => {
                const metaEl = row.querySelector(".clog-meta");
                if (!metaEl) return;

                const rarityText = metaEl.querySelector("b")?.innerText?.trim() || "";

                const text = metaEl.innerText || "";
                const ivMatch = text.match(/IV\s*(\d+)/i);
                const ivVal = ivMatch ? parseInt(ivMatch[1], 10) : 0;

                const matchesRarity = !rarityFilter || rarityText.toLowerCase() === rarityFilter.toLowerCase();
                const matchesIv = !ivFilterVal || ivVal >= ivFilterVal;

                if (matchesRarity && matchesIv) {
                    row.style.setProperty("display", "", "important");
                } else {
                    row.style.setProperty("display", "none", "important");
                }

                if (sortMode) {
                    // qualidade = raridade (peso alto) + multiplicador ×N.NN como desempate
                    const chave = rarityText.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
                    const rank = RANK_RARIDADE[chave] || 0;
                    const multMatch = text.match(/(?:×|x)\s*([\d.,]+)/i);
                    const mult = multMatch ? Math.round(parseFloat(multMatch[1].replace(",", ".")) * 100) : 0;
                    const metric = sortMode.startsWith("iv") ? ivVal : rank * 1000 + mult;
                    row.style.setProperty("order", String(sortMode.endsWith("desc") ? -metric : metric));
                } else {
                    row.style.removeProperty("order");
                }
            });
            filtrandoClog = false;
        }
    }

    try {
        const fixedSalvo = localStorage.getItem("pokemon-fixed");
        if (fixedSalvo) {
            pokemonFixado = JSON.parse(fixedSalvo);
        }
        const trackingSalvo = localStorage.getItem("pokemon-reader-tracking");
        if (trackingSalvo !== null) {
            mouseTrackingEnabled = trackingSalvo === "true";
        }
        const histSalvo = localStorage.getItem("pokemon-reader-history");
        if (histSalvo) {
            historicoPokemon = JSON.parse(histSalvo);
        }
    } catch (e) {
        console.warn("[Poké Leitor] Erro ao carregar dados salvos:", e);
    }

    carregarCreatures();
    criarPainel();
    observarTooltips();
    iniciarEscutasEventos();
    observarLogDeCapturas();
})();