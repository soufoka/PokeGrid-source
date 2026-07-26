(() => {
  "use strict";

  const openButton = document.getElementById("experienceV2Btn");
  if (!openButton) return;

  const root = document.createElement("section");
  root.id = "experienceV2";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <header class="pgx-header">
      <div class="pgx-brand">
        <span class="pgx-brand-mark">PG</span>
        <span class="pgx-brand-copy"><strong>PokeGrid</strong><small>Nova experiência · prévia local</small></span>
      </div>
      <nav class="pgx-nav" aria-label="Áreas do novo painel">
        <button type="button" class="on" data-pgx-tab="overview">Visão geral</button>
        <button type="button" data-pgx-tab="team">Time &amp; IV</button>
        <button type="button" data-pgx-tab="inventory">Inventário</button>
      </nav>
      <div class="pgx-header-actions">
        <span class="pgx-live offline" id="pgxLive"><span class="pgx-live-dot"></span><span>Aguardando</span></span>
        <select class="pgx-account-select" id="pgxAccount" aria-label="Conta selecionada"></select>
        <button type="button" class="pgx-icon-btn" id="pgxRefresh" title="Atualizar dados">↻</button>
        <button type="button" class="pgx-icon-btn pgx-close" id="pgxClose" title="Fechar painel">✕</button>
      </div>
    </header>
    <main class="pgx-content" id="pgxContent"></main>
  `;
  document.body.appendChild(root);

  const content = root.querySelector("#pgxContent");
  const accountSelect = root.querySelector("#pgxAccount");
  const liveBadge = root.querySelector("#pgxLive");
  const statKeys = ["hp", "atk", "def", "spa", "spd", "speed"];
  const statLabels = { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", speed: "Spd" };
  const exponents = { hp: .95, atk: .80, def: .80, spa: .80, spd: .80, speed: .95 };

  const state = {
    open: false,
    tab: "overview",
    accountIndex: 0,
    accounts: [],
    teamIndex: 0,
    compareIndex: 1,
    projectionLevel: 500,
    inventoryFilter: "attention",
    refreshing: false
  };

  const BRIDGE = `(async () => {
    const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
    const text = (v, max = 80) => String(v == null ? "" : v).slice(0, max);
    const P = window.__poke;
    if (!P || !P.ws) return null;
    const ws = P.ws || {};
    const api = P.api || {};
    const ch = (api["/api/characters/me"] && api["/api/characters/me"].character) || {};

    if (!window.__pgxCatalogs) {
      window.__pgxCatalogs = Promise.all([
        fetch("/game/creatures.json").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/game/items.json").then(r => r.ok ? r.json() : null).catch(() => null)
      ]).then(([creatures, items]) => ({ creatures, items }));
    }
    const catalogs = await window.__pgxCatalogs.catch(() => ({ creatures: null, items: null }));
    const creatures = Array.isArray(catalogs.creatures && catalogs.creatures.creatures) ? catalogs.creatures.creatures : [];
    const items = Array.isArray(catalogs.items && catalogs.items.items) ? catalogs.items.items : [];
    const speciesById = new Map();
    const speciesByName = new Map();
    for (const c of creatures) {
      const id = num(c && c.pokeId);
      if (id != null) speciesById.set(id, c);
      const key = text(c && c.name).toLowerCase().trim();
      if (key) {
        const list = speciesByName.get(key) || [];
        list.push(c);
        speciesByName.set(key, list);
      }
    }
    const speciesFor = (p) => {
      const id = num(p && (p.speciesId ?? p.pokeId));
      if (id != null && speciesById.has(id)) return speciesById.get(id);
      const key = text(p && (p.name || p.speciesName)).toLowerCase().trim();
      const list = speciesByName.get(key) || [];
      return list.length === 1 ? list[0] : null;
    };
    const speciesView = (c) => c ? ({
      id: num(c.pokeId),
      name: text(c.name),
      types: [text(c.type1, 20), text(c.type2, 20)].filter(Boolean),
      baseStats: {
        hp: num(c.baseHp), atk: num(c.baseAtk), def: num(c.baseDef),
        spa: num(c.baseSpAtk), spd: num(c.baseSpDef), speed: num(c.baseSpeed)
      },
      attacks: (Array.isArray(c.attacks) ? c.attacks : []).slice(0, 24).map(a => ({
        name: text(a && a.name), type: text(a && a.type, 20),
        category: text(a && a.category, 20), power: num(a && a.power),
        cooldownMs: num(a && a.cooldownMs), learnLevel: num(a && a.learnLevel)
      }))
    }) : null;
    const pick = (...values) => {
      for (const value of values) {
        const n = num(value);
        if (n != null) return n;
      }
      return null;
    };
    const pokemonView = (p) => {
      const c = speciesFor(p);
      const ivBag = (p && (p.ivs || p.iv || p.growth)) || {};
      const stats = (p && (p.stats || p.attributes || p.currentStats)) || {};
      const individual = {
        hp: pick(ivBag.hp, p && p.ivHp, p && p.hpIv, p && p.growthHp),
        atk: pick(ivBag.atk, ivBag.attack, p && p.ivAtk, p && p.atkIv, p && p.growthAtk),
        def: pick(ivBag.def, ivBag.defense, p && p.ivDef, p && p.defIv, p && p.growthDef),
        spa: pick(ivBag.spa, ivBag.spAtk, ivBag.specialAttack, p && p.ivSpAtk, p && p.spAtkIv),
        spd: pick(ivBag.spd, ivBag.spDef, ivBag.specialDefense, p && p.ivSpDef, p && p.spDefIv),
        speed: pick(ivBag.speed, ivBag.vel, p && p.ivSpeed, p && p.speedIv, p && p.ivVel)
      };
      const observed = {
        hp: pick(stats.hp, stats.maxHp, p && p.maxHp, p && p.statHp),
        atk: pick(stats.atk, stats.attack, p && p.atk, p && p.attack, p && p.statAtk),
        def: pick(stats.def, stats.defense, p && p.def, p && p.defense, p && p.statDef),
        spa: pick(stats.spa, stats.spAtk, stats.specialAttack, p && p.spAtk, p && p.statSpAtk),
        spd: pick(stats.spd, stats.spDef, stats.specialDefense, p && p.spDef, p && p.statSpDef),
        speed: pick(stats.speed, stats.vel, p && p.speed, p && p.vel, p && p.statSpeed)
      };
      return {
        id: text(p && p.id),
        speciesId: pick(p && p.speciesId, p && p.pokeId, c && c.pokeId),
        name: text((p && p.name) || (c && c.name) || "Pokémon"),
        level: num(p && p.level),
        slot: num(p && p.slot),
        team: !!(p && p.team),
        leader: !!(p && p.leader),
        shiny: !!(p && p.shiny),
        hp: { current: num(p && p.hp), max: pick(p && p.maxHp, stats.maxHp) },
        quality: pick(p && p.quality, p && p.qualityMultiplier),
        qualityLabel: text(p && (p.qualityLabel || p.rarity), 30),
        ivTotal: pick(p && p.ivTotal, p && p.iv),
        ivs: individual,
        observedStats: observed,
        serverPower: pick(p && p.power, p && p.poder),
        types: [text(p && p.type1, 20), text(p && p.type2, 20)].filter(Boolean),
        species: speciesView(c)
      };
    };

    const rawTeam = ((ws.pokes && ws.pokes.list) || []).filter(p => p && p.team)
      .sort((a, b) => (num(a.slot) ?? 99) - (num(b.slot) ?? 99));
    const team = rawTeam.slice(0, 6).map(pokemonView);

    const itemById = new Map(items.map(i => [num(i && i.id), i]));
    const rawInventory = (ws.inventory && Array.isArray(ws.inventory.items)) ? ws.inventory.items : [];
    const inventory = rawInventory.map(entry => {
      const id = num(entry && entry.itemId);
      const cat = itemById.get(id) || {};
      let icon = text(cat.icon, 400);
      try { if (icon) icon = new URL(icon, location.origin).href; } catch { icon = ""; }
      return {
        itemId: id, quantity: Math.max(0, num(entry && entry.quantity) || 0),
        name: text(cat.name || ("Item #" + id)), category: text(cat.category || "outros", 30),
        rare: !!cat.rare, npcPrice: Math.max(0, num(cat.npcPrice) || 0), icon
      };
    }).filter(i => i.itemId != null && i.quantity > 0);

    const field = ws.field || {};
    const lastKill = ws["field-kill"] || {};
    const foeRaw = field.enemy || field.opponent || field.target || field.creature || field.pokemon || lastKill;
    const foeSpecies = speciesFor(foeRaw) || speciesFor(lastKill);
    const foe = (foeRaw && (foeRaw.name || foeRaw.speciesName || foeSpecies)) ? {
      speciesId: pick(foeRaw.speciesId, foeRaw.pokeId, foeSpecies && foeSpecies.pokeId),
      name: text(foeRaw.name || foeRaw.speciesName || (foeSpecies && foeSpecies.name) || "Encontro"),
      level: pick(foeRaw.level, foeRaw.lvl),
      shiny: !!foeRaw.shiny,
      hp: { current: pick(foeRaw.hp, foeRaw.currentHp), max: pick(foeRaw.maxHp, foeRaw.hpMax) },
      species: speciesView(foeSpecies)
    } : null;

    const S = P.sess || {};
    const seconds = Math.max(1, (Date.now() - (num(S.start) || Date.now())) / 1000);
    const catalogMap = new Map(items.map(i => [String(i.id), i]));
    let lootGold = 0;
    for (const id of Object.keys(S.drops || {})) {
      const drop = S.drops[id] || {};
      const cat = catalogMap.get(String(id)) || {};
      lootGold += (num(drop.qty) || 0) * (num(cat.npcPrice) || 0);
    }
    let ballPrice = 0;
    const balls = ws.balls || {};
    if (Array.isArray(balls.catalog)) {
      const activeBall = ch.autoCatchBallId || (ws["catch-result"] && ws["catch-result"].ballId);
      const selectedBall = balls.catalog.find(b => String(b.id) === String(activeBall));
      ballPrice = num(selectedBall && selectedBall.priceGold) || 0;
    }
    const balance = lootGold + (num(S.sellG) || 0) - (num(S.balls) || 0) * ballPrice - (num(S.supGold) || 0);
    const perHour = value => Math.round((num(value) || 0) / seconds * 3600);
    const catches = Array.isArray(P.catchLog) ? P.catchLog.slice(-4).reverse() : [];
    const events = catches.map(c => ({
      title: (c.sh ? "Shiny capturado: " : "Captura: ") + text(c.n || "Pokémon"),
      detail: "IV " + (num(c.iv) ?? "?") + "/192 · qualidade ×" + (num(c.q) || 0).toFixed(2),
      time: num(c.t)
    }));

    const hunt = text((ws["field-init"] && ws["field-init"].slug) || P.lastSlug || "")
      .replace(/[_-]+/g, " ").replace(/\\b\\w/g, m => m.toUpperCase());
    return {
      live: !!(ch.id || ch.name),
      character: { id: text(ch.id), name: text(ch.name), level: num(ch.level), gold: num(ch.gold) },
      hunt, team, inventory, foe, events,
      metrics: {
        goldPerHour: perHour(balance), xpPerHour: perHour(S.xp),
        killsPerHour: perHour(S.kills), captures: num(S.captures) || 0
      },
      updatedAt: Date.now()
    };
  })()`;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, number(value)));
  }

  function formatNumber(value) {
    return Math.round(number(value)).toLocaleString("pt-BR");
  }

  function compact(value) {
    const n = number(value);
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(".", ",") + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(abs >= 1e5 ? 0 : 1).replace(".", ",") + "k";
    return formatNumber(n);
  }

  function spriteUrl(id, options = {}) {
    const speciesId = Math.trunc(number(id));
    if (speciesId <= 0 || speciesId > 99999) return "";
    const { back = false, shiny = false, animated = false } = options;
    let folder = "";
    if (animated) folder = "versions/generation-v/black-white/animated/";
    if (back) folder += "back/";
    if (shiny) folder += "shiny/";
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${folder}${speciesId}.${animated ? "gif" : "png"}`;
  }

  function safeItemIcon(url) {
    try {
      const parsed = new URL(String(url || ""));
      if (parsed.protocol !== "https:") return "";
      if (!["poke.idleworld.online", "pokexguides.com", "raw.githubusercontent.com"].includes(parsed.hostname)) return "";
      return parsed.href;
    } catch {
      return "";
    }
  }

  function demoSpecies(id, name, types, baseStats, attacks = []) {
    return { id, name, types, baseStats, attacks };
  }

  function demoPokemon(id, name, level, quality, ivTotal, ivs, types, baseStats, attacks, leader = false) {
    return {
      id: `demo-${id}`, speciesId: id, name, level, quality, ivTotal, ivs,
      types, leader, team: true, shiny: false,
      hp: { current: 82, max: 100 }, observedStats: {}, serverPower: null,
      species: demoSpecies(id, name, types, baseStats, attacks)
    };
  }

  function demoAccount(index) {
    const gyaradosMoves = [
      { name: "Splash", type: "NORMAL", category: "PHYSICAL", power: 56, learnLevel: 1 },
      { name: "Aqua Tail", type: "WATER", category: "PHYSICAL", power: 64, learnLevel: 2 },
      { name: "Crunch", type: "DARK", category: "PHYSICAL", power: 72, learnLevel: 4 },
      { name: "Dragon Tail", type: "DRAGON", category: "PHYSICAL", power: 80, learnLevel: 6 },
      { name: "Ice Fang", type: "ICE", category: "PHYSICAL", power: 80, learnLevel: 6 },
      { name: "Dragon Breath", type: "DRAGON", category: "SPECIAL", power: 120, learnLevel: 16 },
      { name: "Hydro Cannon", type: "WATER", category: "SPECIAL", power: 120, learnLevel: 16 },
      { name: "Hydro Pump", type: "WATER", category: "SPECIAL", power: 136, learnLevel: 26 },
      { name: "Surf", type: "WATER", category: "SPECIAL", power: 160, learnLevel: 26 }
    ];
    const team = [
      demoPokemon(130, "Gyarados", 138, 1.53, 177, { hp: 31, atk: 30, def: 28, spa: 27, spd: 30, speed: 31 }, ["WATER", "FLYING"], { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, speed: 81 }, gyaradosMoves, true),
      demoPokemon(149, "Dragonite", 121, 1.47, 169, { hp: 30, atk: 31, def: 28, spa: 29, spd: 27, speed: 24 }, ["DRAGON", "FLYING"], { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, speed: 80 }),
      demoPokemon(212, "Scizor", 109, 1.31, 164, null, ["BUG", "STEEL"], { hp: 70, atk: 130, def: 100, spa: 55, spd: 80, speed: 65 }),
      demoPokemon(131, "Lapras", 96, 1.28, 151, null, ["WATER", "ICE"], { hp: 130, atk: 85, def: 80, spa: 85, spd: 95, speed: 60 }),
      demoPokemon(248, "Tyranitar", 102, 1.22, 146, null, ["ROCK", "DARK"], { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, speed: 61 }),
      demoPokemon(242, "Blissey", 91, 1.18, 139, null, ["NORMAL"], { hp: 255, atk: 10, def: 10, spa: 75, spd: 135, speed: 55 })
    ];
    return {
      live: false, demo: true,
      character: { name: `Conta ${index + 1}`, level: 138, gold: 0 },
      hunt: "Seafoam Cave", team,
      foe: { speciesId: 87, name: "Dewgong", level: 112, shiny: false, hp: { current: 34, max: 100 }, species: demoSpecies(87, "Dewgong", ["WATER", "ICE"], { hp: 90, atk: 70, def: 80, spa: 70, spd: 95, speed: 70 }) },
      inventory: [
        { itemId: 1, name: "Ultra Ball", quantity: 24, category: "ball", rare: false, npcPrice: 0, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png" },
        { itemId: 2, name: "Super Potion", quantity: 83, category: "potion", rare: false, npcPrice: 0, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png" },
        { itemId: 3, name: "Revive", quantity: 7, category: "revive", rare: false, npcPrice: 0, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png" },
        { itemId: 4, name: "Water Gem", quantity: 146, category: "loot", rare: false, npcPrice: 182, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystic-water.png" },
        { itemId: 5, name: "Gyarados Tail", quantity: 3, category: "loot", rare: true, npcPrice: 1000, icon: "" },
        { itemId: 6, name: "Water Stone", quantity: 5, category: "stone", rare: true, npcPrice: 0, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png" }
      ],
      events: [
        { title: "Dratini raro capturado", detail: "IV 177/192 · qualidade ×1,53", time: Date.now() },
        { title: "Estoque de Ultra Ball baixo", detail: "Restam 24 unidades", time: Date.now() - 240000 }
      ],
      metrics: { goldPerHour: 84200, xpPerHour: 1380000, killsPerHour: 229, captures: 18 },
      updatedAt: Date.now()
    };
  }

  function activeRawAccount() {
    return state.accounts[state.accountIndex] || null;
  }

  function activeAccount() {
    const account = activeRawAccount();
    return account && account.live ? account : demoAccount(state.accountIndex);
  }

  function normalizedIvs(pokemon) {
    const provided = pokemon && pokemon.ivs || {};
    const exact = statKeys.every(key => provided[key] != null && Number.isFinite(Number(provided[key])));
    if (exact) {
      return { values: Object.fromEntries(statKeys.map(key => [key, clamp(provided[key], 0, 32)])), source: "individual" };
    }
    const species = pokemon && pokemon.species;
    const observed = pokemon && pokemon.observedStats || {};
    const level = number(pokemon && pokemon.level);
    const quality = number(pokemon && pokemon.quality, 1) || 1;
    const bases = species && species.baseStats || {};
    const canEstimate = level > 0 && statKeys.every(key =>
      observed[key] != null && bases[key] != null &&
      Number.isFinite(Number(observed[key])) && Number.isFinite(Number(bases[key]))
    );
    if (canEstimate) {
      const values = {};
      for (const key of statKeys) {
        const factor = (level / 100) * Math.pow(quality, exponents[key]);
        values[key] = clamp(((number(observed[key]) / factor) - number(bases[key])) / 2, 0, 32);
      }
      return { values, source: "observed" };
    }
    const total = clamp(pokemon && pokemon.ivTotal, 0, 192);
    const base = Math.floor(total / 6);
    let remainder = Math.round(total - base * 6);
    const values = {};
    for (const key of statKeys) {
      values[key] = clamp(base + (remainder-- > 0 ? 1 : 0), 0, 32);
    }
    return { values, source: total > 0 ? "total" : "unknown" };
  }

  function projectPokemon(pokemon, level) {
    const species = pokemon && pokemon.species;
    const bases = species && species.baseStats || {};
    const iv = normalizedIvs(pokemon);
    const quality = Math.max(.01, number(pokemon && pokemon.quality, 1) || 1);
    const stats = {};
    for (const key of statKeys) {
      const base = number(bases[key]);
      stats[key] = Math.round((base + 2 * number(iv.values[key])) * (level / 100) * Math.pow(quality, exponents[key]));
    }
    const power = Math.round(statKeys.reduce((sum, key) => sum + stats[key], 0) * quality);
    return { stats, power, ivSource: iv.source, ivs: iv.values };
  }

  function hpPercent(pokemon) {
    const current = number(pokemon && pokemon.hp && pokemon.hp.current);
    const max = number(pokemon && pokemon.hp && pokemon.hp.max);
    return max > 0 ? clamp(current / max * 100, 0, 100) : 100;
  }

  function renderSprite(pokemon, options = {}) {
    const animated = spriteUrl(pokemon && pokemon.speciesId, { ...options, animated: true, shiny: !!(pokemon && pokemon.shiny) });
    const still = spriteUrl(pokemon && pokemon.speciesId, { ...options, animated: false, shiny: !!(pokemon && pokemon.shiny) });
    if (!animated && !still) return `<span class="pgx-sprite-wrap missing"></span>`;
    return `<span class="pgx-sprite-wrap"><img class="pgx-sprite" alt="${esc(pokemon && pokemon.name)}" src="${esc(animated || still)}" data-fallback="${esc(still)}"></span>`;
  }

  function renderHeader() {
    const raw = activeRawAccount();
    accountSelect.innerHTML = state.accounts.map((account, index) => {
      const name = account && account.live && account.character && account.character.name
        ? account.character.name : `Conta ${index + 1}`;
      return `<option value="${index}"${index === state.accountIndex ? " selected" : ""}>${esc(name)}</option>`;
    }).join("") || `<option value="0">Conta 1</option>`;
    const label = liveBadge.querySelector("span:last-child");
    liveBadge.classList.toggle("offline", !(raw && raw.live));
    label.textContent = raw && raw.live ? "Dados ao vivo" : "Demonstração";
  }

  function renderOverview(account) {
    const leader = account.team.find(p => p.leader) || account.team[0] || null;
    const foe = account.foe || null;
    const theme = String(foe && foe.species && foe.species.types && foe.species.types[0] || "water").toLowerCase();
    const accountRows = state.accounts.map((entry, index) => {
      const display = entry || { live: false, character: { name: `Conta ${index + 1}` }, team: [], metrics: {} };
      const lead = display.team && (display.team.find(p => p.leader) || display.team[0]);
      const name = display.character && display.character.name || `Conta ${index + 1}`;
      return `
        <div class="pgx-account-row">
          <button type="button" data-pgx-account="${index}">
            <span class="pgx-account-avatar">${String(index + 1).padStart(2, "0")}</span>
            <span class="pgx-account-name"><strong>${esc(name)}</strong><small>${esc(display.hunt || (display.live ? "Sem hunt ativa" : "Desconectada"))}</small></span>
          </button>
          <span>${lead ? `${esc(lead.name)} · ${Math.round(hpPercent(lead))}% HP` : "Time indisponível"}</span>
          <span>${display.live ? `${compact(display.metrics && display.metrics.goldPerHour)}/h` : "—"}</span>
          <strong class="${display.live ? "pgx-status-ok" : "pgx-status-off"}">${display.live ? "Estável" : "Offline"}</strong>
        </div>`;
    }).join("");
    const events = (account.events || []).slice(0, 3);
    return `
      <div class="pgx-view">
        ${account.demo ? `<div><span class="pgx-demo-note">● Dados demonstrativos até uma conta terminar o login</span></div>` : ""}
        <section class="pgx-battle" data-type="${esc(theme)}">
          <div class="pgx-battle-copy">
            <div><div class="pgx-eyebrow">Conta selecionada · ${esc(account.hunt || "Aguardando hunt")}</div><h2 class="pgx-title">Batalha em andamento</h2><p>Estado atual antes dos relatórios.</p></div>
            <span class="pgx-battle-state">${account.live ? "● ao vivo" : "prévia visual"}</span>
          </div>
          <div class="pgx-fighter player">
            ${leader ? renderSprite(leader, { back: true }) : `<span class="pgx-sprite-wrap missing"></span>`}
            <div class="pgx-nameplate">
              <div class="pgx-name-row"><strong>${esc(leader && leader.name || "Sem líder")}</strong><span>${leader && leader.level ? `Lv. ${formatNumber(leader.level)}` : "—"}</span></div>
              <div class="pgx-hp"><i style="width:${hpPercent(leader)}%"></i></div>
            </div>
          </div>
          <div class="pgx-fighter enemy">
            ${foe ? renderSprite(foe) : `<span class="pgx-sprite-wrap missing"></span>`}
            <div class="pgx-nameplate">
              <div class="pgx-name-row"><strong>${esc(foe && foe.name || "Aguardando encontro")}</strong><span>${foe && foe.level ? `Lv. ${formatNumber(foe.level)}` : "—"}</span></div>
              <div class="pgx-hp"><i style="width:${hpPercent(foe)}%"></i></div>
            </div>
          </div>
          <div class="pgx-action">${foe ? `Encontro registrado · ${esc(foe.name)}` : "O próximo encontro aparecerá aqui"}</div>
        </section>
        <div class="pgx-metrics">
          <div class="pgx-metric"><span>Saldo líquido / hora</span><strong>${number(account.metrics.goldPerHour) >= 0 ? "+" : ""}${compact(account.metrics.goldPerHour)}</strong></div>
          <div class="pgx-metric"><span>Experiência / hora</span><strong>${compact(account.metrics.xpPerHour)}</strong></div>
          <div class="pgx-metric"><span>Abates / hora</span><strong>${compact(account.metrics.killsPerHour)}</strong></div>
          <div class="pgx-metric"><span>Capturas na sessão</span><strong>${formatNumber(account.metrics.captures)}</strong></div>
        </div>
        <div class="pgx-overview-lower">
          <section class="pgx-section">
            <div class="pgx-section-head"><h3>Saúde das contas</h3><span>Clique para trocar</span></div>
            <div class="pgx-account-list">${accountRows || `<div class="pgx-empty">Nenhuma conta criada.</div>`}</div>
          </section>
          <section class="pgx-section">
            <div class="pgx-section-head"><h3>Eventos relevantes</h3><span>mais recentes</span></div>
            <div class="pgx-events">
              ${events.length ? events.map(event => `
                <div class="pgx-event"><span class="pgx-event-dot"></span><div><strong>${esc(event.title)}</strong><small>${esc(event.detail)}</small></div><small>${event.time ? new Date(event.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora"}</small></div>
              `).join("") : `<div class="pgx-empty">Nenhum evento importante nesta sessão.</div>`}
            </div>
          </section>
        </div>
      </div>`;
  }

  function sourceLabel(source) {
    if (source === "individual") return "IV individual confirmado";
    if (source === "observed") return "IV individual estimado pelos stats";
    if (source === "total") return "Distribuição estimada pelo IV total";
    return "IV ainda indisponível";
  }

  function statRows(projected) {
    const max = Math.max(1, ...statKeys.map(key => number(projected.stats[key])));
    return statKeys.map(key => `
      <div class="pgx-stat-row"><span>${statLabels[key]}</span><span class="pgx-stat-bar"><i style="width:${Math.max(5, number(projected.stats[key]) / max * 100)}%"></i></span><b>${formatNumber(projected.stats[key])}</b></div>
    `).join("");
  }

  function projectionCard(pokemon, level, primary) {
    if (!pokemon) return `<div class="pgx-empty">Selecione um Pokémon para comparar.</div>`;
    const projected = projectPokemon(pokemon, level);
    return `
      <article class="pgx-projection${primary ? " primary" : ""}">
        <div class="pgx-projection-head">
          <img alt="${esc(pokemon.name)}" src="${esc(spriteUrl(pokemon.speciesId, { shiny: pokemon.shiny }))}">
          <div><strong>${esc(pokemon.name)}</strong><small>Lv. ${formatNumber(level)} · IV ${formatNumber(pokemon.ivTotal)}/192 · ×${number(pokemon.quality, 1).toFixed(2)}</small></div>
          <div class="pgx-power"><strong>${formatNumber(projected.power)}</strong><small>poder</small></div>
        </div>
        <div class="pgx-stat-list">${statRows(projected)}</div>
        <div class="pgx-source-note">${sourceLabel(projected.ivSource)}</div>
      </article>`;
  }

  function renderTeam(account) {
    const team = account.team || [];
    if (!team.length) return `<div class="pgx-view"><div class="pgx-empty">O time aparecerá aqui assim que a conta terminar o login e enviar a lista de Pokémon.</div></div>`;
    if (state.teamIndex >= team.length) state.teamIndex = 0;
    if (state.compareIndex >= team.length || state.compareIndex === state.teamIndex) state.compareIndex = team.length > 1 ? (state.teamIndex + 1) % team.length : 0;
    const selected = team[state.teamIndex];
    const compared = team[state.compareIndex];
    const selectedProjection = projectPokemon(selected, state.projectionLevel);
    const moves = selected && selected.species && selected.species.attacks || [];
    return `
      <div class="pgx-view">
        ${account.demo ? `<div><span class="pgx-demo-note">● Dados demonstrativos</span></div>` : ""}
        <div class="pgx-team-layout">
          <aside>
            <div class="pgx-section-head"><div><div class="pgx-eyebrow">Conta selecionada</div><h3>Time atual</h3></div><span>${team.length} / 6</span></div>
            <div class="pgx-roster">
              ${team.map((pokemon, index) => `
                <button type="button" class="pgx-roster-button${index === state.teamIndex ? " on" : ""}" data-pgx-team="${index}">
                  <img class="pgx-roster-sprite" alt="" src="${esc(spriteUrl(pokemon.speciesId, { shiny: pokemon.shiny }))}">
                  <span class="pgx-roster-copy"><strong>${esc(pokemon.name)}</strong><small>Lv. ${formatNumber(pokemon.level)} · qualidade ×${number(pokemon.quality, 1).toFixed(2)}</small></span>
                  <span class="pgx-iv-total"><strong>${formatNumber(pokemon.ivTotal)}</strong>/192</span>
                </button>
              `).join("")}
            </div>
          </aside>
          <div class="pgx-lab">
            <div class="pgx-lab-head">
              <div><div class="pgx-eyebrow">Laboratório de evolução</div><h2 class="pgx-title">${esc(selected.name)}</h2><div class="pgx-types">${((selected.types && selected.types.length ? selected.types : selected.species && selected.species.types) || []).map(type => `<span class="pgx-type">${esc(type)}</span>`).join("")}</div></div>
              <div class="pgx-controls">
                <div class="pgx-control"><label for="pgxLevel">Projetar no nível <output>${formatNumber(state.projectionLevel)}</output></label><input id="pgxLevel" type="range" min="1" max="500" value="${state.projectionLevel}"></div>
                <div class="pgx-control"><label for="pgxCompare">Comparar com</label><select id="pgxCompare">${team.map((pokemon, index) => `<option value="${index}"${index === state.compareIndex ? " selected" : ""}${index === state.teamIndex ? " disabled" : ""}>${esc(pokemon.name)} · IV ${formatNumber(pokemon.ivTotal)}</option>`).join("")}</select></div>
              </div>
            </div>
            <div class="pgx-projections">
              ${projectionCard(selected, state.projectionLevel, true)}
              ${projectionCard(compared, state.projectionLevel, false)}
            </div>
            <section class="pgx-section">
              <div class="pgx-section-head"><div><h3>Golpes da espécie</h3><span>Catálogo do Poke Idle World</span></div><span>${moves.length} golpes</span></div>
              ${moves.length ? `<div class="pgx-table-wrap"><table class="pgx-table"><thead><tr><th>Golpe</th><th>Tipo</th><th>Categoria</th><th>Poder</th><th>Nível</th></tr></thead><tbody>${moves.map(move => `<tr><td><strong>${esc(move.name)}</strong></td><td>${esc(move.type)}</td><td>${esc(move.category || "—")}</td><td>${move.power == null ? "—" : formatNumber(move.power)}</td><td>${move.learnLevel == null ? "—" : `Lv. ${formatNumber(move.learnLevel)}`}</td></tr>`).join("")}</tbody></table></div>` : `<div class="pgx-empty">Esta espécie não possui golpes cadastrados no catálogo atual.</div>`}
            </section>
            <div class="pgx-source-note">Projeção no nível ${formatNumber(state.projectionLevel)}: ${sourceLabel(selectedProjection.ivSource).toLowerCase()}. Espécie e qualidade permanecem fixas.</div>
          </div>
        </div>
      </div>`;
  }

  function itemGroup(item) {
    const category = String(item.category || "").toLowerCase();
    if (/ball|potion|heal|revive/.test(category)) return "battle";
    if (item.rare) return "attention";
    return "loot";
  }

  function isAttention(item) {
    const category = String(item.category || "").toLowerCase();
    if (item.rare) return true;
    if (/ball/.test(category)) return number(item.quantity) < 30;
    if (/potion|heal/.test(category)) return number(item.quantity) < 20;
    if (/revive/.test(category)) return number(item.quantity) < 10;
    return false;
  }

  function renderInventory(account) {
    const all = account.inventory || [];
    let filtered = all;
    if (state.inventoryFilter === "attention") filtered = all.filter(isAttention);
    else if (state.inventoryFilter === "battle") filtered = all.filter(item => itemGroup(item) === "battle");
    else if (state.inventoryFilter === "loot") filtered = all.filter(item => itemGroup(item) === "loot");
    return `
      <div class="pgx-view">
        ${account.demo ? `<div><span class="pgx-demo-note">● Dados demonstrativos</span></div>` : ""}
        <div class="pgx-inventory-head">
          <div><div class="pgx-eyebrow">Conta selecionada</div><h2 class="pgx-title">Inventário visual</h2><p class="pgx-subtitle">Sprite, quantidade e contexto em uma leitura.</p></div>
          <div class="pgx-filters">
            ${[["attention", "Atenção"], ["all", "Todos"], ["battle", "Batalha"], ["loot", "Loot"]].map(([value, label]) => `<button type="button" class="pgx-filter${state.inventoryFilter === value ? " on" : ""}" data-pgx-filter="${value}">${label}</button>`).join("")}
          </div>
        </div>
        ${filtered.length ? `<div class="pgx-inventory-grid">${filtered.slice(0, 120).map(item => {
          const icon = safeItemIcon(item.icon);
          const attention = isAttention(item);
          const detail = attention ? "Requer atenção" : item.npcPrice ? `${formatNumber(item.npcPrice)} gold/un.` : esc(item.category || "Item");
          return `<article class="pgx-item${attention ? " attention" : ""}"><span class="pgx-item-icon${icon ? "" : " missing"}">${icon ? `<img alt="" src="${esc(icon)}">` : ""}</span><span class="pgx-item-copy"><strong>${esc(item.name)}</strong><small>${detail}</small></span><span class="pgx-item-qty">${formatNumber(item.quantity)}<small>un.</small></span></article>`;
        }).join("")}</div>` : `<div class="pgx-empty">${state.inventoryFilter === "attention" ? "Nenhum item exige atenção agora." : "Nenhum item encontrado neste filtro."}</div>`}
      </div>`;
  }

  function render() {
    renderHeader();
    root.querySelectorAll("[data-pgx-tab]").forEach(button => button.classList.toggle("on", button.dataset.pgxTab === state.tab));
    const account = activeAccount();
    if (state.tab === "team") content.innerHTML = renderTeam(account);
    else if (state.tab === "inventory") content.innerHTML = renderInventory(account);
    else content.innerHTML = renderOverview(account);
  }

  async function readWebview(webview) {
    try {
      if (!webview || typeof webview.executeJavaScript !== "function") return null;
      const url = typeof webview.getURL === "function" ? webview.getURL() : "";
      if (!url || url === "about:blank") return null;
      const result = await webview.executeJavaScript(BRIDGE);
      return result && typeof result === "object" ? result : null;
    } catch {
      return null;
    }
  }

  async function refresh() {
    if (!state.open || state.refreshing) return;
    state.refreshing = true;
    try {
      const webviews = [...document.querySelectorAll("#grid webview")];
      const results = await Promise.all(webviews.map(readWebview));
      state.accounts = results.length ? results : [null];
      if (state.accountIndex >= state.accounts.length) state.accountIndex = 0;
      render();
    } finally {
      state.refreshing = false;
    }
  }

  function open() {
    state.open = true;
    root.classList.add("pgx-open");
    root.setAttribute("aria-hidden", "false");
    openButton.classList.add("on");
    render();
    refresh();
  }

  function close() {
    state.open = false;
    root.classList.remove("pgx-open");
    root.setAttribute("aria-hidden", "true");
    openButton.classList.remove("on");
  }

  openButton.addEventListener("click", () => state.open ? close() : open());
  root.querySelector("#pgxClose").addEventListener("click", close);
  root.querySelector("#pgxRefresh").addEventListener("click", refresh);
  accountSelect.addEventListener("change", () => {
    state.accountIndex = clamp(accountSelect.value, 0, Math.max(0, state.accounts.length - 1));
    state.teamIndex = 0;
    state.compareIndex = 1;
    render();
  });

  root.addEventListener("click", event => {
    const tab = event.target.closest("[data-pgx-tab]");
    if (tab) {
      state.tab = tab.dataset.pgxTab;
      render();
      return;
    }
    const account = event.target.closest("[data-pgx-account]");
    if (account) {
      state.accountIndex = clamp(account.dataset.pgxAccount, 0, Math.max(0, state.accounts.length - 1));
      state.teamIndex = 0;
      state.compareIndex = 1;
      render();
      return;
    }
    const team = event.target.closest("[data-pgx-team]");
    if (team) {
      state.teamIndex = clamp(team.dataset.pgxTeam, 0, 5);
      render();
      return;
    }
    const filter = event.target.closest("[data-pgx-filter]");
    if (filter) {
      state.inventoryFilter = filter.dataset.pgxFilter;
      render();
    }
  });

  root.addEventListener("input", event => {
    if (event.target.id === "pgxLevel") {
      state.projectionLevel = clamp(event.target.value, 1, 500);
      const output = event.target.closest(".pgx-control")?.querySelector("output");
      if (output) output.textContent = formatNumber(state.projectionLevel);
    }
  });

  root.addEventListener("change", event => {
    if (event.target.id === "pgxLevel") {
      state.projectionLevel = clamp(event.target.value, 1, 500);
      render();
    } else if (event.target.id === "pgxCompare") {
      state.compareIndex = clamp(event.target.value, 0, 5);
      render();
    }
  });

  root.addEventListener("error", event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const fallback = image.dataset.fallback;
    if (fallback && image.src !== fallback) {
      image.src = fallback;
      image.dataset.fallback = "";
      return;
    }
    image.style.display = "none";
    const wrapper = image.closest(".pgx-sprite-wrap, .pgx-item-icon");
    if (wrapper) wrapper.classList.add("missing");
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.open) close();
  });

  setInterval(() => {
    if (state.open) refresh();
  }, 4000);
})();
