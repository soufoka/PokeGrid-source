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
    tab: "all",
    accountIndex: 0,
    accounts: [],
    shellSnapshot: null,
    trend: [],
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
    const catches = (Array.isArray(P.catchLog) ? P.catchLog : []).slice(-120).map(c => ({
      name: text(c && c.n), speciesId: pick(c && c.sid, c && c.speciesId),
      iv: num(c && c.iv), quality: num(c && c.q), shiny: !!(c && c.sh),
      first: !!(c && c.fx), time: num(c && c.t)
    }));
    const shinyLog = (Array.isArray(P.shinyLog) ? P.shinyLog : []).slice(-120).map(s => ({
      name: text(s && s.n), speciesId: pick(s && s.sid, s && s.speciesId),
      captured: !!(s && s.cap), defeated: !!(s && s.def), time: num(s && s.t)
    }));
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
    const profiles = [
      { hunt: "Seafoam Cave", foe: [87, "Dewgong", 112, ["WATER", "ICE"]], gold: 84200, xp: 1380000, kills: 229, catches: 18, shiny: [2, 1], resources: [24, 83, 7] },
      { hunt: "Power Plant", foe: [82, "Magneton", 106, ["ELECTRIC", "STEEL"]], gold: 61700, xp: 1124000, kills: 193, catches: 11, shiny: [0, 0], resources: [68, 41, 12] },
      { hunt: "Safari Zone", foe: [127, "Pinsir", 118, ["BUG"]], gold: 93300, xp: 1542000, kills: 246, catches: 27, shiny: [1, 0], resources: [19, 57, 5] },
      { hunt: "Victory Road", foe: [112, "Rhydon", 126, ["GROUND", "ROCK"]], gold: 72800, xp: 1298000, kills: 207, catches: 14, shiny: [1, 1], resources: [44, 29, 9] }
    ];
    const profile = profiles[index % profiles.length];
    const sampleCaptures = [
      { name: "Dratini", speciesId: 147, iv: 177, quality: 1.53, shiny: false, first: true, time: Date.now() - 84000 },
      { name: "Shellder", speciesId: 90, iv: 151, quality: 1.31, shiny: false, first: false, time: Date.now() - 310000 },
      { name: "Horsea", speciesId: 116, iv: 168, quality: 1.47, shiny: index === 3, first: false, time: Date.now() - 690000 }
    ];
    return {
      live: false, demo: true,
      character: { name: `Conta ${index + 1}`, level: 138, gold: 0 },
      hunt: profile.hunt, team,
      foe: {
        speciesId: profile.foe[0], name: profile.foe[1], level: profile.foe[2],
        shiny: false, hp: { current: 34 + index * 11, max: 100 },
        species: demoSpecies(profile.foe[0], profile.foe[1], profile.foe[3], { hp: 90, atk: 70, def: 80, spa: 70, spd: 95, speed: 70 })
      },
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
      catches: sampleCaptures,
      shinyLog: profile.shiny[0] ? [{ name: index === 3 ? "Horsea" : "Dratini", speciesId: index === 3 ? 116 : 147, captured: !!profile.shiny[1], defeated: !profile.shiny[1], time: Date.now() - 720000 }] : [],
      attempts: [
        { name: "Dratini", speciesId: 147, attempts: 43 + index * 8, caught: index === 0 },
        { name: profile.foe[1], speciesId: profile.foe[0], attempts: 17 + index * 4, caught: false }
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
    const accounts = displayAccounts();
    accountSelect.innerHTML = accounts.map((account, index) => {
      const name = account && account.character && account.character.name
        ? account.character.name : `Conta ${index + 1}`;
      return `<option value="${index}"${index === state.accountIndex ? " selected" : ""}>${esc(name)}</option>`;
    }).join("") || `<option value="0">Conta 1</option>`;
    const label = liveBadge.querySelector("span:last-child");
    const liveCount = state.accounts.filter(account => account && account.live).length;
    liveBadge.classList.toggle("offline", liveCount === 0);
    label.textContent = liveCount ? `${liveCount} ${liveCount === 1 ? "conta ao vivo" : "contas ao vivo"}` : "Demonstração";
    accountSelect.disabled = state.tab === "all";
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
          <span class="pgx-mini-player">${leader ? renderSprite(leader, { back: true }) : `<span class="pgx-sprite-wrap missing"></span>`}<b>${esc(leader && leader.name || "Sem líder")}</b></span>
          <span class="pgx-mini-vs">VS</span>
          <span class="pgx-mini-enemy">${foe ? renderSprite(foe) : `<span class="pgx-sprite-wrap missing"></span>`}<b>${esc(foe && foe.name || "Sem encontro")}</b></span>
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
            <div class="pgx-section-head"><div><h3>Últimas capturas</h3><span>Todas as contas</span></div><span>${captures.length} recentes</span></div>
            <div class="pgx-capture-list">${captures.length ? captures.map(capture => `
              <button type="button" class="pgx-capture-row" data-pgx-account="${clamp(capture.accountIndex, 0, accounts.length - 1)}">
                <span class="pgx-capture-sprite">${capture.speciesId ? `<img alt="" src="${esc(spriteUrl(capture.speciesId, { shiny: capture.shiny }))}">` : "◈"}</span>
                <span><strong>${capture.shiny ? "✨ " : ""}${esc(capture.name || "Pokémon")}</strong><small>${esc(capture.account || `Conta ${number(capture.accountIndex) + 1}`)} · ${timeLabel(capture.time)}</small></span>
                <span><b>IV ${formatNumber(capture.iv)}</b><small>×${number(capture.quality, 1).toFixed(2)}${capture.first ? " · nova" : ""}</small></span>
              </button>`).join("") : `<div class="pgx-empty">Nenhuma captura registrada ainda.</div>`}</div>
            ${shares.length ? `<div class="pgx-subsection-title"><span>Compartilhados no chat</span><small>${shares.length} recentes</small></div><div class="pgx-shared-list">${shares.map(share => `
              <div><span class="pgx-capture-sprite">${share.speciesId ? `<img alt="" src="${esc(spriteUrl(share.speciesId, { shiny: share.shiny }))}">` : "◈"}</span><p><strong>${share.shiny ? "✨ " : ""}${esc(share.name || "Pokémon")}</strong><small>${esc(share.from || "Chat")} · Lv. ${formatNumber(share.level)}</small></p><b>IV ${formatNumber(share.iv)}<small>×${number(share.quality, 1).toFixed(2)}</small></b></div>`).join("")}</div>` : ""}
          </section>
          <section class="pgx-section">
            <div class="pgx-section-head"><div><h3>Shinies & tentativas</h3><span>Encontrados e alvos atuais</span></div><span>✨ ${shinies.filter(item => item.captured).length} capturados</span></div>
            <div class="pgx-shiny-list">
              ${shinies.length ? shinies.map(shiny => `<div class="pgx-shiny-row"><span>${shiny.captured ? "✨" : "◇"}</span><div><strong>${esc(shiny.name || "Shiny")}</strong><small>${esc(shiny.account || `Conta ${number(shiny.accountIndex) + 1}`)} · ${timeLabel(shiny.time)}</small></div><b class="${shiny.captured ? "pgx-positive" : "pgx-negative"}">${shiny.captured ? "capturado" : shiny.defeated ? "derrotado" : "perdido"}</b></div>`).join("") : `<div class="pgx-empty compact">Nenhum shiny registrado.</div>`}
            </div>
            <div class="pgx-attempts">${attempts.map(attempt => `<div><span>${attempt.speciesId ? `<img alt="" src="${esc(spriteUrl(attempt.speciesId))}">` : "?"}</span><p><strong>${esc(attempt.name || "Alvo")}</strong><small>${esc(attempt.account)}</small></p><b>${formatNumber(attempt.attempts)}<small>tentativas</small></b></div>`).join("") || `<div class="pgx-empty compact">Nenhuma tentativa registrada.</div>`}</div>
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
    if (state.tab === "all") content.innerHTML = renderAllAccounts();
    else if (state.tab === "team") content.innerHTML = renderTeam(account);
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

  window.__pgOpenExperience = tab => open(tab || "all");
  openButton.addEventListener("click", () => state.open ? close() : open("overview"));
  root.querySelector("#pgxClose").addEventListener("click", close);
  root.querySelector("#pgxRefresh").addEventListener("click", refresh);
  accountSelect.addEventListener("change", () => {
    state.accountIndex = clamp(accountSelect.value, 0, Math.max(0, state.accounts.length - 1));
    state.teamIndex = 0;
    state.compareIndex = 1;
    render();
  });

  root.addEventListener("click", event => {
    const focus = event.target.closest("[data-pgx-focus]");
    if (focus) {
      focusAccount(focus.dataset.pgxFocus);
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
