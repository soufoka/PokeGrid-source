(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PokeGridPortable = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Executed inside EACH game webview, never in the shared Electron renderer.
  function createClient(w) {
    let refreshing;
    const tokens = () => { try { return JSON.parse(w.sessionStorage.getItem('pokeweb:tokens') || 'null'); } catch { return null; } };
    async function request(url, body) {
      const send = () => {
        const token = tokens()?.accessToken;
        const auth = token ? 'Bearer ' + token : w.__poke?.auth;
        return w.fetch(url, { method: body === undefined ? 'GET' : 'POST', headers: {
          ...(auth ? { Authorization: auth } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      };
      let r = await send();
      if (r.status === 401 && tokens()?.refreshToken) {
        if (!refreshing) refreshing = (async () => {
          const before = tokens();
          const res = await w.fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: before.refreshToken }) });
          if (!res.ok) throw new Error('Sessão expirada. Entre novamente no jogo.');
          const fresh = await res.json();
          if (!fresh.accessToken || tokens()?.refreshToken !== before.refreshToken) throw new Error('A sessão mudou. Abra o painel novamente.');
          w.sessionStorage.setItem('pokeweb:tokens', JSON.stringify({ ...before, ...fresh }));
          if (w.__poke) w.__poke.auth = 'Bearer ' + fresh.accessToken;
        })().finally(() => { refreshing = null; });
        await refreshing;
        r = await send();
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'HTTP ' + r.status);
      return data;
    }
    function event(type, command, accept = () => true) {
      return new Promise((resolve, reject) => {
        const socket = w.__poke?.sock;
        if (!socket || socket.readyState !== 1) return reject(new Error('Conexão do jogo indisponível. Tente novamente.'));
        const finish = (error, value) => {
          w.clearTimeout(timer); socket.removeEventListener('message', receive); socket.removeEventListener('close', closed);
          error ? reject(error) : resolve(value);
        };
        const closed = () => finish(new Error('A conexão do jogo foi encerrada.'));
        const receive = e => {
          let m; try { m = JSON.parse(e.data); } catch { return; }
          if (m.type === type && accept(m)) finish(null, m);
        };
        const timer = w.setTimeout(() => finish(new Error('O jogo não confirmou a operação. Atualize antes de tentar novamente.')), 5000);
        socket.addEventListener('message', receive); socket.addEventListener('close', closed);
        try { for (const item of Array.isArray(command) ? command : [command]) socket.send(JSON.stringify(item)); } catch (e) { finish(e); }
      });
    }
    const locked = e => Boolean(e.locked ?? e.isLocked ?? e.protected ?? e.sellLocked);
    const integer = (value, max = Number.MAX_SAFE_INTEGER) => {
      const n = Number(value);
      if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error('Quantidade ou preço inválido.');
      return n;
    };
    const listings = payload => {
      if (Array.isArray(payload)) return payload;
      for (const key of ['listings', 'items', 'results', 'offers', 'data']) {
        if (payload?.[key]) { const found = listings(payload[key]); if (found.length) return found; }
      }
      return [];
    };
    const name = e => e.name || e.title || e.itemName || e.pokemonName || e.item?.name || e.pokemon?.name || e.product?.name || ('#' + (e.id ?? e.refId));
    const quantity = e => Number(e.quantity ?? e.qty ?? e.amount ?? 1);
    const marketNumber = value => {
      if (value == null || String(value).trim() === '') return null;
      const n = Number(String(value).trim().replace(/^[×x]\s*/i, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const marketStat = (e, key) => {
      const ref = e.pokemon || e.item || e.product || {};
      return marketNumber(e[key] ?? ref[key] ?? (key === 'ivTotal' ? e.iv ?? ref.iv : null));
    };
    const marketCurrency = e => /DIAM|^DD$/i.test(e.currency || e.currencyType || e.pokemon?.currency || '') ? 'DIAMONDS' : 'GOLD';
    function filterMarket(entries, filters = {}) {
      const minima = [['ivTotal', filters.iv], ['quality', filters.quality], ['level', filters.level]];
      const result = entries.filter(e => {
        if (!name(e).toLocaleLowerCase().includes(String(filters.search || '').trim().toLocaleLowerCase())) return false;
        if (filters.currency && marketCurrency(e) !== filters.currency) return false;
        return minima.every(([key, value]) => {
          const min = marketNumber(value), stat = marketStat(e, key);
          return min == null || (stat != null && stat >= min);
        });
      });
      const sorts = { 'price-asc': ['price', 1], 'price-desc': ['price', -1], 'iv-desc': ['ivTotal', -1], 'iv-asc': ['ivTotal', 1],
        'quality-desc': ['quality', -1], 'quality-asc': ['quality', 1], 'level-desc': ['level', -1], 'level-asc': ['level', 1] };
      const sort = sorts[filters.sort];
      if (sort) result.sort((a, b) => {
        const [key, direction] = sort;
        const value = e => key === 'price' && (e.offerOnly || !(marketStat(e, key) > 0)) ? null : marketStat(e, key);
        const av = value(a), bv = value(b);
        if (av == null) return bv == null ? 0 : 1;
        if (bv == null) return -1;
        return (av - bv) * direction;
      });
      return result;
    }
    function buyMarket(e, count) {
      const q = integer(count, e.kind === 'pokemon' ? 1 : quantity(e));
      if (e.offerOnly || !(Number(e.price) > 0)) throw new Error('Este anúncio não permite compra direta.');
      return request('/api/game/market/action', e.kind === 'pokemon'
        ? { action: 'buy', id: e.id, quantity: 1 }
        : { action: 'buy-stack', kind: e.kind, refId: e.refId, price: e.price, currency: e.currency, quantity: q, ids: (e.ids ?? [e.id]).slice(0, q) });
    }
    async function buyShop(e, kind, count) {
      let remaining = integer(count), bought = 0;
      try {
        while (remaining) {
          const qty = Math.min(remaining, 1000);
          await request('/api/game/shop/buy', { [kind === 'ball' ? 'ballId' : 'itemId']: e.id, qty });
          remaining -= qty; bought += qty;
        }
      } catch (error) { throw new Error(`${bought} unidade(s) comprada(s). ${error.message} Atualize o saldo antes de repetir.`); }
    }
    async function inventory() {
      const [inv, catalog] = await Promise.all([event('inventory', { type: 'inv-get' }), request('/game/items.json')]);
      const items = Array.isArray(catalog) ? catalog : catalog.items || [];
      return (inv.items || []).map(e => ({ ...items.find(it => String(it.id) === String(e.itemId)), ...e, id: e.itemId, kind: 'item' }));
    }
    function sell(e, count) {
      return sellMany([{ entry: e, count }]);
    }
    function sellMany(selection) {
      if (!Array.isArray(selection) || !selection.length) throw new Error('Selecione pelo menos um item.');
      const ids = new Set();
      const items = selection.map(({ entry, count }) => {
        if (locked(entry)) throw new Error('Item protegido pelo cadeado do jogo.');
        if (entry.id == null || ids.has(String(entry.id))) throw new Error('Item inválido ou repetido na seleção.');
        ids.add(String(entry.id));
        return { itemId: entry.id, qty: integer(count, quantity(entry)) };
      });
      return request('/api/game/shop/sell', { items });
    }
    function advertise(e, count, price, currency) {
      if (locked(e) || e.starter || e.market || e.listed) throw new Error('Este item ou Pokémon está protegido ou indisponível.');
      if (!['GOLD', 'DIAMONDS'].includes(currency)) throw new Error('Moeda inválida.');
      const p = integer(price), q = integer(count, e.kind === 'pokemon' ? 1 : quantity(e));
      return request('/api/game/market/action', e.kind === 'pokemon'
        ? { action: 'sell-pokemon', capturedId: e.id, price: p, currency }
        : { action: 'sell', kind: e.kind, refId: e.id, quantity: q, price: p, currency });
    }
    function move(e, dir, pokemon) {
      if (!['store', 'withdraw'].includes(dir)) throw new Error('Direção inválida.');
      if (!pokemon) {
        if (locked(e)) throw new Error('Item protegido pelo cadeado do jogo.');
        return request('/api/game/depot/move', { itemId: e.id, dir });
      }
      return event('pokes', [{ type: dir === 'store' ? 'poke-store' : 'poke-withdraw', pokeId: e.id }, { type: 'pokes-get' }],
        m => (m.list || []).some(p => p.id === e.id && Boolean(p.team) === (dir === 'withdraw')));
    }
    return { request, event, inventory, locked, integer, listings, name, quantity, marketStat, filterMarket, buyMarket, buyShop, sell, sellMany, advertise, move };
  }

  function mount(w, createClient) {
    if (w.__pgPortable || w.location.origin !== 'https://poke.idleworld.online') return;
    w.__pgPortable = true;
    const d = w.document, api = createClient(w);
    // Shadow DOM keeps the game's styles/observers from interpreting these as native windows.
    const host = d.createElement('div'); host.id = 'pg-portable';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = d.createElement('style');
    style.textContent = `:host{font:13px system-ui;color:#e6edf3}*{box-sizing:border-box}button,input,select{font:inherit;color:inherit;background:#172638;border:1px solid #3a5069;border-radius:6px;padding:7px}button{cursor:pointer}button:hover{background:#29415c}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #76c7ff}nav{position:fixed;right:8px;top:65px;z-index:10040;display:flex;gap:4px} .overlay{position:fixed;inset:0;background:#0009;z-index:10060;display:flex;align-items:center;justify-content:center;padding:8px}.panel{background:#0d1824;border:1px solid #39526d;border-radius:10px;width:760px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 30px #0009}header,.controls{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px;border-bottom:1px solid #283a4e}header strong{flex:1} .status{padding:8px 12px;white-space:pre-wrap}.body{overflow:auto;padding:10px;min-height:80px}.row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #273749}.label{flex:1;min-width:140px;overflow-wrap:anywhere}.row input{width:80px}.row small{display:block;color:#a9bfd4;margin-top:3px}input[type=search]{min-width:90px;flex:1}.error{color:#ffacac}.confirm{position:absolute;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;padding:12px}.confirm>div{max-width:430px;background:#172638;padding:20px;border:1px solid #56708e;border-radius:8px;white-space:pre-wrap}.confirm button{margin:8px 6px 0 0}h3{margin:8px 0} .active{border-color:#79bfff}`;
    style.textContent += '[hidden]{display:none!important}';
    style.textContent += '.row input[type=checkbox]{width:18px;height:18px}.sell-actions{padding:10px;border-bottom:1px solid #283a4e;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.sell-actions small{flex-basis:100%;color:#a9bfd4}.confirm>div{max-height:85vh;overflow:auto}.confirm p{overflow-wrap:anywhere}';
    shadow.appendChild(style);
    const el = (tag, text, cls) => { const e = d.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
    const button = (text, fn) => { const e = el('button', text); e.type = 'button'; e.onclick = fn; return e; };
    const nav = el('nav'); nav.setAttribute('aria-label', 'Serviços portáteis');
    const shops = button('🏪 Lojas', () => open('shop')); shops.title = 'Lojas e Mercado Global durante a hunt';
    nav.append(shops, button('📦 Depot', () => open('depot'))); shadow.append(nav);
    d.body.appendChild(host);
    let current;
    function open(initial) {
      if (current) { if (current.busy) return; current.close(); }
      const state = { busy: false, version: 0, mode: initial, closed: false };
      current = state;
      const overlay = el('div', undefined, 'overlay'), panel = el('section', undefined, 'panel');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Serviços portáteis');
      const header = el('header'), controls = el('div', undefined, 'controls'), status = el('div', '', 'status'), body = el('div', undefined, 'body');
      const sellActions = el('div', undefined, 'sell-actions'); sellActions.hidden = true;
      const marketControls = el('div', undefined, 'controls'); marketControls.hidden = true;
      let marketData = null;
      function select(label, choices) {
        const node = el('select'); node.setAttribute('aria-label', label); node.title = label;
        for (const [value, text] of choices) { const option = el('option', text); option.value = value; node.append(option); }
        node.value = choices[0][0]; marketControls.append(node); node.onchange = () => renderMarket(); return node;
      }
      const order = select('Ordenar anúncios', [['default', 'Ordem original'], ['price-asc', 'Menor preço'], ['price-desc', 'Maior preço'],
        ['iv-desc', 'Maior IV'], ['iv-asc', 'Menor IV'], ['quality-desc', 'Maior qualidade'], ['quality-asc', 'Menor qualidade'],
        ['level-desc', 'Maior nível'], ['level-asc', 'Menor nível']]);
      const currencyFilter = select('Filtrar moeda', [['', 'Todas as moedas'], ['GOLD', 'Gold'], ['DIAMONDS', 'Diamantes']]);
      function minimum(label, max, step) {
        const node = el('input'); node.type = 'number'; node.min = '0'; if (max) node.max = String(max); node.step = String(step);
        node.placeholder = label; node.title = label; node.setAttribute('aria-label', label); node.style.width = '110px';
        node.oninput = () => renderMarket(); marketControls.append(node); return node;
      }
      const minIv = minimum('IV mínimo', 192, 1), minQuality = minimum('Qualidade mínima', null, 0.01), minLevel = minimum('Nível mínimo', null, 1);
      marketControls.append(button('Limpar filtros', () => {
        order.value = 'default'; currencyFilter.value = ''; search.value = ''; minIv.value = minQuality.value = minLevel.value = ''; renderMarket();
      }));
      status.setAttribute('role', 'status');
      const close = () => { if (state.busy) return; state.closed = true; state.version++; overlay.remove(); if (current === state) current = null; shops.focus(); };
      state.close = close;
      header.append(el('strong', 'PokeGrid · Serviços portáteis'), button('Atualizar', () => load()), button('Fechar', close));
      const tabs = [['shop', 'Loja'], ['sell', 'Vender itens'], ['market', 'Mercado Global'], ['advertise', 'Anunciar'], ['depot', 'Depot'], ['pokemon', 'Box Pokémon']];
      for (const [key, label] of tabs) controls.append(button(label, () => { if (!state.busy) { state.mode = key; load(); } }));
      const category = el('select'); category.setAttribute('aria-label', 'Categoria do mercado');
      for (const [value, label] of [['All','Tudo'],['Items','Itens'],['Stones','Pedras'],['Poke Balls','Poké Bolas'],['Diamonds','Diamantes'],['Pokemon','Pokémon']]) { const o = el('option', label); o.value = value; category.append(o); }
      category.onchange = () => load();
      const search = el('input'); search.type = 'search'; search.placeholder = 'Buscar pelo nome'; search.setAttribute('aria-label', 'Buscar pelo nome');
      search.oninput = () => {
        if (state.mode === 'market') { renderMarket(); return; }
        for (const row of body.querySelectorAll('.row')) row.hidden = !row.textContent.toLowerCase().includes(search.value.toLowerCase());
      };
      controls.append(category, search); panel.append(header, controls, marketControls, status, sellActions, body); overlay.append(panel); shadow.append(overlay);
      overlay.onkeydown = e => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        if (e.key === 'Tab') {
          const nodes = [...panel.querySelectorAll('button,input,select')].filter(e => !e.disabled && !e.hidden && e.getClientRects().length);
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (e.shiftKey && shadow.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && shadow.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      };
      function message(text, error = false) { status.textContent = text; status.className = 'status' + (error ? ' error' : ''); }
      function confirm(text) {
        return new Promise(resolve => {
          const cover = el('div', undefined, 'confirm'), box = el('div');
          const finish = value => { cover.remove(); resolve(value); };
          const cancel = button('Cancelar', () => finish(false));
          box.append(el('p', text), cancel, button('Confirmar', () => finish(true))); cover.append(box); panel.append(cover); cancel.focus();
          cover.onkeydown = e => {
            if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
            if (e.key === 'Tab') { e.preventDefault(); const bs = box.querySelectorAll('button'); (shadow.activeElement === bs[0] ? bs[1] : bs[0]).focus(); }
          };
        });
      }
      async function action(text, fn) {
        if (state.busy) return;
        state.busy = true;
        const inputs = [...panel.querySelectorAll('button,input,select')];
        const disabled = inputs.map(e => e.disabled); inputs.forEach(e => { e.disabled = true; });
        let completed = false;
        try {
          if (await confirm(text)) { message('Processando…'); await fn(); completed = true; }
        } catch (e) { message(e.message, true); }
        finally { state.busy = false; inputs.forEach((e, i) => { e.disabled = disabled[i]; }); }
        if (completed) { await load(); if (!status.classList.contains('error')) message('Operação concluída.'); }
      }
      function row(entry, detail) {
        const r = el('div', undefined, 'row'), label = el('div', api.name(entry), 'label');
        if (detail) label.append(el('small', detail)); r.append(label); body.append(r); return r;
      }
      function count(r, max = 1000000) {
        const n = el('input'); n.type = 'number'; n.min = '1'; n.max = String(max); n.step = '1'; n.value = '1'; n.setAttribute('aria-label', 'Quantidade'); r.append(n); return n;
      }
      const currencyLabel = v => /DIAM|^DD$/i.test(v || '') ? 'diamantes' : 'gold';
      const stats = e => e.kind === 'pokemon' || e.speciesId ? `Nv ${e.level ?? '?'} · IV ${e.ivTotal ?? '?'} · Qualidade ${e.quality ?? '?'}${e.shiny ? ' · Shiny' : ''}` : '';
      function renderMarket() {
        if (state.mode !== 'market' || marketData === null || state.busy || state.closed) return;
        const visible = api.filterMarket(marketData, { search: search.value, sort: order.value, currency: currencyFilter.value,
          iv: minIv.value, quality: minQuality.value, level: minLevel.value });
        body.replaceChildren();
        message(`${visible.length} de ${marketData.length} anúncios · Preço por unidade, na moeda do anúncio.`);
        for (const e of visible) {
          const q = e.kind === 'pokemon' ? 1 : api.quantity(e), price = Number(e.price || 0);
          const details = [['level', 'Nv'], ['ivTotal', 'IV'], ['quality', 'Qualidade']]
            .map(([key, label]) => api.marketStat(e, key) == null ? '' : `${label} ${api.marketStat(e, key)}`).filter(Boolean).join(' · ');
          const r = row(e, `${q} disponíveis · ${price} ${currencyLabel(e.currency)} / unidade${details ? ' · ' + details : ''}`), n = count(r, q);
          const b = button(e.offerOnly || price <= 0 ? 'Somente oferta' : 'Comprar', () => action(`Comprar ${n.value}× ${api.name(e)} por ${Number(n.value) * price} ${currencyLabel(e.currency)}?`, () => api.buyMarket(e, n.value)));
          b.disabled = !!e.offerOnly || price <= 0; r.append(b);
        }
        if (!visible.length) body.append(el('p', 'Nenhum anúncio corresponde aos filtros.'));
      }
      function renderSell(entries) {
        const rows = [], summary = el('span');
        const format = value => Number(value).toLocaleString('pt-BR');
        const chosen = () => rows.filter(r => r.check.checked && !r.check.disabled);
        function selection() {
          return chosen().map(r => ({ entry: r.entry, count: api.integer(r.input.value, api.quantity(r.entry)) }));
        }
        function submit(selected) {
          try {
            if (!selected.length) throw new Error('Selecione pelo menos um item.');
            const total = selected.reduce((sum, s) => sum + s.count * Number(s.entry.npcPrice), 0);
            const details = selected.map(s => `${format(s.count)}× ${api.name(s.entry)} · ${format(s.count * Number(s.entry.npcPrice))} gold`).join('\n');
            return action(`Vender os seguintes itens?\n\n${details}\n\nTotal: ${format(total)} gold`, () => api.sellMany(selected));
          } catch (e) { message(e.message, true); }
        }
        const sellSelected = button('Vender selecionados', () => {
          try { return submit(selection()); } catch (e) { message(e.message, true); }
        });
        function update() {
          try {
            const selected = selection(), units = selected.reduce((sum, s) => sum + s.count, 0);
            const total = selected.reduce((sum, s) => sum + s.count * Number(s.entry.npcPrice), 0);
            summary.textContent = `${selected.length} tipo(s) · ${format(units)} unidade(s) · ${format(total)} gold`;
            sellSelected.disabled = !selected.length;
          } catch {
            summary.textContent = 'Corrija as quantidades dos itens selecionados.';
            sellSelected.disabled = true;
          }
        }
        const all = button('Selecionar todos', () => { rows.forEach(r => { if (!r.check.disabled) r.check.checked = true; }); update(); });
        const clear = button('Limpar seleção', () => { rows.forEach(r => { r.check.checked = false; }); update(); });
        sellActions.append(all, clear, sellSelected, summary,
          el('small', 'Selecionar todos inclui os itens fora da busca, exceto os protegidos. Ajuste as quantidades antes de vender.'));
        for (const e of entries) {
          const r = row(e, `${format(e.quantity)} disponíveis · ${format(e.npcPrice)} gold / unidade`);
          const check = el('input'); check.type = 'checkbox'; check.setAttribute('aria-label', 'Selecionar ' + api.name(e));
          check.disabled = api.locked(e); r.prepend(check);
          const n = count(r, e.quantity); n.value = String(e.quantity); n.disabled = api.locked(e);
          n.setAttribute('aria-label', 'Quantidade de ' + api.name(e));
          rows.push({ entry: e, check, input: n }); check.onchange = update; n.oninput = update;
          const sellOne = button(api.locked(e) ? '🔒 Protegido' : 'Vender', () => {
            try { return submit([{ entry: e, count: api.integer(n.value, e.quantity) }]); }
            catch (error) { message(error.message, true); }
          });
          const sellStack = button('Vender tudo deste item', () => submit([{ entry: e, count: api.integer(e.quantity) }]));
          sellOne.disabled = sellStack.disabled = api.locked(e); r.append(sellOne, sellStack);
        }
        all.disabled = !rows.some(r => !r.check.disabled); clear.disabled = all.disabled;
        if (!entries.length) body.append(el('p', 'Nenhum item vendável disponível.'));
        update();
      }
      async function load() {
        if (state.busy || state.closed) return;
        const version = ++state.version, mode = state.mode;
        category.hidden = mode !== 'market'; body.replaceChildren(); message('Carregando…');
        marketControls.hidden = mode !== 'market'; marketData = null;
        sellActions.replaceChildren(); sellActions.hidden = mode !== 'sell';
        controls.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', tabs[i][0] === mode));
        try {
          let data;
          if (mode === 'shop') data = await api.request('/api/game/shop');
          if (mode === 'sell') data = await api.inventory();
          if (mode === 'market') data = api.listings(await api.request('/api/game/market?category=' + encodeURIComponent(category.value)));
          if (mode === 'depot') data = await api.request('/api/game/depot');
          if (mode === 'pokemon') data = (await api.event('pokes', { type: 'pokes-get' })).list || [];
          if (mode === 'advertise') {
            const [items, balls, pokes] = await Promise.all([api.inventory(), api.request('/api/game/balls'), api.event('pokes', { type: 'pokes-get' })]);
            const catalog = Array.isArray(balls.catalog) ? balls.catalog : balls.catalog?.balls || [];
            data = [...items, ...catalog.map(b => ({ ...b, kind: 'ball', quantity: Number(balls.counts?.[b.id] || 0) })), ...(pokes.list || []).map(p => ({ ...p, kind: 'pokemon', quantity: 1 }))];
          }
          if (version !== state.version || state.closed) return;
          message(mode === 'shop' ? `Saldo: ${Number(data.gold || 0).toLocaleString('pt-BR')} gold` : '');
          if (mode === 'shop') for (const [kind, entries] of [['ball', data.balls || []], ['item', data.items || []]]) {
            for (const e of entries.filter(e => !e.infinite && !['idle ball', 'master ball'].includes(String(e.name).toLowerCase()))) {
              const price = Number(e.priceGold || 0), r = row(e, `${price.toLocaleString('pt-BR')} gold / unidade`), n = count(r);
              r.append(button('Comprar', () => action(`Comprar ${n.value}× ${api.name(e)} por ${Number(n.value) * price} gold?`, () => api.buyShop(e, kind, n.value))));
            }
          }
          if (mode === 'sell') renderSell(data.filter(e => e.quantity > 0 && e.npcPrice > 0 && !['heal','revive','stone'].includes(e.category)));
          if (mode === 'market') marketData = data;
          if (mode === 'advertise') for (const e of data.filter(e => e.quantity > 0 && !e.starter && !e.market && !e.listed)) {
            const r = row(e, `${e.quantity} disponíveis · ${stats(e)}`), n = count(r, e.quantity), price = count(r);
            price.setAttribute('aria-label', 'Preço unitário'); price.title = 'Preço unitário';
            const currency = el('select'); currency.setAttribute('aria-label', 'Moeda');
            for (const value of ['GOLD','DIAMONDS']) { const o = el('option', currencyLabel(value)); o.value = value; currency.append(o); }
            const b = button('Anunciar', () => action(`Anunciar ${n.value}× ${api.name(e)} por ${price.value} ${currencyLabel(currency.value)} por unidade?\n${stats(e)}`, () => api.advertise(e, n.value, price.value, currency.value)));
            b.disabled = api.locked(e); r.append(currency, b);
          }
          if (mode === 'depot' || mode === 'pokemon') {
            const pokemon = mode === 'pokemon';
            const groups = pokemon ? [['Equipe', data.filter(p => p.team && !String(p.id).startsWith('team-')), 'store'], ['Box', data.filter(p => !p.team), 'withdraw']]
              : [['Mochila', data.inventory || [], 'store'], [`Depot (${(data.depot || []).length}/${data.maxSlots ?? '?'})`, data.depot || [], 'withdraw']];
            for (const [title, entries, dir] of groups) {
              body.append(el('h3', title));
              if (!entries.length) body.append(el('p', 'Vazio.'));
              for (const e of entries) {
                const r = row(e, pokemon ? stats(e) : `${api.quantity(e)} unidades`), label = dir === 'store' ? 'Depositar' : 'Retirar';
                const b = button(label, () => action(`${label} ${api.name(e)}${pokemon ? '' : ' (pilha inteira)'}?`, () => api.move(e, dir, pokemon)));
                b.disabled = !pokemon && api.locked(e); r.append(b);
              }
            }
          }
          if (!body.children.length) body.append(el('p', 'Nenhum resultado disponível.'));
          search.oninput();
        } catch (e) { if (version === state.version && !state.closed) message(e.message, true); }
      }
      load(); header.querySelector('button').focus();
    }
  }
  return { createClient, script: '(' + mount.toString() + ')(window, ' + createClient.toString() + ');' };
});
