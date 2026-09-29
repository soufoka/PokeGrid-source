const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { createClient, script } = require('../src/portable-services');

function session(token = 'account-A') {
  let stored = JSON.stringify({ accessToken: token, refreshToken: token + '-refresh' });
  const calls = [], sent = [], listeners = { message: new Set(), close: new Set() };
  const socket = {
    readyState: 1,
    addEventListener: (t, fn) => listeners[t].add(fn),
    removeEventListener: (t, fn) => listeners[t].delete(fn),
    send: text => sent.push(JSON.parse(text))
  };
  const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  const w = {
    sessionStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
    __poke: { sock: socket }, setTimeout, clearTimeout,
    fetch: async (url, options) => { calls.push({ url, ...options, payload: options.body && JSON.parse(options.body) }); return reply({}); }
  };
  return { w, api: createClient(w), calls, sent, listeners, reply,
    emit: data => { for (const fn of [...listeners.message]) fn({ data: JSON.stringify(data) }); } };
}

test('injected script compiles independently and does not mount on login origins', () => {
  new vm.Script(script).runInNewContext({ window: { location: { origin: 'https://example.com' } } });
});
test('each webview uses only its own session', async () => {
  const a = session('A'), b = session('B');
  await Promise.all([a.api.request('/api/game/depot'), b.api.request('/api/game/depot')]);
  assert.equal(a.calls[0].headers.Authorization, 'Bearer A');
  assert.equal(b.calls[0].headers.Authorization, 'Bearer B');
  assert.equal(a.calls[0].method, 'GET');
  assert.deepEqual(a.sent, []);
});
test('401 refreshes once, preserves refresh token, and retries authenticated', async () => {
  const s = session(); let expired = true, refreshes = 0;
  s.w.fetch = async (url, opts) => {
    if (url === '/api/auth/refresh') { refreshes++; expired = false; return s.reply({ accessToken: 'new' }); }
    if (expired) return s.reply({}, 401);
    assert.equal(opts.headers.Authorization, 'Bearer new'); return s.reply({ gold: 42 });
  };
  const results = await Promise.all([s.api.request('/api/game/shop'), s.api.request('/api/game/depot')]);
  assert.equal(refreshes, 1); assert.equal(results[0].gold, 42);
  assert.equal(JSON.parse(s.w.sessionStorage.getItem()).refreshToken, 'account-A-refresh');
});
test('server errors are surfaced without repeated purchases', async () => {
  const s = session(); let calls = 0;
  s.w.fetch = async () => { calls++; return s.reply({ message: 'Saldo insuficiente' }, 400); };
  await assert.rejects(s.api.buyMarket({ id: 'p', kind: 'pokemon', price: 10 }, 1), /Saldo insuficiente/);
  assert.equal(calls, 1);
});
test('shop purchase uses bounded batches and reports partial completion', async () => {
  const s = session(); await s.api.buyShop({ id: 7 }, 'ball', 2001);
  assert.deepEqual(s.calls.map(c => c.payload), [{ ballId: 7, qty: 1000 }, { ballId: 7, qty: 1000 }, { ballId: 7, qty: 1 }]);
  let calls = 0; s.w.fetch = async () => ++calls === 1 ? s.reply({}) : s.reply({ message: 'Sem saldo' }, 400);
  await assert.rejects(s.api.buyShop({ id: 8 }, 'item', 1001), /1000 unidade.*Sem saldo/);
});
test('market uses distinct stack and Pokemon payloads', async () => {
  const s = session();
  await s.api.buyMarket({ id: 1, ids: [1,2,3], kind: 'item', refId: 50, price: 4, currency: 'GOLD', quantity: 3 }, 2);
  await s.api.buyMarket({ id: 9, kind: 'pokemon', price: 10 }, 1);
  assert.deepEqual(s.calls[0].payload, { action: 'buy-stack', kind: 'item', refId: 50, price: 4, currency: 'GOLD', quantity: 2, ids: [1,2] });
  assert.deepEqual(s.calls[1].payload, { action: 'buy', id: 9, quantity: 1 });
  assert.throws(() => s.api.buyMarket({ price: 0 }, 1), /compra direta/);
});
test('invalid quantities and native locks cannot create mutations', async () => {
  const s = session();
  for (const q of [0, -1, 1.5, NaN, Infinity, '']) await assert.rejects(s.api.buyShop({ id: 1 }, 'item', q), /inválido/);
  assert.throws(() => s.api.sell({ id: 1, quantity: 5, locked: true }, 1), /protegido/);
  assert.throws(() => s.api.move({ id: 1, isLocked: true }, 'store', false), /protegido/);
  assert.throws(() => s.api.sell({ id: 1, quantity: 5 }, 6), /inválido/);
  assert.deepEqual(s.calls, []);
});
test('item sale, item depot, ball listing and Pokemon listing match game API', async () => {
  const s = session();
  await s.api.sell({ id: 8, quantity: 3 }, 2);
  await s.api.move({ id: 8 }, 'withdraw', false);
  await s.api.advertise({ id: 8, kind: 'ball', quantity: 3 }, 2, 10, 'GOLD');
  await s.api.advertise({ id: 'poke-1', kind: 'pokemon' }, 1, 99, 'DIAMONDS');
  assert.deepEqual(s.calls.map(c => c.payload), [
    { items: [{ itemId: 8, qty: 2 }] }, { itemId: 8, dir: 'withdraw' },
    { action: 'sell', kind: 'ball', refId: 8, quantity: 2, price: 10, currency: 'GOLD' },
    { action: 'sell-pokemon', capturedId: 'poke-1', price: 99, currency: 'DIAMONDS' }
  ]);
  assert.deepEqual(s.sent, []);
});
test('Pokemon move waits for updated server state and cleans listeners', async () => {
  const s = session(); let complete = false;
  const pending = s.api.move({ id: 'p1' }, 'store', true).then(() => { complete = true; });
  assert.deepEqual(s.sent, [{ type: 'poke-store', pokeId: 'p1' }, { type: 'pokes-get' }]);
  s.emit({ type: 'pokes', list: [{ id: 'p1', team: true }] });
  await Promise.resolve(); assert.equal(complete, false);
  s.emit({ type: 'pokes', list: [{ id: 'p1', team: false }] });
  await pending; assert.equal(complete, true); assert.equal(s.listeners.message.size, 0); assert.equal(s.listeners.close.size, 0);
});
test('disconnected and timed-out socket requests fail and remove listeners', async () => {
  const s = session(); s.w.__poke.sock.readyState = 3;
  await assert.rejects(s.api.event('pokes', { type: 'pokes-get' }), /indisponível/);
  s.w.__poke.sock.readyState = 1;
  let timeout; s.w.setTimeout = fn => { timeout = fn; return 1; }; s.w.clearTimeout = () => {};
  const pending = s.api.event('pokes', { type: 'pokes-get' }); timeout();
  await assert.rejects(pending, /não confirmou/); assert.equal(s.listeners.message.size, 0);
});
test('inventory merges fresh quantities and native protection with catalog', async () => {
  const s = session(); s.w.fetch = async () => s.reply({ items: [{ id: 7, name: 'Loot', npcPrice: 5 }] });
  const pending = s.api.inventory(); s.emit({ type: 'inventory', items: [{ itemId: 7, quantity: 2, locked: true }] });
  const items = await pending; assert.equal(items[0].name, 'Loot'); assert.equal(items[0].quantity, 2); assert.equal(items[0].locked, true);
});

test('bulk sale sends all selected stacks in one request', async () => {
  const s = session();
  await s.api.sellMany([
    { entry: { id: 1, name: 'Band Aid', quantity: 3 }, count: 3 },
    { entry: { id: 2, name: 'Loot', quantity: 10 }, count: 4 }
  ]);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url, '/api/game/shop/sell');
  assert.deepEqual(s.calls[0].payload, { items: [{ itemId: 1, qty: 3 }, { itemId: 2, qty: 4 }] });
});
test('bulk sale validates the entire selection before sending anything', () => {
  const s = session(), good = { entry: { id: 1, quantity: 3 }, count: 3 };
  assert.throws(() => s.api.sellMany([]), /Selecione/);
  assert.throws(() => s.api.sellMany([good, { entry: { id: 2, quantity: 2, locked: true }, count: 1 }]), /protegido/);
  assert.throws(() => s.api.sellMany([good, { entry: { id: 2, quantity: 2 }, count: 3 }]), /inválido/);
  assert.throws(() => s.api.sellMany([good, good]), /repetido/);
  assert.deepEqual(s.calls, []);
});

// Minimal DOM for exercising actual injected click handlers without Electron or a live account.
function fakeDocument() {
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this.value = ''; this.disabled = false; this.checked = false; this.attrs = {}; this.text = ''; this.style = {}; }
    set textContent(text) { this.text = String(text); this.children = []; }
    get textContent() { return this.text + this.children.map(e => e.textContent).join(''); }
    setAttribute(k, v) { this.attrs[k] = v; }
    append(...nodes) { nodes.forEach(e => { e.parent = this; this.children.push(e); }); }
    appendChild(node) { this.append(node); return node; }
    prepend(node) { node.parent = this; this.children.unshift(node); }
    replaceChildren(...nodes) { this.text = ''; this.children = []; this.append(...nodes); }
    remove() { this.parent.children = this.parent.children.filter(e => e !== this); }
    attachShadow() { return this.shadowRoot = new Element('shadow'); }
    focus() {}
    getClientRects() { return this.hidden ? [] : [{}]; }
    get classList() { return {
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, on) => { this.className = this.className.split(' ').filter(n => n !== name).concat(on ? [name] : []).join(' '); }
    }; }
    querySelectorAll(selector) {
      const match = e => selector.split(',').some(s => s.startsWith('.') ? e.classList.contains(s.slice(1)) : e.tagName === s);
      return this.children.flatMap(e => [...(match(e) ? [e] : []), ...e.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    click() { if (!this.disabled) return this.onclick?.(); }
  }
  return { body: new Element('body'), createElement: tag => new Element(tag) };
}
async function saleUI() {
  const s = session(); s.w.document = fakeDocument(); s.w.location = { origin: 'https://poke.idleworld.online' };
  const inventory = [{ itemId: 1, quantity: 3 }, { itemId: 2, quantity: 4 }, { itemId: 3, quantity: 9, locked: true }];
  s.w.fetch = async (url, options) => {
    s.calls.push({ url, ...options, payload: options.body && JSON.parse(options.body) });
    return s.reply(url === '/game/items.json' ? { items: [
      { id: 1, name: 'Band Aid', npcPrice: 1 }, { id: 2, name: 'Loot', npcPrice: 2 }, { id: 3, name: 'Locked', npcPrice: 100 }
    ] } : { gold: 100, balls: [], items: [] });
  };
  s.w.__poke.sock.send = text => { const command = JSON.parse(text); s.sent.push(command); if (command.type === 'inv-get') queueMicrotask(() => s.emit({ type: 'inventory', items: inventory })); };
  vm.runInNewContext(script, { window: s.w });
  const root = s.w.document.body.children[0].shadowRoot;
  const find = label => root.querySelectorAll('button').find(b => b.textContent === label);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  find('🏪 Lojas').click(); await flush(); find('Vender itens').click(); await flush();
  return { ...s, root, find, flush, posts: () => s.calls.filter(c => c.method === 'POST') };
}
test('select all excludes locks, shows total, and cancellation sends nothing', async () => {
  const s = await saleUI(); s.find('Selecionar todos').click();
  const checks = s.root.querySelectorAll('input').filter(e => e.type === 'checkbox');
  assert.deepEqual(checks.map(e => e.checked), [true, true, false]);
  assert.match(s.root.querySelector('.sell-actions').textContent, /2 tipo\(s\).*7 unidade\(s\).*11 gold/);
  const pending = s.find('Vender selecionados').click();
  assert.match(s.root.querySelector('.confirm').textContent, /3× Band Aid/);
  assert.match(s.root.querySelector('.confirm').textContent, /Total: 11 gold/);
  s.find('Cancelar').click(); await pending;
  assert.equal(s.posts().length, 0);
  s.find('Limpar seleção').click(); assert.equal(s.find('Vender selecionados').disabled, true);
});
test('selected quantities are submitted together and cleared after success', async () => {
  const s = await saleUI(); s.find('Selecionar todos').click();
  const input = s.root.querySelectorAll('input').find(e => e.attrs['aria-label'] === 'Quantidade de Loot');
  input.value = '2'; input.oninput();
  const pending = s.find('Vender selecionados').click();
  s.find('Confirmar').click(); await pending;
  assert.equal(s.posts().length, 1);
  assert.deepEqual(s.posts()[0].payload, { items: [{ itemId: 1, qty: 3 }, { itemId: 2, qty: 2 }] });
  assert.equal(s.find('Vender selecionados').disabled, true);
});
test('sell entire item ignores partial quantity and sells only that stack', async () => {
  const s = await saleUI();
  const input = s.root.querySelectorAll('input').find(e => e.attrs['aria-label'] === 'Quantidade de Band Aid');
  input.value = '1'; input.oninput();
  const pending = s.find('Vender tudo deste item').click();
  assert.match(s.root.querySelector('.confirm').textContent, /3× Band Aid/);
  s.find('Confirmar').click(); await pending;
  assert.deepEqual(s.posts()[0].payload, { items: [{ itemId: 1, qty: 3 }] });
});
test('invalid selection cannot be sold and filtering does not silently deselect items', async () => {
  const s = await saleUI(); s.find('Selecionar todos').click();
  const search = s.root.querySelectorAll('input').find(e => e.type === 'search'); search.value = 'Band Aid'; search.oninput();
  assert.equal(s.root.querySelectorAll('.row')[1].hidden, true);
  const input = s.root.querySelectorAll('input').find(e => e.attrs['aria-label'] === 'Quantidade de Loot');
  input.value = '5'; input.oninput(); assert.equal(s.find('Vender selecionados').disabled, true);
  input.value = '4'; input.oninput();
  assert.match(s.root.querySelector('.sell-actions').textContent, /2 tipo\(s\)/);
  assert.equal(s.find('Vender selecionados').disabled, false);
});

test('market sorts numeric stats, nested Pokemon and missing values without modifying source', () => {
  const { api } = session();
  const entries = [
    { id: 1, price: 100, ivTotal: '9', quality: '×1,2', level: 20 },
    { id: 2, price: 2, pokemon: { ivTotal: 180, quality: 1.8, level: 100 } },
    { id: 3, price: 0, offerOnly: true }
  ];
  for (const sort of ['price-asc', 'iv-desc', 'quality-desc', 'level-desc'])
    assert.deepEqual(api.filterMarket(entries, { sort }).map(e => e.id), [2, 1, 3]);
  for (const sort of ['price-desc', 'iv-asc', 'quality-asc', 'level-asc'])
    assert.deepEqual(api.filterMarket(entries, { sort }).map(e => e.id), [1, 2, 3]);
  assert.deepEqual(entries.map(e => e.id), [1, 2, 3]);
  assert.deepEqual(api.filterMarket(entries, { sort: 'default' }).map(e => e.id), [1, 2, 3]);
});
test('market combines search, currency and minimum stats', () => {
  const { api } = session();
  const entries = [
    { name: 'Pikachu', currency: 'GOLD', ivTotal: 150, quality: 1.5, level: 50 },
    { name: 'Pikachu', currency: 'DD', pokemon: { ivTotal: 150, quality: 1.5, level: 50 } },
    { name: 'Pikachu', currency: 'GOLD', ivTotal: 100, quality: 1.2, level: 10 },
    { name: 'Loot', currency: 'GOLD' }
  ];
  assert.deepEqual(api.filterMarket(entries, { search: 'PIKA', currency: 'GOLD', iv: 140, quality: '1,5', level: 50 }), [entries[0]]);
  assert.deepEqual(api.filterMarket(entries, { currency: 'DIAMONDS' }), [entries[1]]);
  assert.equal(api.filterMarket(entries, { iv: 190 }).length, 0);
  assert.equal(api.filterMarket(entries, { iv: '', quality: '', level: '' }).length, 4);
});
test('market controls reorder and filter locally, reset filters and retain buying the correct listing', async () => {
  const s = await saleUI();
  s.w.fetch = async (url, options) => {
    s.calls.push({ url, ...options, payload: options.body && JSON.parse(options.body) });
    return s.reply(url.startsWith('/api/game/market?') ? { listings: [
      { id: 1, kind: 'pokemon', name: 'Pikachu', price: 100, currency: 'GOLD', ivTotal: 90, quality: 1.1, level: 20 },
      { id: 2, kind: 'pokemon', name: 'Eevee', price: 20, currency: 'GOLD', ivTotal: 180, quality: 1.8, level: 100 }
    ] } : {});
  };
  s.find('Mercado Global').click(); await s.flush();
  const control = label => s.root.querySelectorAll('select,input').find(e => e.attrs['aria-label'] === label);
  const names = () => s.root.querySelectorAll('.label').map(e => e.textContent);
  const before = s.calls.length;
  control('Ordenar anúncios').value = 'price-asc'; control('Ordenar anúncios').onchange();
  assert.match(names()[0], /^Eevee/);
  control('IV mínimo').value = '150'; control('IV mínimo').oninput();
  assert.equal(names().length, 1); assert.match(names()[0], /IV 180/);
  control('Nível mínimo').value = '200'; control('Nível mínimo').oninput();
  assert.equal(names().length, 0); assert.match(s.root.querySelector('.body').textContent, /Nenhum anúncio/);
  s.find('Limpar filtros').click(); assert.equal(names().length, 2); assert.match(names()[0], /^Pikachu/);
  assert.equal(s.calls.length, before);
  control('Ordenar anúncios').value = 'level-desc'; control('Ordenar anúncios').onchange();
  const pending = s.find('Comprar').click(); s.find('Confirmar').click(); await pending;
  assert.deepEqual(s.posts()[0].payload, { action: 'buy', id: 2, quantity: 1 });
});
