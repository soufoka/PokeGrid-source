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
        <span class="pgx-brand-copy"><strong>PokeGrid</strong><small>Central de comando</small></span>
      </div>
      <nav class="pgx-nav" aria-label="Áreas do novo painel">
        <button type="button" class="on" data-pgx-tab="all">Todas as contas</button>
        <button type="button" data-pgx-tab="overview">Conta em foco</button>
        <button type="button" data-pgx-tab="team">Time &amp; IV</button>
        <button type="button" data-pgx-tab="inventory">Inventário</button>
        <button type="button" data-pgx-tab="captures">Capturas</button>
      </nav>
      <div class="pgx-account-quick" id="pgxQuickAccounts" aria-label="Navegação rápida entre contas"></div>
      <div class="pgx-header-actions">
        <span class="pgx-live offline" id="pgxLive"><span class="pgx-live-dot"></span><span>Aguardando</span></span>
        <select class="pgx-account-select" id="pgxAccount" aria-label="Conta selecionada"></select>
        <button type="button" class="pgx-game-btn" id="pgxOpenGame" title="Fechar a Central e abrir esta conta no jogo">↙ Jogo</button>
        <button type="button" class="pgx-icon-btn" id="pgxRefresh" title="Atualizar dados">↻</button>
        <button type="button" class="pgx-icon-btn pgx-close" id="pgxClose" title="Fechar painel">✕</button>
      </div>
    </header>
    <main class="pgx-content" id="pgxContent"></main>
  `;
  document.body.appendChild(root);

  const content = root.querySelector("#pgxContent");
  const accountSelect = root.querySelector("#pgxAccount");
  const quickAccounts = root.querySelector("#pgxQuickAccounts");
  const liveBadge = root.querySelector("#pgxLive");
  const ivMath = window.PokeGridIvMath;
  const statKeys = ivMath.STAT_KEYS;
  const statLabels = { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", speed: "Spd" };

  const state = {
    open: false,
    tab: "all",
    accountIndex: 0,
    accounts: [],
    shellSnapshot: null,
    trend: [],
    teamIndex: 0,
    compareIndex: 1,
    projectionLevel: 500,
    inventoryFilter: "attention",
    inventoryAccount: "all",
    captureSearch: "",
    captureAccount: "all",
    captureMinIv: 0,
    captureMinQuality: 0,
    captureQualityTier: "all",
    capturePeriod: "all",
    captureKind: "all",
    captureSort: "recent",
    captureLimit: 100,
    spriteAliases: {},
    spriteNames: {},
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
    const spriteAliases = {};
    const spriteNames = {};
    for (const c of creatures) {
      const id = num(c && c.pokeId);
      if (id != null) speciesById.set(id, c);
      const key = text(c && c.name).toLowerCase().trim();
      const baseId = num(c && c.captureBase);
      const spriteId = baseId && baseId > 0 ? baseId : id;
      if (id != null && spriteId != null) spriteAliases[String(id)] = spriteId;
      if (key && spriteId != null) spriteNames[key] = spriteId;
      if (key) {
        const list = speciesByName.get(key) || [];
        list.push(c);
        speciesByName.set(key, list);
      }
    }
    const speciesFor = (p) => {
      const id = num(p && (p.speciesId ?? p.pokeId));
      if (id != null && speciesById.has(id)) return speciesById.get(id);
      const key = text(p && (p.name || p.speciesName || p.n)).toLowerCase().trim();
      const list = speciesByName.get(key) || [];
      if (list.length === 1) return list[0];
      const words = key.replace(/[_-]+/g, " ").split(/\\s+/).filter(Boolean);
      for (let i = 1; i < words.length; i++) {
        const suffix = speciesByName.get(words.slice(i).join(" ")) || [];
        if (suffix.length === 1) return suffix[0];
      }
      return null;
    };
    const speciesView = (c) => c ? ({
      id: num(c.pokeId),
      spriteId: (num(c.captureBase) || num(c.pokeId)),
      variant: !!(num(c.captureBase) && num(c.captureBase) !== num(c.pokeId)),
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
        spriteId: pick(c && c.captureBase, c && c.pokeId, p && p.speciesId, p && p.pokeId),
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

    const balls = ws.balls || {};
    const itemById = new Map(items.map(i => [num(i && i.id), i]));
    const rawInventory = (ws.inventory && Array.isArray(ws.inventory.items)) ? ws.inventory.items : [];
    const inventoryItems = rawInventory.map(entry => {
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
    const ballInventory = (Array.isArray(balls.catalog) ? balls.catalog : []).map(ball => {
      const id = num(ball && ball.id);
      let icon = text(ball && ball.iconUrl, 400);
      try { if (icon) icon = new URL(icon, location.origin).href; } catch { icon = ""; }
      return {
        itemId: "ball-" + id, quantity: Math.max(0, num(balls.counts && balls.counts[id]) || 0),
        name: text(ball && ball.name || ("Ball #" + id)), category: "ball",
        rare: id === 5 || id === 6, npcPrice: Math.max(0, num(ball && ball.priceGold) || 0),
        priceType: "compra", icon
      };
    }).filter(i => i.quantity > 0);
    const inventory = [...ballInventory, ...inventoryItems];

    const field = ws.field || {};
    const lastKill = ws["field-kill"] || {};
    const foeRaw = field.enemy || field.opponent || field.target || field.creature || field.pokemon || lastKill;
    const foeSpecies = speciesFor(foeRaw) || speciesFor(lastKill);
    const foe = (foeRaw && (foeRaw.name || foeRaw.speciesName || foeSpecies)) ? {
      speciesId: pick(foeRaw.speciesId, foeRaw.pokeId, foeSpecies && foeSpecies.pokeId),
      spriteId: pick(foeSpecies && foeSpecies.captureBase, foeSpecies && foeSpecies.pokeId, foeRaw.speciesId, foeRaw.pokeId),
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
    if (Array.isArray(balls.catalog)) {
      const activeBall = ch.autoCatchBallId || (ws["catch-result"] && ws["catch-result"].ballId);
      const selectedBall = balls.catalog.find(b => String(b.id) === String(activeBall));
      ballPrice = num(selectedBall && selectedBall.priceGold) || 0;
    }
    const balance = lootGold + (num(S.sellG) || 0) - (num(S.balls) || 0) * ballPrice - (num(S.supGold) || 0);
    const perHour = value => Math.round((num(value) || 0) / seconds * 3600);
    const catches = (Array.isArray(P.catchLog) ? P.catchLog : []).slice(-120).map(c => {
      const species = speciesFor({ speciesId: c && (c.sid || c.speciesId), name: c && c.n });
      return {
        name: text(c && c.n), speciesId: pick(c && c.sid, c && c.speciesId, species && species.pokeId),
        spriteId: pick(species && species.captureBase, species && species.pokeId),
        iv: num(c && c.iv), quality: num(c && c.q), shiny: !!(c && c.sh),
        first: !!(c && c.fx), time: num(c && c.t)
      };
    });
    const shinyLog = (Array.isArray(P.shinyLog) ? P.shinyLog : []).slice(-120).map(s => {
      const species = speciesFor({ speciesId: s && (s.sid || s.speciesId), name: s && s.n });
      return {
        name: text(s && s.n), speciesId: pick(s && s.sid, s && s.speciesId, species && species.pokeId),
        spriteId: pick(species && species.captureBase, species && species.pokeId),
        captured: !!(s && s.cap), defeated: !!(s && s.def), time: num(s && s.t)
      };
    });
    const attempts = (Array.isArray(P.usedList) ? P.usedList : []).slice(-120).map(u => ({
      name: text(u && (u.n || u.name)), speciesId: pick(u && u.sid, u && u.speciesId, u && u.pokeId),
      attempts: pick(u && u.n, u && u.attempts, u && u.used, u && u.count) || 0,
      caught: !!(u && (u.cap || u.caught))
    }));
    const shares = (Array.isArray(P.chatShares) ? P.chatShares : []).slice(-40).map(s => ({
      name: text(s && (s.n || s.name)), speciesId: pick(s && s.sid, s && s.speciesId),
      iv: pick(s && s.iv, s && s.ivTotal), quality: pick(s && s.q, s && s.quality),
      from: text(s && (s.fr || s.from || s.by)), level: num(s && (s.lv || s.level)),
      power: num(s && (s.pw || s.power)), shiny: !!(s && (s.sh || s.shiny)),
      time: num(s && s.t)
    }));
    const dropSummary = Object.keys(S.drops || {}).map(id => {
      const drop = S.drops[id] || {};
      const cat = catalogMap.get(String(id)) || {};
      const quantity = num(drop.qty) || 0;
      return {
        itemId: num(id), name: text(drop.name || cat.name || ("Item #" + id)),
        quantity, gold: quantity * (num(cat.npcPrice) || 0)
      };
    }).sort((a, b) => b.gold - a.gold).slice(0, 8);
    const resourceTotals = {
      balls: Object.values(balls.counts || {}).reduce((sum, value) => sum + (num(value) || 0), 0),
      potions: inventory.filter(i => /potion|heal/i.test(i.category)).reduce((sum, i) => sum + i.quantity, 0),
      revives: inventory.filter(i => /revive/i.test(i.category)).reduce((sum, i) => sum + i.quantity, 0)
    };
    const events = catches.slice(-4).reverse().map(c => ({
      title: (c.shiny ? "Shiny capturado: " : "Captura: ") + text(c.name || "Pokémon"),
      detail: "IV " + (c.iv ?? "?") + "/192 · qualidade ×" + (c.quality || 0).toFixed(2),
      time: c.time
    }));

    const hunt = text((ws["field-init"] && ws["field-init"].slug) || P.lastSlug || "")
      .replace(/[_-]+/g, " ").replace(/\\b\\w/g, m => m.toUpperCase());
    return {
      live: !!(ch.id || ch.name),
      character: {
        id: text(ch.id), name: text(ch.name), level: num(ch.level),
        gold: num(ch.gold), diamonds: num(ch.diamonds)
      },
      hunt, team, inventory, foe, events, catches, shinyLog, attempts, shares,
      spriteAliases, spriteNames,
      resources: resourceTotals, drops: dropSummary,
      metrics: {
        goldPerHour: perHour(balance), xpPerHour: perHour(S.xp),
        killsPerHour: perHour(S.kills), captures: num(S.captures) || 0,
        kills: num(S.kills) || 0, xp: num(S.xp) || 0, balance,
        seconds, shinyFound: num(S.shinyN) || 0, shinyCaptured: num(S.shinyCapN) || 0,
        ballsUsed: num(S.balls) || 0, potionsUsed: num(S.supN) || 0,
        sinceCatch: num(S.sinceCatch) || 0, lastCatchTime: num(S.lastCatchT) || 0
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
    const rawId = Math.trunc(number(id));
    const speciesId = Math.trunc(number(state.spriteAliases[String(rawId)], rawId));
    if (speciesId <= 0 || speciesId > 99999) return "";
    const { back = false, shiny = false, animated = false } = options;
    let folder = "";
    if (animated) folder = "versions/generation-v/black-white/animated/";
    if (back) folder += "back/";
    if (shiny) folder += "shiny/";
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${folder}${speciesId}.${animated ? "gif" : "png"}`;
  }

  function spriteIdFor(value) {
    const direct = number(value && (value.spriteId || value.speciesId));
    if (direct > 0) return number(state.spriteAliases[String(direct)], direct);
    const key = String(value && value.name || "").toLowerCase().trim();
    if (state.spriteNames[key]) return state.spriteNames[key];
    const words = key.replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean);
    for (let i = 1; i < words.length; i++) {
      const mapped = state.spriteNames[words.slice(i).join(" ")];
      if (mapped) return mapped;
    }
    return 0;
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
    const profiles = [
      { hunt: "Seafoam Cave", foe: [87, "Dewgong", 112, ["WATER", "ICE"]], gold: 84200, xp: 1380000, kills: 229, catches: 18, shiny: [2, 1], resources: [24, 83, 7] },
      { hunt: "Power Plant", foe: [82, "Magneton", 106, ["ELECTRIC", "STEEL"]], gold: 61700, xp: 1124000, kills: 193, catches: 11, shiny: [0, 0], resources: [68, 41, 12] },
      { hunt: "Safari Zone", foe: [127, "Pinsir", 118, ["BUG"]], gold: 93300, xp: 1542000, kills: 246, catches: 27, shiny: [1, 0], resources: [19, 57, 5] },
      { hunt: "Outland · Iron Bastion", foe: [10534, "Brave Steelix", 154, ["STEEL", "GROUND"], 208], gold: 72800, xp: 1298000, kills: 207, catches: 14, shiny: [1, 1], resources: [44, 29, 9] }
    ];
    const profile = profiles[index % profiles.length];
    const sampleCaptures = [
      { name: "Dratini", speciesId: 147, iv: 177, quality: 1.53, shiny: false, first: true, time: Date.now() - 84000 },
      { name: "Shellder", speciesId: 90, iv: 151, quality: 1.31, shiny: false, first: false, time: Date.now() - 310000 },
      index === 3
        ? { name: "Brave Steelix", speciesId: 10534, spriteId: 208, iv: 168, quality: 1.47, shiny: true, first: false, time: Date.now() - 690000 }
        : { name: "Horsea", speciesId: 116, iv: 168, quality: 1.47, shiny: false, first: false, time: Date.now() - 690000 }
    ];
    return {
      live: false, demo: true,
      character: { name: `Conta ${index + 1}`, level: 138, gold: 0 },
      hunt: profile.hunt, team,
      foe: {
        speciesId: profile.foe[0], spriteId: profile.foe[4] || profile.foe[0], name: profile.foe[1], level: profile.foe[2],
        shiny: false, hp: { current: 34 + index * 11, max: 100 },
        species: demoSpecies(profile.foe[0], profile.foe[1], profile.foe[3], { hp: 90, atk: 70, def: 80, spa: 70, spd: 95, speed: 70 })
      },
      inventory: [
        { itemId: "ball-4", name: "Ultra Ball", quantity: 24, category: "ball", rare: false, npcPrice: 130, priceType: "compra", icon: "https://poke.idleworld.online/assets/markitems/ultraball.png" },
        { itemId: 201, name: "Great Potion", quantity: 83, category: "heal", rare: false, npcPrice: 150, icon: "https://poke.idleworld.online/assets/markitems/great_potion.png" },
        { itemId: 205, name: "Revive", quantity: 7, category: "revive", rare: false, npcPrice: 600, icon: "https://poke.idleworld.online/assets/markitems/revive.png" },
        { itemId: 140, name: "Water Gem", quantity: 146, category: "loot", rare: false, npcPrice: 1, icon: "https://pokexguides.com/images/items/drops/Water_Gem.png" },
        { itemId: 65, name: "Gyarados Tail", quantity: 3, category: "loot", rare: true, npcPrice: 500, icon: "https://pokexguides.com/images/items/drops/Gyarados_Tail.png" },
        { itemId: 142, name: "Water Stone", quantity: 5, category: "stone", rare: true, npcPrice: 5000, icon: "https://pokexguides.com/images/items/evolutions/Water_Stone.gif" }
      ],
      events: [
        { title: "Dratini raro capturado", detail: "IV 177/192 · qualidade ×1,53", time: Date.now() },
        { title: "Estoque de Ultra Ball baixo", detail: "Restam 24 unidades", time: Date.now() - 240000 }
      ],
      catches: sampleCaptures,
      shinyLog: profile.shiny[0] ? [{ name: index === 3 ? "Brave Steelix" : "Dratini", speciesId: index === 3 ? 10534 : 147, spriteId: index === 3 ? 208 : 147, captured: !!profile.shiny[1], defeated: !profile.shiny[1], time: Date.now() - 720000 }] : [],
      attempts: [
        { name: "Dratini", speciesId: 147, attempts: 43 + index * 8, caught: index === 0 },
        { name: profile.foe[1], speciesId: profile.foe[0], spriteId: profile.foe[4] || profile.foe[0], attempts: 17 + index * 4, caught: false }
      ],
      shares: index === 0 ? [{ name: "Dragonite", speciesId: 149, iv: 182, quality: 1.71, from: "Trade chat", level: 144, power: 3894, shiny: false, time: Date.now() - 480000 }] : [], drops: [
        { itemId: 4, name: "Water Gem", quantity: 146, gold: 26572 },
        { itemId: 5, name: "Rare fragment", quantity: 3, gold: 3000 }
      ],
      resources: { balls: profile.resources[0], potions: profile.resources[1], revives: profile.resources[2] },
      metrics: {
        goldPerHour: profile.gold, xpPerHour: profile.xp, killsPerHour: profile.kills,
        captures: profile.catches, kills: profile.kills * 9, xp: profile.xp * 9,
        balance: profile.gold * 9, seconds: 32400, shinyFound: profile.shiny[0],
        shinyCaptured: profile.shiny[1], ballsUsed: 31 + index * 5,
        potionsUsed: 7 + index, sinceCatch: 12 + index * 7, lastCatchTime: Date.now() - 84000
      },
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

  function displayAccounts() {
    const hasLive = state.accounts.some(account => account && account.live);
    if (hasLive) return state.accounts.map((account, index) => account || {
      live: false, character: { name: `Conta ${index + 1}` }, hunt: "",
      team: [], inventory: [], catches: [], shinyLog: [], attempts: [], shares: [],
      resources: {}, drops: [], metrics: {}, foe: null
    });
    const count = Math.max(1, state.accounts.length || document.querySelectorAll("#grid webview").length || 4);
    return Array.from({ length: count }, (_, index) => demoAccount(index));
  }

  function projectPokemon(pokemon, level) {
    return ivMath.projectPokemon(pokemon, level);
  }

  function hpPercent(pokemon) {
    const current = number(pokemon && pokemon.hp && pokemon.hp.current);
    const max = number(pokemon && pokemon.hp && pokemon.hp.max);
    return max > 0 ? clamp(current / max * 100, 0, 100) : 100;
  }

  function renderSprite(pokemon, options = {}) {
    const spriteId = spriteIdFor(pokemon);
    const animated = options.animated
      ? spriteUrl(spriteId, { ...options, animated: true, shiny: !!(pokemon && pokemon.shiny) })
      : "";
    const still = spriteUrl(spriteId, { ...options, animated: false, shiny: !!(pokemon && pokemon.shiny) });
    if (!animated && !still) return `<span class="pgx-sprite-wrap missing"></span>`;
    return `<span class="pgx-sprite-wrap"><img class="pgx-sprite" alt="${esc(pokemon && pokemon.name)}" src="${esc(animated || still)}" data-fallback="${esc(still)}"></span>`;
  }

  function renderHeader() {
    const accounts = displayAccounts();
    accountSelect.innerHTML = accounts.map((account, index) => {
      const name = account && account.character && account.character.name
        ? account.character.name : `Conta ${index + 1}`;
      return `<option value="${index}"${index === state.accountIndex ? " selected" : ""}>${esc(name)}</option>`;
    }).join("") || `<option value="0">Conta 1</option>`;
    quickAccounts.innerHTML = accounts.map((account, index) => {
      const name = account && account.character && account.character.name || `Conta ${index + 1}`;
      return `<button type="button" class="${index === state.accountIndex ? "on" : ""}" data-pgx-quick="${index}" title="Ver ${esc(name)}"><span>${index + 1}</span><b>${esc(name)}</b><i class="${account.live ? "live" : ""}"></i></button>`;
    }).join("");
    const label = liveBadge.querySelector("span:last-child");
    const liveCount = state.accounts.filter(account => account && account.live).length;
    liveBadge.classList.toggle("offline", liveCount === 0);
    label.textContent = liveCount ? `${liveCount} ${liveCount === 1 ? "conta ao vivo" : "contas ao vivo"}` : "Demonstração";
    accountSelect.disabled = state.tab === "all";
    const gameButton = root.querySelector("#pgxOpenGame");
    if (gameButton) gameButton.textContent = `↙ Jogo ${state.accountIndex + 1}`;
  }

  function duration(value) {
    const seconds = Math.max(0, Math.round(number(value)));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`;
  }

  function timeLabel(value) {
    const timestamp = number(value);
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function bestCatch(account) {
    return (account.catches || []).slice().sort((a, b) =>
      number(b.iv) * Math.max(1, number(b.quality, 1)) -
      number(a.iv) * Math.max(1, number(a.quality, 1))
    )[0] || null;
  }

  function sparkline(values, color) {
    const safe = values.map(number);
    if (safe.length < 2) return `<div class="pgx-spark-empty">Coletando tendência…</div>`;
    const min = Math.min(...safe);
    const max = Math.max(...safe);
    const span = Math.max(1, max - min);
    const points = safe.map((value, index) => {
      const x = index / Math.max(1, safe.length - 1) * 100;
      const y = 34 - ((value - min) / span * 28);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    return `<svg class="pgx-spark" viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"></polyline></svg>`;
  }

  function renderMiniBattle(account, index) {
    const leader = (account.team || []).find(p => p.leader) || (account.team || [])[0] || null;
    const foe = account.foe || null;
    const theme = String(foe && foe.species && foe.species.types && foe.species.types[0] || "water").toLowerCase();
    return `
      <button type="button" class="pgx-battle-card" data-pgx-focus="${index}" data-type="${esc(theme)}" title="Abrir ${esc(account.character && account.character.name || `Conta ${index + 1}`)} em modo foco">
        <span class="pgx-battle-card-top">
          <span><strong>${esc(account.character && account.character.name || `Conta ${index + 1}`)}</strong><small>${esc(account.hunt || "Aguardando hunt")}</small></span>
          <span class="${account.live ? "live" : ""}">${account.live ? "● ao vivo" : "prévia"}</span>
        </span>
        <span class="pgx-mini-stage">
          <span class="pgx-mini-player">${leader ? renderSprite(leader, { back: true, animated: true }) : `<span class="pgx-sprite-wrap missing"></span>`}<b>${esc(leader && leader.name || "Sem líder")}</b></span>
          <span class="pgx-mini-vs">VS</span>
          <span class="pgx-mini-enemy">${foe ? renderSprite(foe, { animated: true }) : `<span class="pgx-sprite-wrap missing"></span>`}<b>${esc(foe && foe.name || "Sem encontro")}</b></span>
        </span>
        <span class="pgx-battle-card-metrics">
          <span><small>gold/h</small><strong>${number(account.metrics && account.metrics.goldPerHour) >= 0 ? "+" : ""}${compact(account.metrics && account.metrics.goldPerHour)}</strong></span>
          <span><small>XP/h</small><strong>${compact(account.metrics && account.metrics.xpPerHour)}</strong></span>
          <span><small>capturas</small><strong>${formatNumber(account.metrics && account.metrics.captures)}</strong></span>
        </span>
        <span class="pgx-focus-hint">Abrir conta em foco <b>↗</b></span>
      </button>`;
  }

  function renderPeriod(label, values, accent) {
    return `
      <article class="pgx-period" style="--period-accent:${accent}">
        <div><span>${label}</span><strong>${number(values && values.g) >= 0 ? "+" : ""}${compact(values && values.g)} gold</strong></div>
        <dl><div><dt>XP</dt><dd>${compact(values && values.x)}</dd></div><div><dt>Kills</dt><dd>${formatNumber(values && values.kl)}</dd></div><div><dt>Capturas</dt><dd>${formatNumber(values && values.c)}</dd></div><div><dt>Shiny</dt><dd>${formatNumber(values && values.sf)}/${formatNumber(values && values.sc)}</dd></div></dl>
      </article>`;
  }

  function renderAllAccounts() {
    const accounts = displayAccounts();
    const metrics = accounts.reduce((total, account) => {
      const current = account.metrics || {};
      total.gold += number(current.goldPerHour);
      total.xp += number(current.xpPerHour);
      total.kills += number(current.killsPerHour);
      total.captures += number(current.captures);
      total.shinyFound += number(current.shinyFound);
      total.shinyCaptured += number(current.shinyCaptured);
      return total;
    }, { gold: 0, xp: 0, kills: 0, captures: 0, shinyFound: 0, shinyCaptured: 0 });
    const shell = state.shellSnapshot || {};
    const periods = {
      today: shell.today || { g: 0, x: 0, kl: 0, c: 0, sf: 0, sc: 0 },
      week: shell.week || { g: 0, x: 0, kl: 0, c: 0, sf: 0, sc: 0 },
      allTime: shell.allTime || { g: 0, x: 0, kl: 0, c: 0, sf: 0, sc: 0 }
    };
    const liveCaptures = accounts.flatMap((account, accountIndex) => (account.catches || []).map(capture => ({
      ...capture, accountIndex, account: account.character && account.character.name || `Conta ${accountIndex + 1}`
    })));
    const captures = ((shell.captures && shell.captures.length) ? shell.captures : liveCaptures)
      .slice().sort((a, b) => number(b.time) - number(a.time)).slice(0, 12);
    const liveShinies = accounts.flatMap((account, accountIndex) => (account.shinyLog || []).map(shiny => ({
      ...shiny, accountIndex, account: account.character && account.character.name || `Conta ${accountIndex + 1}`
    })));
    const shinies = ((shell.shinies && shell.shinies.length) ? shell.shinies : liveShinies)
      .slice().sort((a, b) => number(b.time) - number(a.time)).slice(0, 8);
    const attempts = accounts.flatMap((account, accountIndex) => (account.attempts || []).map(attempt => ({
      ...attempt, accountIndex, account: account.character && account.character.name || `Conta ${accountIndex + 1}`
    }))).sort((a, b) => number(b.attempts) - number(a.attempts)).slice(0, 8);
    const shares = accounts.flatMap((account, accountIndex) => (account.shares || []).map(share => ({
      ...share, accountIndex, account: account.character && account.character.name || `Conta ${accountIndex + 1}`
    }))).sort((a, b) => number(b.time) - number(a.time)).slice(0, 6);
    const huntMeasurements = Object.entries(shell.huntStats || {}).flatMap(([characterId, hunts]) =>
      Object.entries(hunts && typeof hunts === "object" ? hunts : {}).map(([hunt, measurement]) => {
        const owner = accounts.find(account => String(account.character && account.character.id || "") === String(characterId));
        return {
          hunt: String(hunt || "").slice(0, 80),
          account: owner && owner.character && owner.character.name || "Conta",
          gph: number(measurement && measurement.gph),
          xph: number(measurement && measurement.xph),
          cph: number(measurement && measurement.cph),
          samples: number(measurement && measurement.n),
          time: number(measurement && measurement.t)
        };
      })
    ).sort((a, b) => b.gph - a.gph).slice(0, 6);
    const trend = state.trend.length > 1 ? state.trend : (shell.trend || []);
    const goals = shell.goals || {};
    const todayGold = number(periods.today.g);
    const todayCaptures = number(periods.today.c);
    const goldProgress = number(goals.g) > 0 ? clamp(todayGold / number(goals.g) * 100, 0, 100) : 0;
    const captureProgress = number(goals.c) > 0 ? clamp(todayCaptures / number(goals.c) * 100, 0, 100) : 0;
    return `
      <div class="pgx-view pgx-all-view">
        <div class="pgx-all-intro">
          <div><div class="pgx-eyebrow">Visão operacional</div><h1>Todas as contas</h1><p>Batalhas, desempenho, capturas e recursos em uma única leitura.</p></div>
          <span class="pgx-demo-note">${accounts.some(account => account.live) ? "● Atualização automática a cada 4 segundos" : "● Demonstração até as contas terminarem o login"}</span>
        </div>
        <div class="pgx-summary-metrics">
          <article><span>Saldo líquido / hora</span><strong>${metrics.gold >= 0 ? "+" : ""}${compact(metrics.gold)}</strong><small>somado entre as contas</small></article>
          <article><span>Experiência / hora</span><strong>${compact(metrics.xp)}</strong><small>ritmo global</small></article>
          <article><span>Abates / hora</span><strong>${compact(metrics.kills)}</strong><small>ritmo global</small></article>
          <article><span>Capturas</span><strong>${formatNumber(metrics.captures)}</strong><small>nesta sessão</small></article>
          <article><span>Shiny encontrados</span><strong>${formatNumber(metrics.shinyFound)} / ${formatNumber(metrics.shinyCaptured)}</strong><small>vistos / capturados</small></article>
          <article><span>Contas ativas</span><strong>${accounts.filter(account => account.live).length || accounts.length}<small> / ${accounts.length}</small></strong><small>${accounts.some(account => account.live) ? "conectadas agora" : "em demonstração"}</small></article>
        </div>
        <section>
          <div class="pgx-section-head pgx-major-head"><div><h2>Campos de batalha</h2><span>Clique em uma batalha para fechar este painel e ampliar a conta.</span></div><span>${accounts.length} campos</span></div>
          <div class="pgx-battle-grid">${accounts.map(renderMiniBattle).join("")}</div>
        </section>
        <div class="pgx-dashboard-grid">
          <section class="pgx-section pgx-performance">
            <div class="pgx-section-head"><div><h3>Desempenho por conta</h3><span>O essencial do antigo modo simples, agora no contexto.</span></div><span>sessão atual</span></div>
            <div class="pgx-table-wrap"><table class="pgx-table pgx-performance-table"><thead><tr><th>Conta</th><th>Hunt</th><th>Tempo</th><th>Gold/h</th><th>XP/h</th><th>Kills/h</th><th>Capturas</th><th>Melhor captura</th><th>Última</th></tr></thead><tbody>
              ${accounts.map((account, index) => {
                const best = bestCatch(account);
                const last = (account.catches || []).slice().sort((a, b) => number(b.time) - number(a.time))[0];
                return `<tr data-pgx-focus="${index}"><td><strong>${esc(account.character && account.character.name || `Conta ${index + 1}`)}</strong></td><td>${esc(account.hunt || "—")}</td><td>${duration(account.metrics && account.metrics.seconds)}</td><td class="${number(account.metrics && account.metrics.goldPerHour) >= 0 ? "pgx-positive" : "pgx-negative"}">${number(account.metrics && account.metrics.goldPerHour) >= 0 ? "+" : ""}${compact(account.metrics && account.metrics.goldPerHour)}</td><td>${compact(account.metrics && account.metrics.xpPerHour)}</td><td>${compact(account.metrics && account.metrics.killsPerHour)}</td><td>${formatNumber(account.metrics && account.metrics.captures)}</td><td>${best ? `${esc(best.name)} · IV ${formatNumber(best.iv)} · ×${number(best.quality, 1).toFixed(2)}` : "—"}</td><td>${last ? `${esc(last.name)} · ${formatNumber(account.metrics && account.metrics.sinceCatch)} bolas` : "—"}</td></tr>`;
              }).join("")}
            </tbody></table></div>
          </section>
          <aside class="pgx-section pgx-trend-panel">
            <div class="pgx-section-head"><div><h3>Tendência</h3><span>Última hora</span></div><span>ao vivo</span></div>
            <div class="pgx-trend-card"><div><span>Gold/h</span><strong>${metrics.gold >= 0 ? "+" : ""}${compact(metrics.gold)}</strong></div>${sparkline(trend.map(point => point.g), "#55e6d3")}</div>
            <div class="pgx-trend-card"><div><span>XP/h</span><strong>${compact(metrics.xp)}</strong></div>${sparkline(trend.map(point => point.x), "#5ca9ff")}</div>
          </aside>
        </div>
        <section class="pgx-section">
          <div class="pgx-section-head"><div><h3>Histórico consolidado</h3><span>Mesmos totais persistidos do modo simples.</span></div><span>até 90 dias</span></div>
          <div class="pgx-periods">${renderPeriod("Hoje", periods.today, "#55e6d3")}${renderPeriod("Últimos 7 dias", periods.week, "#5ca9ff")}${renderPeriod("Todo o histórico", periods.allTime, "#f4cb63")}</div>
          ${(number(goals.g) > 0 || number(goals.c) > 0) ? `<div class="pgx-goals">
            ${number(goals.g) > 0 ? `<div><span><b>Meta de gold</b><small>${compact(todayGold)} de ${compact(goals.g)}</small></span><i><b style="width:${goldProgress}%"></b></i></div>` : ""}
            ${number(goals.c) > 0 ? `<div><span><b>Meta de capturas</b><small>${formatNumber(todayCaptures)} de ${formatNumber(goals.c)}</small></span><i><b style="width:${captureProgress}%"></b></i></div>` : ""}
          </div>` : ""}
        </section>
        <div class="pgx-activity-grid">
          <section class="pgx-section">
            <div class="pgx-section-head"><div><h3>Últimas capturas</h3><span>Todas as contas</span></div><button type="button" class="pgx-section-action" data-pgx-open-captures>Ver histórico completo →</button></div>
            <div class="pgx-capture-list">${captures.length ? captures.map(capture => `
              <button type="button" class="pgx-capture-row" data-pgx-account="${clamp(capture.accountIndex, 0, accounts.length - 1)}">
                <span class="pgx-capture-sprite">${spriteIdFor(capture) ? `<img alt="" src="${esc(spriteUrl(spriteIdFor(capture), { shiny: capture.shiny }))}">` : "◈"}</span>
                <span><strong>${capture.shiny ? "✨ " : ""}${esc(capture.name || "Pokémon")}</strong><small>${esc(capture.account || `Conta ${number(capture.accountIndex) + 1}`)} · ${timeLabel(capture.time)}</small></span>
                <span><b>IV ${formatNumber(capture.iv)}</b><small>×${number(capture.quality, 1).toFixed(2)}${capture.first ? " · nova" : ""}</small></span>
              </button>`).join("") : `<div class="pgx-empty">Nenhuma captura registrada ainda.</div>`}</div>
            ${shares.length ? `<div class="pgx-subsection-title"><span>Compartilhados no chat</span><small>${shares.length} recentes</small></div><div class="pgx-shared-list">${shares.map(share => `
              <div><span class="pgx-capture-sprite">${spriteIdFor(share) ? `<img alt="" src="${esc(spriteUrl(spriteIdFor(share), { shiny: share.shiny }))}">` : "◈"}</span><p><strong>${share.shiny ? "✨ " : ""}${esc(share.name || "Pokémon")}</strong><small>${esc(share.from || "Chat")} · Lv. ${formatNumber(share.level)}</small></p><b>IV ${formatNumber(share.iv)}<small>×${number(share.quality, 1).toFixed(2)}</small></b></div>`).join("")}</div>` : ""}
          </section>
          <section class="pgx-section">
            <div class="pgx-section-head"><div><h3>Shinies & tentativas</h3><span>Encontrados e alvos atuais</span></div><span>✨ ${shinies.filter(item => item.captured).length} capturados</span></div>
            <div class="pgx-shiny-list">
              ${shinies.length ? shinies.map(shiny => `<div class="pgx-shiny-row"><span>${shiny.captured ? "✨" : "◇"}</span><div><strong>${esc(shiny.name || "Shiny")}</strong><small>${esc(shiny.account || `Conta ${number(shiny.accountIndex) + 1}`)} · ${timeLabel(shiny.time)}</small></div><b class="${shiny.captured ? "pgx-positive" : "pgx-negative"}">${shiny.captured ? "capturado" : shiny.defeated ? "derrotado" : "perdido"}</b></div>`).join("") : `<div class="pgx-empty compact">Nenhum shiny registrado.</div>`}
            </div>
            <div class="pgx-attempts">${attempts.map(attempt => `<div><span>${spriteIdFor(attempt) ? `<img alt="" src="${esc(spriteUrl(spriteIdFor(attempt)))}">` : "?"}</span><p><strong>${esc(attempt.name || "Alvo")}</strong><small>${esc(attempt.account)}</small></p><b>${formatNumber(attempt.attempts)}<small>tentativas</small></b></div>`).join("") || `<div class="pgx-empty compact">Nenhuma tentativa registrada.</div>`}</div>
          </section>
          <section class="pgx-section">
            <div class="pgx-section-head"><div><h3>Recursos por conta</h3><span>Estoque para manter o farm.</span></div><span>inventário ao vivo</span></div>
            <div class="pgx-resource-list">${accounts.map((account, index) => {
              const resources = account.resources || {};
              return `<button type="button" data-pgx-account="${index}"><span><strong>${esc(account.character && account.character.name || `Conta ${index + 1}`)}</strong><small>${esc(account.hunt || "Sem hunt")}</small></span><dl><div><dt>Pokébolas</dt><dd class="${number(resources.balls) < 30 ? "warn" : ""}">${formatNumber(resources.balls)}</dd></div><div><dt>Poções</dt><dd class="${number(resources.potions) < 20 ? "warn" : ""}">${formatNumber(resources.potions)}</dd></div><div><dt>Revives</dt><dd class="${number(resources.revives) < 10 ? "warn" : ""}">${formatNumber(resources.revives)}</dd></div></dl></button>`;
            }).join("")}</div>
            ${huntMeasurements.length ? `<div class="pgx-subsection-title"><span>Hunts medidas</span><small>ordenadas por gold/h</small></div><div class="pgx-hunt-list">${huntMeasurements.map(hunt => `<div><span><strong>${esc(hunt.hunt)}</strong><small>${esc(hunt.account)} · ${formatNumber(hunt.samples)} amostras</small></span><dl><div><dt>Gold/h</dt><dd class="${hunt.gph >= 0 ? "pgx-positive" : "pgx-negative"}">${hunt.gph >= 0 ? "+" : ""}${compact(hunt.gph)}</dd></div><div><dt>XP/h</dt><dd>${compact(hunt.xph)}</dd></div><div><dt>Cap/h</dt><dd>${number(hunt.cph).toFixed(1).replace(".", ",")}</dd></div></dl></div>`).join("")}</div>` : ""}
          </section>
        </div>
      </div>`;
  }

  function qualityName(value) {
    const quality = number(value);
    if (quality >= 4) return "Divina";
    if (quality >= 3) return "Anciã";
    if (quality >= 2) return "Mítica";
    if (quality >= 1.7) return "Lendária";
    if (quality >= 1.5) return "Épica";
    if (quality >= 1.3) return "Rara";
    if (quality >= 1.1) return "Incomum";
    if (quality >= 1) return "Comum";
    return "Fraca";
  }

  function qualityTier(value) {
    const quality = number(value);
    if (quality >= 4) return "divine";
    if (quality >= 3) return "ancient";
    if (quality >= 2) return "mythic";
    if (quality >= 1.7) return "legendary";
    if (quality >= 1.5) return "epic";
    if (quality >= 1.3) return "rare";
    if (quality >= 1.1) return "uncommon";
    if (quality >= 1) return "common";
    return "weak";
  }

  const qualityTierOptions = [
    ["all", "Todas as classes"],
    ["weak", "Fraca (< 1,0)"],
    ["common", "Comum (1,0–1,1)"],
    ["uncommon", "Incomum (1,1–1,3)"],
    ["rare", "Rara (1,3–1,5)"],
    ["epic", "Épica (1,5–1,7)"],
    ["legendary", "Lendária (1,7–2,0)"],
    ["mythic", "Mítica (2,0–3,0)"],
    ["ancient", "Anciã (3,0–4,0)"],
    ["divine", "Divina (4,0+)"]
  ];

  function captureDataset() {
    const accounts = displayAccounts();
    const live = accounts.flatMap((account, accountIndex) => (account.catches || []).map(capture => ({
      ...capture,
      accountIndex,
      account: account.character && account.character.name || `Conta ${accountIndex + 1}`,
      source: "live"
    })));
    const shell = state.shellSnapshot || {};
    const persisted = (shell.captures || []).map(capture => ({ ...capture, source: "history" }));
    const normalized = [...persisted, ...live].map(capture => {
      const accountByName = accounts.findIndex(account =>
        String(account.character && account.character.name || "").toLowerCase() ===
        String(capture.account || "").toLowerCase()
      );
      const rawIndex = Number.isFinite(Number(capture.accountIndex))
        ? Number(capture.accountIndex) : accountByName;
      const accountIndex = clamp(rawIndex >= 0 ? rawIndex : 0, 0, Math.max(0, accounts.length - 1));
      return {
        ...capture,
        accountIndex,
        account: String(capture.account || accounts[accountIndex]?.character?.name || `Conta ${accountIndex + 1}`).slice(0, 80),
        name: String(capture.name || "Pokémon").slice(0, 80),
        iv: number(capture.iv),
        quality: number(capture.quality),
        time: number(capture.time)
      };
    });
    const unique = new Map();
    for (const capture of normalized) {
      const key = [
        capture.accountIndex, capture.time, capture.name.toLowerCase(),
        capture.iv, capture.quality.toFixed(4), capture.shiny ? 1 : 0
      ].join("|");
      unique.set(key, { ...(unique.get(key) || {}), ...capture });
    }
    return [...unique.values()];
  }

  function filteredCaptures() {
    const now = Date.now();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const thresholds = {
      hour: now - 3600e3,
      today: startToday.getTime(),
      week: now - 7 * 864e5,
      month: now - 30 * 864e5
    };
    const query = state.captureSearch.trim().toLowerCase();
    const threshold = thresholds[state.capturePeriod] || 0;
    const list = captureDataset().filter(capture => {
      if (query && !capture.name.toLowerCase().includes(query)) return false;
      if (state.captureAccount !== "all" && number(capture.accountIndex) !== number(state.captureAccount)) return false;
      if (capture.iv < state.captureMinIv || capture.quality < state.captureMinQuality) return false;
      if (state.captureQualityTier !== "all" && qualityTier(capture.quality) !== state.captureQualityTier) return false;
      if (threshold && capture.time < threshold) return false;
      if (state.captureKind === "shiny" && !capture.shiny) return false;
      if (state.captureKind === "first" && !capture.first) return false;
      return true;
    });
    list.sort((a, b) => {
      if (state.captureSort === "iv") return b.iv - a.iv || b.time - a.time;
      if (state.captureSort === "quality") return b.quality - a.quality || b.time - a.time;
      if (state.captureSort === "potential") return (b.iv * b.quality) - (a.iv * a.quality) || b.time - a.time;
      if (state.captureSort === "oldest") return a.time - b.time;
      return b.time - a.time;
    });
    return list;
  }

  function renderCaptures() {
    const accounts = displayAccounts();
    const all = captureDataset();
    const captures = filteredCaptures();
    const shown = captures.slice(0, state.captureLimit);
    const averageIv = captures.length ? captures.reduce((sum, capture) => sum + capture.iv, 0) / captures.length : 0;
    const bestQuality = captures.reduce((best, capture) => Math.max(best, capture.quality), 0);
    const shinyCount = captures.filter(capture => capture.shiny).length;
    return `
      <div class="pgx-view pgx-captures-view">
        <div class="pgx-page-intro">
          <div><div class="pgx-eyebrow">Histórico completo</div><h1>Capturas</h1><p>Encontre os melhores Pokémon sem vasculhar conta por conta.</p></div>
          <div class="pgx-page-actions"><button type="button" class="pgx-section-action" data-pgx-sync-captures>↻ Sincronizar agora</button><div class="pgx-capture-total"><strong>${formatNumber(captures.length)}</strong><span>de ${formatNumber(all.length)} capturas</span></div></div>
        </div>
        <section class="pgx-capture-toolbar">
          <label class="wide"><span>Buscar Pokémon</span><div class="pgx-search-field"><b>⌕</b><input id="pgxCaptureSearch" type="search" value="${esc(state.captureSearch)}" placeholder="Steelix, Dragonite…"><button type="button" data-pgx-apply-captures>Filtrar</button></div></label>
          <label><span>Conta</span><select id="pgxCaptureAccount"><option value="all">Todas</option>${accounts.map((account, index) => `<option value="${index}"${String(state.captureAccount) === String(index) ? " selected" : ""}>${esc(account.character && account.character.name || `Conta ${index + 1}`)}</option>`).join("")}</select></label>
          <label><span>IV mínimo</span><input id="pgxCaptureIv" type="number" min="0" max="192" value="${state.captureMinIv || ""}" placeholder="0"></label>
          <label><span>Qualidade mínima</span><input id="pgxCaptureQuality" type="number" min="0" max="9" step=".01" value="${state.captureMinQuality || ""}" placeholder="0,00"></label>
          <label><span>Classe</span><select id="pgxCaptureQualityTier">${qualityTierOptions.map(([value, label]) => `<option value="${value}"${state.captureQualityTier === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>Período</span><select id="pgxCapturePeriod">${[["all", "Todo o histórico"], ["hour", "Última hora"], ["today", "Hoje"], ["week", "7 dias"], ["month", "30 dias"]].map(([value, label]) => `<option value="${value}"${state.capturePeriod === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>Tipo</span><select id="pgxCaptureKind">${[["all", "Todas"], ["shiny", "Somente shiny"], ["first", "Primeira da espécie"]].map(([value, label]) => `<option value="${value}"${state.captureKind === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
          <label><span>Ordenar por</span><select id="pgxCaptureSort">${[["recent", "Mais recentes"], ["oldest", "Mais antigas"], ["iv", "Maior IV"], ["quality", "Maior qualidade"], ["potential", "IV × qualidade"]].map(([value, label]) => `<option value="${value}"${state.captureSort === value ? " selected" : ""}>${label}</option>`).join("")}</select></label>
          <button type="button" class="pgx-clear-filters" data-pgx-clear-captures>Limpar filtros</button>
        </section>
        <div class="pgx-capture-kpis">
          <article><span>Resultados</span><strong>${formatNumber(captures.length)}</strong></article>
          <article><span>IV médio</span><strong>${averageIv.toFixed(1).replace(".", ",")}<small>/192</small></strong></article>
          <article><span>Melhor qualidade</span><strong>×${bestQuality.toFixed(2)}</strong><small>${qualityName(bestQuality)}</small></article>
          <article><span>Shinies</span><strong>${formatNumber(shinyCount)}</strong><small>nos resultados</small></article>
        </div>
        <section class="pgx-capture-table-panel">
          <div class="pgx-section-head"><div><h3>Pokémon capturados</h3><span>Clique na conta para abrir o contexto dela na Central.</span></div><span>mostrando ${formatNumber(shown.length)}</span></div>
          ${shown.length ? `<div class="pgx-table-wrap"><table class="pgx-table pgx-captures-table"><thead><tr><th>Pokémon</th><th>Conta</th><th>IV</th><th>Qualidade</th><th>IV × qualidade</th><th>Marcadores</th><th>Capturado em</th></tr></thead><tbody>${shown.map(capture => {
            const spriteId = spriteIdFor(capture);
            return `<tr>
              <td><div class="pgx-capture-pokemon"><span>${spriteId ? `<img alt="" src="${esc(spriteUrl(spriteId, { shiny: capture.shiny }))}">` : "◈"}</span><div><strong>${capture.shiny ? "✨ " : ""}${esc(capture.name)}</strong><small>${spriteId !== number(capture.speciesId) && number(capture.speciesId) > 10000 ? "Variante Outland · sprite da espécie base" : qualityName(capture.quality)}</small></div></div></td>
              <td><button type="button" class="pgx-account-link" data-pgx-view-account="${capture.accountIndex}">${esc(capture.account || `Conta ${capture.accountIndex + 1}`)} ↗</button></td>
              <td><strong class="pgx-iv-cell">${formatNumber(capture.iv)}<small>/192</small></strong></td>
              <td><strong>×${capture.quality.toFixed(2)}</strong><small class="pgx-table-sub">${qualityName(capture.quality)}</small></td>
              <td><strong>${formatNumber(capture.iv * capture.quality)}</strong></td>
              <td><div class="pgx-capture-tags">${capture.shiny ? "<span>✨ shiny</span>" : ""}${capture.first ? "<span>nova espécie</span>" : ""}${number(capture.speciesId) > 10000 ? "<span>Outland</span>" : ""}</div></td>
              <td><strong>${capture.time ? new Date(capture.time).toLocaleDateString("pt-BR") : "—"}</strong><small class="pgx-table-sub">${timeLabel(capture.time)}</small></td>
            </tr>`;
          }).join("")}</tbody></table></div>${shown.length < captures.length ? `<button type="button" class="pgx-load-more" data-pgx-more-captures>Mostrar mais ${formatNumber(Math.min(100, captures.length - shown.length))}</button>` : ""}` : `<div class="pgx-empty"><strong>Nenhuma captura encontrada.</strong><span>${all.length ? "Os filtros atuais removeram todos os resultados." : "A Central sincroniza o histórico e os registros vivos das quatro contas assim que uma captura entra no jogo."}</span></div>`}
        </section>
      </div>`;
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
            ${leader ? renderSprite(leader, { back: true, animated: true }) : `<span class="pgx-sprite-wrap missing"></span>`}
            <div class="pgx-nameplate">
              <div class="pgx-name-row"><strong>${esc(leader && leader.name || "Sem líder")}</strong><span>${leader && leader.level ? `Lv. ${formatNumber(leader.level)}` : "—"}</span></div>
              <div class="pgx-hp"><i style="width:${hpPercent(leader)}%"></i></div>
            </div>
          </div>
          <div class="pgx-fighter enemy">
            ${foe ? renderSprite(foe, { animated: true }) : `<span class="pgx-sprite-wrap missing"></span>`}
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
    if (source === "individual") return "IV individual informado pelo jogo";
    if (source === "observed-exact") return "IV individual inferido exatamente pelos stats atuais";
    if (source === "observed-range") return "IV individual limitado a uma faixa pelos stats atuais";
    if (source === "total-scenario") return "Cenário de projeção: o IV total não revela a distribuição individual";
    return "IV ainda indisponível";
  }

  function ivRangeLabel(projected, key) {
    const range = projected.ivRanges && projected.ivRanges[key];
    if (!range) return "IV ?";
    return range[0] === range[1] ? `IV ${formatNumber(range[0])}` : `IV ${formatNumber(range[0])}–${formatNumber(range[1])}`;
  }

  function statRows(projected) {
    const max = Math.max(1, ...statKeys.map(key => number(projected.stats[key])));
    return statKeys.map(key => `
      <div class="pgx-stat-row">
        <span>${statLabels[key]}</span>
        <span class="pgx-stat-bar"><i style="width:${Math.max(5, number(projected.stats[key]) / max * 100)}%"></i></span>
        <small>${ivRangeLabel(projected, key)}</small>
        <b>${projected.stats[key] == null ? "—" : formatNumber(projected.stats[key])}</b>
      </div>
    `).join("");
  }

  function projectionCard(entry, level, primary) {
    const pokemon = entry && entry.pokemon;
    if (!pokemon) return `<div class="pgx-empty">Selecione um Pokémon para comparar.</div>`;
    const projected = projectPokemon(pokemon, level);
    return `
      <article class="pgx-projection${primary ? " primary" : ""}">
        <div class="pgx-projection-head">
          <img alt="${esc(pokemon.name)}" src="${esc(spriteUrl(spriteIdFor(pokemon), { shiny: pokemon.shiny }))}">
          <div><strong>${esc(pokemon.name)}</strong><small>${esc(entry.accountName)} · Lv. ${formatNumber(level)} · IV ${formatNumber(pokemon.ivTotal)}/192 · ×${number(pokemon.quality, 1).toFixed(2)}</small></div>
          <div class="pgx-power"><strong>${projected.power == null ? "—" : formatNumber(projected.power)}</strong><small>poder</small></div>
        </div>
        <div class="pgx-stat-list">${statRows(projected)}</div>
        <div class="pgx-source-note">${sourceLabel(projected.ivSource)}</div>
      </article>`;
  }

  function combinedTeam() {
    return displayAccounts().flatMap((account, accountIndex) => {
      const accountName = account.character && account.character.name || `Conta ${accountIndex + 1}`;
      return (account.team || []).map((pokemon, pokemonIndex) => ({
        pokemon,
        pokemonIndex,
        accountIndex,
        accountName,
        demo: !!account.demo
      }));
    });
  }

  function renderTeam() {
    const accounts = displayAccounts();
    const team = combinedTeam();
    if (!team.length) return `<div class="pgx-view"><div class="pgx-empty">Os times aparecerão aqui assim que as contas terminarem o login e enviarem a lista de Pokémon.</div></div>`;
    if (state.teamIndex >= team.length) state.teamIndex = 0;
    if (state.compareIndex >= team.length || state.compareIndex === state.teamIndex) state.compareIndex = team.length > 1 ? (state.teamIndex + 1) % team.length : 0;
    const selectedEntry = team[state.teamIndex];
    const comparedEntry = team[state.compareIndex];
    const selected = selectedEntry.pokemon;
    const selectedProjection = projectPokemon(selected, state.projectionLevel);
    const moves = selected && selected.species && selected.species.attacks || [];
    const accountGroups = accounts.map((account, accountIndex) => ({
      account,
      accountIndex,
      entries: team.map((entry, flatIndex) => ({ ...entry, flatIndex })).filter(entry => entry.accountIndex === accountIndex)
    }));
    return `
      <div class="pgx-view">
        ${team.every(entry => entry.demo) ? `<div><span class="pgx-demo-note">● Dados demonstrativos</span></div>` : ""}
        <div class="pgx-team-layout">
          <aside class="pgx-team-sidebar">
            <div class="pgx-section-head"><div><div class="pgx-eyebrow">Visão consolidada</div><h3>Todos os times</h3></div><span>${team.length} Pokémon</span></div>
            <div class="pgx-roster pgx-roster-all">
              ${accountGroups.map(group => {
                const accountName = group.account.character && group.account.character.name || `Conta ${group.accountIndex + 1}`;
                return `<section class="pgx-roster-account">
                  <div class="pgx-roster-account-head"><span>${group.accountIndex + 1}</span><strong>${esc(accountName)}</strong><small>${group.entries.length}/6</small></div>
                  ${group.entries.length ? group.entries.map(entry => {
                    const pokemon = entry.pokemon;
                    return `<button type="button" class="pgx-roster-button${entry.flatIndex === state.teamIndex ? " on" : ""}" data-pgx-team="${entry.flatIndex}">
                      <img class="pgx-roster-sprite" alt="" src="${esc(spriteUrl(spriteIdFor(pokemon), { shiny: pokemon.shiny }))}">
                      <span class="pgx-roster-copy"><strong>${esc(pokemon.name)}</strong><small>Lv. ${formatNumber(pokemon.level)} · ×${number(pokemon.quality, 1).toFixed(2)} ${qualityName(pokemon.quality)}</small></span>
                      <span class="pgx-iv-total"><strong>${formatNumber(pokemon.ivTotal)}</strong>/192</span>
                    </button>`;
                  }).join("") : `<div class="pgx-roster-empty">Aguardando time desta conta</div>`}
                </section>`;
              }).join("")}
            </div>
          </aside>
          <div class="pgx-lab">
            <div class="pgx-lab-head">
              <div><div class="pgx-eyebrow">Laboratório · ${esc(selectedEntry.accountName)}</div><h2 class="pgx-title">${esc(selected.name)}</h2><div class="pgx-types">${((selected.types && selected.types.length ? selected.types : selected.species && selected.species.types) || []).map(type => `<span class="pgx-type">${esc(type)}</span>`).join("")}</div></div>
              <div class="pgx-controls">
                <div class="pgx-control"><label for="pgxLevel">Projetar no nível <output>${formatNumber(state.projectionLevel)}</output></label><input id="pgxLevel" type="range" min="1" max="500" value="${state.projectionLevel}"></div>
                <div class="pgx-control"><label for="pgxCompare">Comparar com qualquer conta</label><select id="pgxCompare">${team.map((entry, index) => `<option value="${index}"${index === state.compareIndex ? " selected" : ""}${index === state.teamIndex ? " disabled" : ""}>${esc(entry.accountName)} · ${esc(entry.pokemon.name)} · IV ${formatNumber(entry.pokemon.ivTotal)}</option>`).join("")}</select></div>
              </div>
            </div>
            <div class="pgx-projections">
              ${projectionCard(selectedEntry, state.projectionLevel, true)}
              ${projectionCard(comparedEntry, state.projectionLevel, false)}
            </div>
            <section class="pgx-section">
              <div class="pgx-section-head"><div><h3>Golpes da espécie</h3><span>Catálogo do Poke Idle World</span></div><span>${moves.length} golpes</span></div>
              ${moves.length ? `<div class="pgx-table-wrap"><table class="pgx-table"><thead><tr><th>Golpe</th><th>Tipo</th><th>Categoria</th><th>Poder</th><th>Nível</th></tr></thead><tbody>${moves.map(move => `<tr><td><strong>${esc(move.name)}</strong></td><td>${esc(move.type)}</td><td>${esc(move.category || "—")}</td><td>${move.power == null ? "—" : formatNumber(move.power)}</td><td>${move.learnLevel == null ? "—" : `Lv. ${formatNumber(move.learnLevel)}`}</td></tr>`).join("")}</tbody></table></div>` : `<div class="pgx-empty">Esta espécie não possui golpes cadastrados no catálogo atual.</div>`}
            </section>
            <div class="pgx-source-note">Projeção no nível ${formatNumber(state.projectionLevel)}: ${sourceLabel(selectedProjection.ivSource).toLowerCase()}. Espécie e qualidade permanecem fixas. Quando aparece uma faixa, os stats arredondados não permitem escolher um único growth com segurança.</div>
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

  function renderInventory() {
    const accounts = displayAccounts();
    const selectedIndexes = state.inventoryAccount === "all"
      ? accounts.map((_, index) => index)
      : [clamp(state.inventoryAccount, 0, Math.max(0, accounts.length - 1))];
    const all = selectedIndexes.flatMap(accountIndex => {
      const account = accounts[accountIndex];
      return (account.inventory || []).map(item => ({
        ...item,
        accountIndex,
        account: account.character && account.character.name || `Conta ${accountIndex + 1}`
      }));
    });
    let filtered = all;
    if (state.inventoryFilter === "attention") filtered = all.filter(isAttention);
    else if (state.inventoryFilter === "battle") filtered = all.filter(item => itemGroup(item) === "battle");
    else if (state.inventoryFilter === "loot") filtered = all.filter(item => itemGroup(item) === "loot");
    else if (state.inventoryFilter === "rare") filtered = all.filter(item => item.rare);
    const units = filtered.reduce((sum, item) => sum + number(item.quantity), 0);
    const battleUnits = filtered.filter(item => itemGroup(item) === "battle")
      .reduce((sum, item) => sum + number(item.quantity), 0);
    const rareUnits = filtered.filter(item => item.rare)
      .reduce((sum, item) => sum + number(item.quantity), 0);
    const accountGroups = selectedIndexes.map(accountIndex => ({
      accountIndex,
      account: accounts[accountIndex],
      items: filtered.filter(item => item.accountIndex === accountIndex)
    })).filter(group => group.items.length);
    const renderItem = item => {
      const icon = safeItemIcon(item.icon);
      const attention = isAttention(item);
      const detail = attention ? "Requer atenção" : item.npcPrice
        ? `${formatNumber(item.npcPrice)} gold/un. · ${item.priceType === "compra" ? "preço no jogo" : "valor NPC"}`
        : esc(item.category || "Item");
      return `<article class="pgx-item${attention ? " attention" : ""}"><span class="pgx-item-icon${icon ? "" : " missing"}">${icon ? `<img alt="" src="${esc(icon)}">` : ""}</span><span class="pgx-item-copy"><strong>${esc(item.name)}</strong><small>${detail}</small></span><span class="pgx-item-qty">${formatNumber(item.quantity)}<small>un.</small></span></article>`;
    };
    return `
      <div class="pgx-view pgx-inventory-view">
        <div class="pgx-inventory-head">
          <div><div class="pgx-eyebrow">Estoque consolidado</div><h2 class="pgx-title">Inventário de todas as contas</h2><p class="pgx-subtitle">Itens e Poké Balls do catálogo oficial, separados por treinador.</p></div>
          <div class="pgx-filters">
            ${[["attention", "Atenção"], ["all", "Todos"], ["battle", "Batalha"], ["loot", "Loot"], ["rare", "Raros"]].map(([value, label]) => `<button type="button" class="pgx-filter${state.inventoryFilter === value ? " on" : ""}" data-pgx-filter="${value}">${label}</button>`).join("")}
          </div>
        </div>
        <div class="pgx-scope-switch"><button type="button" class="${state.inventoryAccount === "all" ? "on" : ""}" data-pgx-inventory-account="all">Todas as contas</button>${accounts.map((account, index) => `<button type="button" class="${String(state.inventoryAccount) === String(index) ? "on" : ""}" data-pgx-inventory-account="${index}"><span>${index + 1}</span>${esc(account.character && account.character.name || `Conta ${index + 1}`)}</button>`).join("")}</div>
        <div class="pgx-inventory-kpis">
          <article><span>Contas no recorte</span><strong>${selectedIndexes.length}</strong></article>
          <article><span>Tipos de item</span><strong>${formatNumber(filtered.length)}</strong></article>
          <article><span>Unidades</span><strong>${formatNumber(units)}</strong></article>
          <article><span>Batalha / raros</span><strong>${formatNumber(battleUnits)}<small> / ${formatNumber(rareUnits)}</small></strong></article>
        </div>
        ${accountGroups.length ? `<div class="pgx-inventory-accounts">${accountGroups.map(group => {
          const accountName = group.account.character && group.account.character.name || `Conta ${group.accountIndex + 1}`;
          return `<section class="pgx-inventory-account"><div class="pgx-section-head"><div><h3><span class="pgx-account-number">${group.accountIndex + 1}</span>${esc(accountName)}</h3><span>${esc(group.account.hunt || (group.account.live ? "Sem hunt ativa" : "Dados demonstrativos"))}</span></div><button type="button" class="pgx-section-action" data-pgx-view-account="${group.accountIndex}">Abrir conta →</button></div><div class="pgx-inventory-grid">${group.items.slice(0, 160).map(renderItem).join("")}</div></section>`;
        }).join("")}</div>` : `<div class="pgx-empty"><strong>${state.inventoryFilter === "attention" ? "Nenhum item exige atenção agora." : "Nenhum item encontrado neste filtro."}</strong><span>Troque o filtro ou selecione outra conta.</span></div>`}
      </div>`;
  }

  function render() {
    renderHeader();
    root.querySelectorAll("[data-pgx-tab]").forEach(button => button.classList.toggle("on", button.dataset.pgxTab === state.tab));
    const account = activeAccount();
    if (state.tab === "all") content.innerHTML = renderAllAccounts();
    else if (state.tab === "captures") content.innerHTML = renderCaptures();
    else if (state.tab === "team") content.innerHTML = renderTeam();
    else if (state.tab === "inventory") content.innerHTML = renderInventory();
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
      for (const account of state.accounts) {
        if (!account) continue;
        Object.assign(state.spriteAliases, account.spriteAliases || {});
        Object.assign(state.spriteNames, account.spriteNames || {});
      }
      try {
        state.shellSnapshot = typeof window.__pgExperienceSnapshot === "function"
          ? window.__pgExperienceSnapshot() : null;
      } catch {
        state.shellSnapshot = null;
      }
      const source = displayAccounts();
      const aggregate = source.reduce((total, account) => ({
        g: total.g + number(account.metrics && account.metrics.goldPerHour),
        x: total.x + number(account.metrics && account.metrics.xpPerHour)
      }), { g: 0, x: 0 });
      state.trend.push({ t: Date.now(), ...aggregate });
      state.trend = state.trend.filter(point => point.t > Date.now() - 3600e3).slice(-900);
      if (state.accountIndex >= state.accounts.length) state.accountIndex = 0;
      render();
    } finally {
      state.refreshing = false;
    }
  }

  function open(tab) {
    if (tab) state.tab = tab;
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

  function focusAccount(index) {
    const selected = clamp(index, 0, Math.max(0, displayAccounts().length - 1));
    state.accountIndex = selected;
    close();
    if (typeof window.__pgFocusAccount === "function") {
      window.__pgFocusAccount(selected);
      return;
    }
    const panels = [...document.querySelectorAll("#grid .panel")];
    panels.forEach(panel => panel.classList.remove("expanded"));
    if (panels[selected]) panels[selected].classList.add("expanded");
  }

  function applyCaptureControls() {
    const search = root.querySelector("#pgxCaptureSearch");
    const account = root.querySelector("#pgxCaptureAccount");
    const iv = root.querySelector("#pgxCaptureIv");
    const quality = root.querySelector("#pgxCaptureQuality");
    const qualityTierSelect = root.querySelector("#pgxCaptureQualityTier");
    const period = root.querySelector("#pgxCapturePeriod");
    const kind = root.querySelector("#pgxCaptureKind");
    const sort = root.querySelector("#pgxCaptureSort");
    if (search) state.captureSearch = String(search.value || "").slice(0, 80);
    if (account) state.captureAccount = account.value;
    if (iv) state.captureMinIv = clamp(iv.value, 0, 192);
    if (quality) state.captureMinQuality = clamp(quality.value, 0, 9);
    if (qualityTierSelect) state.captureQualityTier = qualityTierSelect.value;
    if (period) state.capturePeriod = period.value;
    if (kind) state.captureKind = kind.value;
    if (sort) state.captureSort = sort.value;
    state.captureLimit = 100;
    render();
  }

  window.__pgOpenExperience = () => open("all");
  openButton.addEventListener("click", () => state.open ? close() : open("all"));
  root.querySelector("#pgxClose").addEventListener("click", close);
  root.querySelector("#pgxRefresh").addEventListener("click", refresh);
  accountSelect.addEventListener("change", () => {
    state.accountIndex = clamp(accountSelect.value, 0, Math.max(0, displayAccounts().length - 1));
    state.teamIndex = 0;
    state.compareIndex = 1;
    render();
  });

  root.addEventListener("click", event => {
    if (event.target.closest("#pgxOpenGame")) {
      focusAccount(state.accountIndex);
      return;
    }
    if (event.target.closest("[data-pgx-open-captures]")) {
      state.tab = "captures";
      state.captureLimit = 100;
      render();
      return;
    }
    if (event.target.closest("[data-pgx-sync-captures]")) {
      refresh();
      return;
    }
    const focus = event.target.closest("[data-pgx-focus]");
    if (focus) {
      focusAccount(focus.dataset.pgxFocus);
      return;
    }
    const quick = event.target.closest("[data-pgx-quick]");
    if (quick) {
      state.accountIndex = clamp(quick.dataset.pgxQuick, 0, Math.max(0, displayAccounts().length - 1));
      state.teamIndex = 0;
      state.compareIndex = 1;
      if (state.tab === "all") state.tab = "overview";
      else if (state.tab === "inventory") state.inventoryAccount = String(state.accountIndex);
      else if (state.tab === "captures") state.captureAccount = String(state.accountIndex);
      render();
      return;
    }
    const viewAccount = event.target.closest("[data-pgx-view-account]");
    if (viewAccount) {
      state.accountIndex = clamp(viewAccount.dataset.pgxViewAccount, 0, Math.max(0, displayAccounts().length - 1));
      state.teamIndex = 0;
      state.compareIndex = 1;
      state.tab = "overview";
      render();
      return;
    }
    if (event.target.closest("[data-pgx-apply-captures]")) {
      applyCaptureControls();
      return;
    }
    if (event.target.closest("[data-pgx-clear-captures]")) {
      state.captureSearch = "";
      state.captureAccount = "all";
      state.captureMinIv = 0;
      state.captureMinQuality = 0;
      state.captureQualityTier = "all";
      state.capturePeriod = "all";
      state.captureKind = "all";
      state.captureSort = "recent";
      state.captureLimit = 100;
      render();
      return;
    }
    if (event.target.closest("[data-pgx-more-captures]")) {
      state.captureLimit += 100;
      render();
      return;
    }
    const tab = event.target.closest("[data-pgx-tab]");
    if (tab) {
      state.tab = tab.dataset.pgxTab;
      render();
      return;
    }
    const account = event.target.closest("[data-pgx-account]");
    if (account) {
      state.accountIndex = clamp(account.dataset.pgxAccount, 0, Math.max(0, displayAccounts().length - 1));
      state.teamIndex = 0;
      state.compareIndex = 1;
      render();
      return;
    }
    const team = event.target.closest("[data-pgx-team]");
    if (team) {
      state.teamIndex = clamp(team.dataset.pgxTeam, 0, Math.max(0, combinedTeam().length - 1));
      render();
      return;
    }
    const inventoryAccount = event.target.closest("[data-pgx-inventory-account]");
    if (inventoryAccount) {
      state.inventoryAccount = inventoryAccount.dataset.pgxInventoryAccount;
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
      state.compareIndex = clamp(event.target.value, 0, Math.max(0, combinedTeam().length - 1));
      render();
    } else if (/^pgxCapture(Account|Iv|Quality|QualityTier|Period|Kind|Sort)$/.test(event.target.id)) {
      applyCaptureControls();
    }
  });

  root.addEventListener("keydown", event => {
    if (event.target.id === "pgxCaptureSearch" && event.key === "Enter") {
      event.preventDefault();
      applyCaptureControls();
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
