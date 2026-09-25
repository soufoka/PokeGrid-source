// Cacada de bugs da 1.5.21 (27 achados confirmados por verificador cetico). Aqui o codigo REAL do
// index.html e do main.js e extraido e executado com stubs. Roda com: node test/cacada-1521.test.js
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const mj = fs.readFileSync(path.join(raiz, 'main.js'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const re = /<script>([\s\S]*?)<\/script>/g; let mm, b = '';
while ((mm = re.exec(s))) { if (mm[1].length > b.length) b = mm[1]; }
try { new Function(b); ok(true, 'index parseia'); } catch (e) { ok(false, 'parse: ' + e.message); }
const entre = (src, a, fim, incluiFim) => { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a.slice(0, 50)); const j = src.indexOf(fim, i + a.length); if (j < 0) throw new Error('nao achei o fim: ' + fim.slice(0, 50)); return src.slice(i, incluiFim ? j + fim.length : j); };
const LOGIN = 'https://poke.idleworld.online/login', PLAY = 'https://poke.idleworld.online/play';
const espera = () => new Promise((r) => setTimeout(r, 20));

(async () => {
  console.log('\n--- [alta] userscript nunca entra na tela de login (ali o app digita a senha do cofre) ---');
  {
    const bloco = entre(b, '  const usNoLoginUrl = ', '  function renderScriptsList() {');
    const monta = (url, respostaMarca) => {
      const exec = []; const erros = [];
      const wv = { getURL: () => url, executeJavaScript: (c) => { exec.push(c); return Promise.resolve(c.indexOf('__pgUS') >= 0 && c.length < 200 ? respostaMarca.shift() : undefined); } };
      const api = new Function('LOGIN_URL', 'allScripts', 'scriptsOn', 'getScriptCode', 'webviews', 'off', 'window',
        bloco + '\nreturn { injectScripts, applyScriptToAll, runUS, usNoLoginUrl };')(
        LOGIN, () => [{ id: 'u1', name: 'Auto' }], { u1: true }, async () => 'const x = await Promise.resolve(1); // termina em comentario', [wv], [false], { pokeAPI: { logError: (o, d) => erros.push(o + ': ' + d) } });
      return { wv, exec, erros, api };
    };
    const login = monta(LOGIN, []);
    await login.api.injectScripts(login.wv); await espera();
    ok(login.exec.length === 0, 'no /login nada e injetado (' + login.exec.length + ' execucoes)');
    ok(login.wv.__pgSemScripts === true, 'e o painel fica marcado pra receber os scripts quando sair do login');
    await login.api.applyScriptToAll('u1'); await espera();
    ok(login.exec.length === 0, 'ligar um script com o painel parado no login tambem nao injeta');
    const soLiga = monta(LOGIN, []);
    await soLiga.api.applyScriptToAll('u1'); await espera();
    ok(soLiga.exec.length === 0 && soLiga.wv.__pgSemScripts === true, 'ligar com o painel no login marca o painel: o script entra quando sair do login (antes ficava sem ate o proximo reload)');
    const u = login.api.usNoLoginUrl;
    ok([LOGIN, LOGIN + '?next=1', 'https://poke.idleworld.online/register', 'https://poke.idleworld.online/forgot-password', 'https://poke.idleworld.online/verify-email?t=1', 'about:blank', 'chrome-error://chromewebdata/', 'https://evil.example/play'].every(u), 'sem script onde se digita senha (login, cadastro, recuperacao, verificacao), fora do jogo e em pagina de erro');
    ok([PLAY, PLAY + '?x=1', 'https://poke.idleworld.online/', 'https://poke.idleworld.online/play#a'].every((x) => !u(x)), 'no jogo os scripts entram');
    for (const reg of ['https://poke.idleworld.online/register', 'about:blank']) { const p = monta(reg, []); await p.api.injectScripts(p.wv); await espera(); ok(p.exec.length === 0 && p.wv.__pgSemScripts === true, 'nada injetado em ' + reg + ', e o painel fica marcado pra depois'); }

    const jogo = monta(PLAY, [0, 1]);
    await jogo.api.injectScripts(jogo.wv); await espera();
    ok(jogo.exec.length === 2 && jogo.exec[1].indexOf('(async function(){') === 0, 'no jogo: marca o documento e roda embrulhado (await no topo vale)');
    let parseia = true; try { new Function('return ' + jogo.exec[1]); } catch (e) { parseia = false; }
    ok(parseia, 'o embrulho parseia mesmo com o script terminando em comentario de linha');
    await jogo.api.applyScriptToAll('u1'); await espera();
    ok(jogo.exec.length === 3, 'segunda injecao no MESMO documento so consulta a marca e nao roda de novo (' + jogo.exec.length + ' execucoes)');
    ok(b.includes("wv.addEventListener('did-navigate-in-page'") && b.includes('wv.__pgSemScripts && !usNoLoginUrl(e.url)'), 'saindo do login por rota interna, os scripts entram (mesma regra de URL)');

    const falha = monta(PLAY, [0]);
    falha.wv.executeJavaScript = (c) => { falha.exec.push(c); return c.indexOf('(async function(){') === 0 ? Promise.reject(new Error('boom')) : Promise.resolve(0); };
    await falha.api.injectScripts(falha.wv); await espera();
    ok(falha.erros.length === 1 && /Auto: boom/.test(falha.erros[0]), 'script que estoura vai pro relatorio de erros: ' + (falha.erros[0] || 'NADA'));
  }

  console.log('\n--- userscripts: instalar e mexer ---');
  ok(b.includes("if (!String(code || '').trim() || !window.confirm(t('scTrust'))) return;"), 'arrastar arquivo pede a mesma confirmacao de confianca do link');
  ok(b.includes("if (!nm || !code.trim() || !window.confirm(t('scTrust'))) return;"), 'colar codigo tambem');
  ok(b.includes("if (e.dataTransfer.files.length > 1) { window.alert(t('scSoUser')); return; }"), 'soltar varios arquivos avisa em vez de ignorar o resto');
  ok(b.includes('const ja = userScripts.find(x => x.url === r.url); if (ja) {'), 'o mesmo link de novo atualiza em vez de duplicar');
  ok(b.includes("if (!chk.checked && !window.confirm(t('scReloadAviso'))) { chk.checked = true; return; }"), 'desligar script avisa que recarrega e larga as contas na cidade');
  ok(b.includes("const rec = mudou && scriptsOn[id] && window.confirm(t('scReloadAviso'));"), 'atualizar tambem');
  ok(b.includes("(scriptsOn[id] && !rec ? ' ' + t('scValeNoReload') : '')") && s.split("scValeNoReload:'").length - 1 === 3, 'recusou recarregar: o aviso diz que a versao nova so entra no proximo reload (3 idiomas)');
  ok(b.includes("if (!window.confirm(t('scRemover') + (ativo ? ' ' + t('scReloadAviso') : ''))) return;"), 'remover pergunta sempre');
  ['scReloadAviso', 'scRemover'].forEach((k) => ok(s.split(k + ":'").length - 1 === 3, k + ' nos 3 idiomas'));
  {
    const src = entre(b, '  const saveScripts = ', '\n', false);
    const roda = (tamanho, lsOk) => {
      const gravou = []; let alertou = 0;
      const env = { userScripts: [{ id: 'u1', code: 'x'.repeat(tamanho) }], scriptsOn: { u1: true } };
      const fn = new Function('env', 'lsSet', 'lsArr', 'window', 't', 'let userScripts = env.userScripts, scriptsOn = env.scriptsOn;\n' + src + '\nconst r = saveScripts(); return { r, userScripts };');
      const out = fn(env, (k) => { gravou.push(k); return lsOk; }, () => [{ id: 'disco' }], { alert: () => alertou++ }, (k) => k);
      return { out, gravou, alertou };
    };
    const okk = roda(1000, true);
    ok(okk.out.r === true && okk.gravou.join(',') === 'userScripts,scriptsOn', 'script pequeno: salva os dois');
    const grande = roda(5 * 1024 * 1024, true);
    ok(grande.out.r === false && grande.gravou.length === 0 && grande.alertou === 1, 'acima de 4 MB somados: nem tenta gravar (nao dispara a poda do historico) e avisa');
    ok(grande.out.userScripts[0].id === 'disco', 'e a memoria volta ao que esta no disco');
    const cota = roda(1000, false);
    ok(cota.out.r === false && cota.alertou === 1, 'cota estourada: avisa em vez de fingir que salvou');
  }

  console.log('\n--- [alta] sessao morta sem recarregar: o relogin agora dispara ---');
  {
    const expr = entre(b, 'live=!!(ch.id||hasBalls||hasInv)', ';', true);
    const live = (ch, P) => new Function('ch', 'hasBalls', 'hasInv', 'P', 'let ' + expr + ' return live;')(ch, false, false, P);
    ok(live({ id: 7 }, { meMiss: 0, sock: { readyState: 1 } }) === true, 'conta normal: viva');
    ok(live({ id: 7 }, { meMiss: 2, sock: { readyState: 3 } }) === false, '2 /me seguidos sem personagem E socket fechado: morta (antes ficava "online" pra sempre)');
    ok(live({ id: 7 }, { meMiss: 5, sock: { readyState: 1 } }) === true, 'socket aberto e farmando nunca e declarada morta (5xx passageiro do /me nao derruba ninguem)');
    ok(live({ id: 7 }, { meMiss: 1, sock: null }) === true, 'um /me falho so nao basta');
    const col = entre(b, "if(key==='/api/characters/me'){", 'P.api[key]=j', true);
    const passo = (P, j) => { new Function('key', 'j', 'P', col)('/api/characters/me', j, P); return P; };
    const P1 = passo({ api: { '/api/characters/me': 'antigo' }, meMiss: 0 }, {});
    ok(P1.meMiss === 1 && P1.api['/api/characters/me'] === 'antigo', 'resposta sem personagem: conta a falha e NAO apaga o dado da tela');
    const P2 = passo({ api: {}, meMiss: 3 }, { character: { id: 1 } });
    ok(P2.meMiss === 0 && P2.api['/api/characters/me'].character.id === 1, 'voltou o personagem: zera o contador');
  }

  console.log('\n--- relogin nao devolve pro login quem acabou de logar ---');
  {
    const src = entre(b, '        if (!r.live) { lowOn[i] = {}', '\n          return; }').replace('if (!r.live) {', 'if (!r.live) {') + '\n        }';
    const sim = (passos) => {
      const est = { nav: [], deadT: [0] }; let url = LOGIN;
      const fn = new Function('r', 'lowOn', 'stallOn', 'lastK', 'i', 'accounts', 'deadT', 'w', 'LOGIN_URL', src);
      passos.forEach(([u, n]) => { url = u; for (let k = 0; k < n; k++) fn({ live: false }, {}, [], [], 0, [{ email: 'a@b', senha: 'x' }], est.deadT, { getURL: () => url, loadURL: (x) => { est.nav.push(x); } }, LOGIN); });
      return est;
    };
    ok(sim([[LOGIN, 30]]).deadT[0] === 0, '30 ticks na tela de login (captcha, 2FA): contador parado em 0');
    ok(sim([[LOGIN, 30], [PLAY, 1]]).nav.length === 0, 'saiu do login: NAO e arrancado de volta no primeiro tick (era o bug)');
    ok(sim([[LOGIN, 30], [PLAY, 10]]).nav.length === 1, 'sessao morta de verdade fora do login: 60s depois volta pro login');
  }

  console.log('\n--- timer orfao do watchdog nao recarrega pagina ja recuperada ---');
  {
    const L = s.split('\n'); const at = (n) => L.findIndex((x) => x.includes(n));
    const um = (ev) => /\(\)\s*=>\s*\{(.*)\}\s*\)\s*;/.exec(L[at("wv.addEventListener('" + ev + "'")])[1];
    const f0 = at("wv.addEventListener('did-fail-load'"); const corpo = [];
    for (let k = f0 + 1; !L[k].trim().startsWith('});'); k++) corpo.push(L[k]);
    const timers = []; let reloads = 0;
    const h = new Function('off', 'i', 'dot', 'status', 't', 'alerta', 'wv', 'setTimeout',
      'let fails = 0, alertedDown = false, falhou = false;\nconst onStart = () => {' + um('did-start-loading') + '\n};\nconst onFail = (e) => {' + corpo.join('\n') + '\n};\nreturn { onStart, onFail };')(
      [false], 0, {}, {}, (k) => k, () => {}, { reload: () => reloads++ }, (fn) => timers.push(fn));
    h.onStart(); h.onFail({ errorCode: -105 }); h.onStart(); // falhou, e o usuario mandou recarregar: nova carga em andamento
    timers.forEach((fn) => fn());
    ok(reloads === 0, 'pagina ja recarregando/recuperada: o timer antigo vira no-op (antes derrubava a conta pra cidade de novo)');
    h.onFail({ errorCode: -105 }); timers[timers.length - 1]();
    ok(reloads === 1, 'pagina AINDA falhada: o retry acontece');
    h.onFail({ errorCode: -105, isMainFrame: false });
    ok(timers.length === 2, 'falha de subframe nao agenda nada');
  }

  console.log('\n--- foto da sessao: so de conta viva, e nao passa de uma conta pra outra ---');
  {
    const src = entre(b, '        if (r.live && r.sess && r.sess.start) {', 't: Date.now() };\n        }', true);
    const roda = (snapIni, r) => { const sessSnap = [snapIni]; const exec = []; let saiu = true;
      new Function('r', 'sessSnap', 'i', 'w', 'RESET_SESS', 'fim', src + '\nfim();')(r, sessSnap, 0, { executeJavaScript: (c) => { exec.push(c); return Promise.resolve(); } }, 'RESET', () => { saiu = false; });
      return { snap: sessSnap[0], exec, saiuCedo: saiu }; };
    const velho = { cid: 'A', slug: 'orre_x', t: 1 };
    ok(roda(velho, { live: false, sess: { start: 1 }, cid: 'A' }).snap === velho, 'pagina de login/erro (nao viva): a foto nao e renovada, entao vence em 10 min');
    const mesma = roda(velho, { live: true, sess: { start: 1, kills: 9 }, slug: 'orre_y', cid: 'A' });
    ok(mesma.snap.slug === 'orre_y' && mesma.snap.cid === 'A', 'mesma conta: atualiza e guarda o id da conta');
    const outra = roda(velho, { live: true, sess: { start: 1 }, slug: 'kanto_z', cid: 'B' });
    ok(outra.snap === undefined && /^RESET;/.test(outra.exec[0]) && /\.analyzer=null/.test(outra.exec[0]) && outra.saiuCedo, 'outra conta no mesmo painel: descarta a foto, zera a sessao, larga o analyzer guardado e nao mistura os numeros');
    ok(b.includes('try { delete sessSnap[i]; webviews[i].reload(); } catch {}'), 'limpar conta descarta a foto');
    ok(b.includes("if (sn && Date.now() - sn.t < 600e3 && !(wv.getURL() || '').startsWith(LOGIN_URL)) {"), 'e a tela de login nao e re-semeada com sessao antiga');
  }

  console.log('\n--- resumo diario: fechamento do dia no boot ---');
  ok(b.includes("setTimeout(() => { try { const dPrev = lsGet('curDay'); lsSet('curDay', curDay); if (dPrev && dPrev < curDay) viraODia(dPrev); } catch {} }, 0);"), 'roda depois da carga (nf/nc/ncs ja existem) e grava o dia ANTES de enviar');
  ok(b.includes("curDay = k; try { lsSet('curDay', k); } catch {} viraODia(fecha);"), 'virada com o app aberto tambem grava o dia (senao o boot reenviaria)');

  console.log('\n--- hunt podada so sai da memoria depois que o arquivo confirmou ---');
  {
    const src = entre(b, '        if (!registraHunt.arq) {', '\n        }\n      }\n    } catch {}', false) + '\n        }';
    const roda = async (resp) => { const pod = [{ id: 1 }, { id: 2 }]; const salvos = []; const reg = {}; let pers = 0;
      const get = new Function('registraHunt', 'linhasD', 'linhas', 'cab', 'csvLinha', 'pokeAPI', 'podadas', 'salvaHuntLog', 'ini', 'let huntLog = ini;\n' + src + '\nreturn () => huntLog;')(
        reg, 'd', 'l', 'B;cab', (a) => a.join(';'), { saveBackup: (n) => { salvos.push(n); return n.indexOf('drops') >= 0 ? Promise.resolve(true) : resp(); } }, pod, () => pers++, pod.concat([{ id: 3 }]));
      await espera(); return { log: get(), salvos, pers, reg }; };
    const bom = await roda(() => Promise.resolve(true));
    ok(bom.log.length === 1 && bom.log[0].id === 3 && bom.pers === 2, 'arquivo gravou: as podadas saem e o log e persistido (2x: drops esvaziados e poda)');
    ok(bom.salvos.join(',') === 'hunts-historico-drops.csv,hunts-historico.csv', 'os drops por item tambem sao arquivados, num CSV proprio');
    const ruim = await roda(() => Promise.resolve(false));
    ok(ruim.log.length === 3 && ruim.reg.arq === 0, 'arquivo falhou (CSV aberto no Excel, disco cheio): as hunts FICAM pra proxima tentativa');
    const rej = await roda(() => Promise.reject(new Error('ipc')));
    ok(rej.log.length === 3, 'IPC rejeitou: idem');
    ok(b.includes('if (!(window.pokeAPI && pokeAPI.saveBackup) || huntLog.length > 300) huntLog = huntLog.slice(-150);'), 'teto duro em 300 pra nao crescer sem limite');
    ok(b.includes('huntLog = huntLog.slice(-300).filter('), 'o boot nao corta as pendentes');
  }

  console.log('\n--- importar config, mochila, tierlist, calibragem ---');
  ok(b.includes("pokeAPI.saveBackup('config-antes-de-importar-' + Date.now() + '.json', JSON.stringify(coletaConfig()), '')"), 'importar guarda uma copia do estado atual antes');
  ok(/^[\w.-]{1,60}$/.test('config-antes-de-importar-1758000000000.json'), 'e o nome da copia passa na validacao do main');
  ok(s.split('histórico (hunts, shinies').length - 1 === 1 && s.includes('history (hunts, shinies, charts)') && s.includes('historial (hunts, shinies'), 'o confirm diz que o HISTORICO tambem e trocado, nos 3 idiomas');
  ok(b.includes("data-item=\"' + esc(it.id) + '\"'") && !b.includes("data-item=\"' + (+it.id || 0)"), '"esconder itens especificos" leva o id de verdade (b4, i59195), nao 0');
  ok(!b.includes('const lvH = nivel > 0 ? nivel :') && b.includes("if (nivel > 0 && (+x.level || 0) > nivel) return;"), 'tierlist: o nivel escolhido filtra as hunts, e o atacante e avaliado no nivel de cada hunt (antes 98% viravam S)');
  ok(b.includes('const hlAlvo = +alvoX.level || +((movesByName[alvoX.sp] || {}).hl || 0);'), 'Ditto: aviso de nivel usa o nivel do mapa');
  {
    const hkey = new Function(entre(b, '  const hkey = ', '\n', false) + '\nreturn hkey;')();
    const src = entre(b, '  const kphLog = (pi) => {', '  // (calibraK saiu na 1.5.24', false);
    const huntLog = [{ p: 0, hunt: 'Gyarados', kills: 700, start: 0, end: 3600e3 }, { p: 1, hunt: 'Gyarados', kills: 100, start: 0, end: 3600e3 }];
    const kphLog = new Function('huntLog', 'hkey', src + '\nreturn kphLog;')(huntLog, hkey);
    ok(Math.round(kphLog(0).gyarados) === 700, 'calibragem: so as hunts do painel do atacante (' + Math.round(kphLog(0).gyarados) + ' kills/h)');
    ok(Math.round(kphLog(1).gyarados) === 100, 'a outra conta tem a medicao dela (' + Math.round(kphLog(1).gyarados) + ')');
    ok(kphLog(null).gyarados > 0, 'sem atacante definido: usa todas, como antes');
    ok(b.includes('cid: rSel.cid, pi: rSel.i,') && b.includes("danoAmostra(d.cid + '|' + hk,"), 'e a amostra de dano real e por conta e hunt (o lider de uma conta nao calibra a outra)');
    ok(b.includes("out.push({sl:String(m2.slug||''),") && b.includes('accStats[hkey(x2.sl || x2.name)]') && b.includes('hkey(x2.sl || x2.name) === hk'), 'medicao casa pelo slug do marcador (nome com pontuacao nao casava)');
  }
  ok(b.includes("';window.__pgSellTxt=' + JSON.stringify([t('sgAviso'), t('sgConfirma')])).catch(() => {});"), 'venda protegida: texto traduzido tambem ao recarregar o painel');
  {
    const BAGCATS = new Function(entre(b, '  const BAGCATS = [', ';', true) + '\nreturn BAGCATS;')();
    const merge = entre(b, '    BAGCATS.forEach(s => { if (c.bagOrder.includes(s)) return;', '});', true);
    const antigo = { bagOrder: ['Loot', 'Pokébolas', 'Heal', 'Revive', 'Stones', 'TMs', 'Cartas', 'Clã', 'Chaves', 'Outros'] }; // ordem que o usuario arrastou, salva antes da atualizacao
    new Function('c', 'BAGCATS', merge)(antigo, BAGCATS);
    ok(antigo.bagOrder[0] === 'Loot', 'perfil antigo: a ordem que o usuario arrastou e preservada');
    ok(antigo.bagOrder.indexOf('Berries') < antigo.bagOrder.indexOf('Outros') && antigo.bagOrder.indexOf('Held') < antigo.bagOrder.indexOf('Outros'), 'e as categorias novas entram ANTES de Outros: ' + antigo.bagOrder.slice(-4).join(', '));
    ok(antigo.bagOrder.length === BAGCATS.length && new Set(antigo.bagOrder).size === BAGCATS.length, 'sem duplicar nem perder categoria');
    ok(b.includes("if (BK_SKIP.includes(k2) || typeof o[k2] !== 'string') return;"), 'importar ignora valor que nao e texto (viraria "[object Object]")');
  }

  console.log('\n--- main.js: baixar userscript ---');
  {
    const src = entre(mj, 'function baixaUserScript(', '\nipcMain.handle(', false);
    const urlRaw = entre(mj, 'function urlRaw(', '\nfunction baixaUserScript(', false);
    const hosts = entre(mj, 'const US_HOSTS', '\n', false);
    const baixa = (corpo, status, loc) => new Function('https', 'app', 'Buffer', 'URL', hosts + '\n' + urlRaw + '\n' + src + '\nreturn baixaUserScript;')(
      { get: (u, o, cb) => { const req = { setTimeout: () => req, on: () => req, destroy: () => {} }; setImmediate(() => { const ev = {}; const res = { statusCode: status, headers: loc ? { location: loc } : {}, resume: () => {}, setEncoding: () => {}, on: (k, f) => { ev[k] = f; return res; } }; cb(res); if (status === 200) { ev.data && ev.data(corpo); ev.end && ev.end(); } }); return req; } },
      { getVersion: () => '0' }, Buffer, URL);
    const U = 'https://raw.githubusercontent.com/a/b/main/x.user.js';
    const html = await baixa('<!DOCTYPE html><html>404</html>', 200)(U);
    ok(html.ok === false && /nao devolveu um arquivo/.test(html.error), 'resposta HTML nao vira script instalado');
    const vazio = await baixa('   ', 200)(U);
    ok(vazio.ok === false, 'corpo vazio tambem nao');
    const bom = await baixa('// ==UserScript==\nconsole.log(1)', 200)(U);
    ok(bom.ok === true && bom.code.indexOf('UserScript') > 0, 'script de verdade continua passando');
    const rel = await baixa('', 302, 'https://release-assets.githubusercontent.com/x/y.js')(U);
    ok(rel.ok === false && /redirecionou/.test(rel.error), 'link de release: a mensagem explica o redirecionamento em vez de repetir o que o usuario ja fez');
  }

  console.log('\n--- cacada 1521b: historico em CSV grava em sequencia, nada se perde nem duplica ---');
  {
    const src = entre(b, "          (linhasD ? pokeAPI.saveBackup('hunts-historico-drops.csv'", 'salvaHuntLog(); } });', true);
    const roda = async (okD, okA, semDrops) => {
      const gravou = []; const h1 = { drops: [{ n: 'x' }] }, h2 = { drops: [] }; const st = { salvos: 0 };
      const log = new Function('pokeAPI', 'linhasD', 'linhas', 'cab', 'csvLinha', 'podadas', 'st', 'salvaHuntLog',
        'let huntLog = [h1(), h2(), { drops: [] }], registraHunt = { arq: 1 };\n'.replace('h1()', 'podadas[0]').replace('h2()', 'podadas[1]') + src + '\nreturn () => ({ huntLog, arq: registraHunt.arq });')(
        { saveBackup: (nome) => { gravou.push(nome); return Promise.resolve(nome.includes('drops') ? okD : okA); } }, semDrops ? '' : 'd', 'l', 'c', () => 'h', [h1, h2], st, () => { st.salvos++; });
      await espera(); await espera();
      return { gravou, h1, salvos: st.salvos, ...log() };
    };
    const bom = await roda(true, true);
    ok(bom.gravou.join(',') === 'hunts-historico-drops.csv,hunts-historico.csv' && bom.huntLog.length === 1 && bom.arq === 0, 'os dois arquivos confirmaram: as hunts podadas saem da memoria (' + bom.gravou.join(',') + ')');
    const semD = await roda(true, false, true);
    ok(semD.gravou.join(',') === 'hunts-historico.csv' && semD.huntLog.length === 3 && semD.arq === 0, 'sem drops pra arquivar: so o resumo, e falhou -> nada podado, trava liberada');
    const dFalhou = await roda(false, true);
    ok(dFalhou.gravou.length === 1 && dFalhou.huntLog.length === 3 && dFalhou.h1.drops.length === 1 && dFalhou.arq === 0, 'drops falharam: o resumo NEM e tentado, os drops ficam na memoria pra proxima (antes o resumo OK apagava a hunt e os drops sumiam pra sempre)');
    const aFalhou = await roda(true, false);
    ok(aFalhou.gravou.length === 2 && aFalhou.huntLog.length === 3 && aFalhou.h1.drops.length === 0 && aFalhou.salvos >= 1, 'drops OK e resumo falhou: a hunt fica pra reenviar o resumo, mas os drops dela ja foram esvaziados (a retentativa nao duplica linhas no CSV de drops)');
  }

  console.log('\n--- cacada 1521b: webhook com rede fora no boot nao perde o resumo do dia ---');
  {
    const src = entre(b, '  const whFila = [];', '  // ----- Historico diario persistente');
    const roda = async (respostas) => {
      const saiu = []; const timers = []; let agora = 100000;
      const api = new Function('window', 'whCfg', 'setTimeout', 'Date', src + '\nreturn { webhookSend, whFila };')(
        { pokeAPI: { webhook: (u2, t2) => { saiu.push(t2); return Promise.resolve(respostas.shift()); } } }, { url: 'https://d/w' }, (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, { now: () => agora });
      api.webhookSend('resumo');
      for (let k = 0; k < 12; k++) { await espera(); const t2 = timers.shift(); if (!t2) break; agora += t2.ms; t2.fn(); }
      await espera();
      return { saiu, fila: api.whFila };
    };
    const r1 = await roda([false, true]);
    ok(r1.saiu.length === 2 && r1.fila.length === 0, 'main devolveu false (rede fora): reenvia 30s depois e o segundo vai (' + r1.saiu.length + ' envios)');
    const r2 = await roda([false, false, false, false, false, false, false]);
    ok(r2.saiu.length === 6 && r2.fila.length === 0, 'teto: 1 envio + 5 reenvios e desiste, sem fila eterna (' + r2.saiu.length + ')');
    const r3 = await roda([true]);
    ok(r3.saiu.length === 1, 'foi de primeira: um envio so');
  }

  console.log('\n--- cacada 1521b: o resto, conferido no texto ---');
  ok(b.includes("++deadT[i] >= ((w.getURL() || '').includes('maintenance=1') ? 100 : 10)"), 'manutencao do jogo: relogin a cada 10 min, nao a cada 60s (cada tentativa recarrega o painel)');
  ok(b.includes("wv.addEventListener('did-navigate-in-page', (e) => { if (e.isMainFrame !== false) autoLogin(e); })") && b.includes("wv.addEventListener('did-navigate', autoLogin);"), 'Sair pelo dock (rota interna pra /login) tambem dispara o auto-login');
  ok(b.includes("if ((huntsCache && Object.keys(movesByName).length && !semOuro) || Date.now() - huntsCacheT < 60e3) return;"), 'creatures.json falhou mas as hunts vieram: o catalogo continua sendo tentado (tierlist/Ditto nao ficam vazios ate reiniciar)');
  ok(b.includes('const semOuro = !!huntsCache && !huntsCache.some(x => +x.gk > 0) && huntsOuroTent < 5;'), 'items.json falhou (gold/h zerado): os precos tambem sao tentados de novo, ate 5 vezes');
  ok(b.includes("const BK_SKIP = ['userScripts', 'scriptsOn', 'webhook', 'curDay']"), 'curDay nao viaja no export/import (importado, mandaria o resumo do dia de outra pessoa pro Discord)');
  ok(b.includes("if (okC || window.confirm(t('bkNoCopy'))) grava();") && s.split("bkNoCopy:'").length - 1 === 3, 'importar sem conseguir a copia de seguranca pergunta antes (3 idiomas)');
  ok(b.includes("lista.map(x => x.name + '@' + x.level).join('|')"), 'cache do Ditto: a lista inteira de hunts entra na chave (trocar uma do meio invalidava nada)');
  ok(b.includes("const discos = comTm ? tmDiscos(movesByName[sp]) : []") && b.includes("if (discos.length) soma = Math.max(...somas);"), 'aba Geral com TM: um disco por vez (o jogo so deixa 1 TM por pokemon), fica a melhor soma');
  ok(b.includes('(x2.sug.tm ? \' <b style="color:#f2c665;font-size:9px">TM \' + esc(x2.sug.tm) + \'</b>\' : \'\')'), 'linha do Sugerido marca qual TM entrou (tipo e/ou AOE)');
  ok(s.split('golpe extra em área a cada 10 s').length - 1 === 1 && s.includes('extra area hit every 10 s') && s.includes('golpe extra en área cada 10 s'), 'texto da caixinha com TM explica as duas classes (elemental em area a cada 10 s e AoE), 3 idiomas');
  ok(b.includes("(wv.getURL() || '').startsWith('https://poke.idleworld.online/play') && /^[a-z0-9_-]{1,60}$/i.test(snv.slug || '')"), 'Voltar pra hunt so arma na pagina do jogo (manutencao/namelock nao recebem enter-hunt)');
  ok(b.includes("name: 'JustPokédex: Calculadora de IV'"), 'preset sem travessao');
  ok(b.includes("podadas.forEach(h => { h.drops = []; }); salvaHuntLog();"), 'drops esvaziados vao pro disco na hora (crash no meio nao reanexa)');

  console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
  process.exit(fail);
})().catch((e) => { console.log('FAIL excecao no teste: ' + (e && e.stack || e)); process.exit(1); });
