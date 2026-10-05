// "Voltar pra hunt depois de recarregar" (experimental, desligado por padrao).
// Contexto: num reload quem tira a conta da hunt e a SPA do jogo (nasce em Cerulean e manda
// set-city ao montar), e o app nao tinha nenhum jeito de reentrar: todo reload automatico
// (watchdog, crash do painel) deixava a conta parada na cidade. A mensagem e {type:'enter-hunt',
// slug}, confirmada no bundle do jogo. Aqui o VOLTA_JS REAL e executado com relogio e socket falsos.
// Roda com: node test/volta-hunt.test.js
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };

const re = /<script>([\s\S]*?)<\/script>/g; let m, b = '';
while ((m = re.exec(s))) { if (m[1].length > b.length) b = m[1]; }
try { new Function(b); ok(true, 'index parseia'); } catch (e) { ok(false, 'parse: ' + e.message); }

// o construtor real do script injetado
const iv = b.indexOf('const VOLTA_JS = (slug) =>');
const VOLTA_JS = new Function(b.slice(iv, b.indexOf('\n', iv)) + '\nreturn VOLTA_JS;')();

// roda o script num "jogo" falso: relogio controlado, socket que anota o que saiu, ticks de 12s
const roda = (slug, o = {}) => {
  const enviados = []; let agora = 1000; let tick = null; let parou = false;
  const sock = { readyState: o.sockAbreNoTick ? 0 : (o.sockState == null ? 1 : o.sockState), send: (x) => enviados.push(JSON.parse(x)) };
  const P = o.semColetor ? undefined : { sock, sess: { kills: 0 } };
  const win = { __poke: P, __pgVolta: o.jaRodou ? 1 : undefined };
  const ret = new Function('window', 'Date', 'setInterval', 'clearInterval', 'return ' + VOLTA_JS(slug))(
    win, { now: () => agora }, (fn, ms) => { tick = { fn, ms }; return 1; }, () => { parou = true; });
  if (o.fiDepois && P) P.fiT = agora + 5000; // a conta entrou numa hunt sozinha depois de armar
  let n = 0; const enviosPorTick = [];
  while (tick && !parou && n < 30) {
    n++; agora += 12000;
    if (o.sockAbreNoTick && n >= o.sockAbreNoTick) sock.readyState = 1;
    if (o.killsNoTick && P) P.sess.kills += o.killsNoTick(n);
    if (o.fiNoTick === n && P) P.fiT = agora - 5000; // o servidor confirmou a entrada (field-init) antes desse tick
    tick.fn(); enviosPorTick.push(enviados.length);
  }
  return { ret, enviados, espera: tick ? tick.ms : null, ticks: n, enviosPorTick };
};

console.log('\n--- caso normal: recarregou farmando, volta pra mesma hunt ---');
{
  const r = roda('nightmare_beedrill', { killsNoTick: (n) => (n >= 2 ? 4 : 0) }); // voltou a matar depois do 1o envio
  ok(r.ret === 'armado', 'arma o retorno');
  ok(r.espera === 12000, 'confere de 12 em 12s (o 1o tiro passa do set-city que a SPA manda ao montar)');
  ok(r.enviados.length === 1 && r.enviados[0].type === 'enter-hunt' && r.enviados[0].slug === 'nightmare_beedrill', 'manda exatamente {type:enter-hunt, slug}: ' + JSON.stringify(r.enviados[0]));
  ok(r.ticks === 2, 'os kills andaram: para de mexer (parou no tick ' + r.ticks + ')');
}

console.log('\n--- montagem lenta / socket atrasado: insiste, mas com teto ---');
{
  const lento = roda('orre_x'); // o set-city da SPA atropelou o 1o envio: os kills nunca andam
  ok(lento.enviados.length === 3, 'sem kill depois do envio, reenvia ate 3 vezes (' + lento.enviados.length + ')');
  ok(lento.ticks === 4, 'e para sozinho depois do 3o (tick ' + lento.ticks + ')');
  const aceitou = roda('orre_x', { fiNoTick: 2 }); // 1o envio aceito: o field-init chega antes do 2o tick, kills ainda em 0
  ok(aceitou.enviados.length === 1 && aceitou.ticks === 2, 'field-init depois do 1o envio: para (antes so contava o field-init anterior ao 1o envio, e mandava enter-hunt por cima da hunt ja aceita): ' + aceitou.enviados.length + ' envio');
  const tarde = roda('orre_x', { sockAbreNoTick: 2, killsNoTick: (n) => (n >= 3 ? 1 : 0) });
  ok(tarde.enviosPorTick[0] === 0 && tarde.enviados.length === 1, 'socket so abriu no 2o tick: espera e manda quando abre (antes o tiro unico se perdia)');
  const nunca = roda('orre_x', { sockState: 3 });
  ok(nunca.enviados.length === 0 && nunca.ticks === 11, 'socket que nunca abre: nada sai e desiste em ~2 min (' + nunca.ticks + ' ticks)');
}

console.log('\n--- guardas ---');
ok(roda('cerulean').ret === 'cidade' && roda('cerulean').enviados.length === 0, 'slug de cidade: nunca manda');
['pewter', 'viridian', 'cassino', 'arena_pvp'].forEach((c) => ok(roda(c).enviados.length === 0, 'cidade ' + c + ': nada sai'));
ok(roda('').ret === 'cidade' && roda('').enviados.length === 0, 'slug vazio: nada sai');
ok(roda('orre_x', { fiDepois: true }).enviados.length === 0, 'a conta ja entrou numa hunt nesse meio tempo (field-init chegou): nao manda por cima');
ok(roda('orre_x', { semColetor: true }).ret === 'sem-coletor', 'sem coletor na pagina: nao faz nada');
const dup = roda('orre_x', { jaRodou: true });
ok(dup.ret === 'ja' && dup.enviados.length === 0, 'uma vez por carga de pagina: a segunda chamada nao arma de novo');

console.log('\n--- o slug nao vira injecao de codigo ---');
{
  const hostil = "x'});alert(1);({a:'";
  let explodiu = false; let r;
  try { r = roda(hostil); } catch (e) { explodiu = true; }
  ok(!explodiu, 'slug hostil nao quebra o script (passa por JSON.stringify)');
  ok(!r || r.enviados.every((e) => e.slug === hostil), 'e se sair, sai como texto, nao como codigo');
  ok(b.includes("/^[a-z0-9_-]{1,60}$/i.test(snv.slug || '')"), 'e antes disso o renderer so aceita slug simples (letras, numeros, _ e -)');
}

console.log('\n--- quando arma (no dom-ready) ---');
ok(b.includes("let voltaHuntOn = lsGet('voltaHunt') === '1';"), 'DESLIGADO por padrao: age na conta do usuario e ainda nao foi validado ao vivo');
ok(b.includes('Date.now() - ((snv.s && snv.s.lastKillT) || 0) < 600e3') && b.includes('S.kills++;S.lastKillT=Date.now();'),
  'so se houve KILL DE VERDADE nos ultimos 10 min: o carimbo vem do coletor e viaja na foto da sessao (o lastKT antigo era renovado sem kill)');
ok(b.includes('Date.now() - snv.t < 600e3'), 'e a foto da sessao tem menos de 10 min (e so e tirada de conta viva)');
ok(b.indexOf('wv.executeJavaScript(VOLTA_JS(snv.slug))') > b.indexOf('coletor de estado + sessao'), 'injetado DEPOIS do coletor (precisa do window.__poke)');
ok(b.includes("m.type==='field-init'){const sl=m.slug||'';P.fiT=Date.now();"), 'o coletor carimba a hora do field-init');
ok(b.includes('recarregou farmando, volta pra hunt'), 'fica registrado no relatorio de erros quando age');

console.log('\n--- interface ---');
ok(s.includes('<button id="voltaHunt" role="switch"'), 'botao no menu, como chave liga/desliga (redesign etapa A)');
ok(b.includes('applySndShiny(); applyVoltaHunt(); applyAlerts();'), 'entra na cadeia de apply (texto e estado certos ao abrir e ao trocar idioma)');
// redesign etapa A: o rotulo e fixo ("↩ Voltar pra hunt") e o estado vai na chave, entao voltaOn/voltaOff viraram uma chave so
['volta', 'voltaTitle'].forEach((k) => ok(s.split(k + ":'").length - 1 === 3, k + ' nos 3 idiomas'));
ok(!/volta(Title)?:'[^']*—/.test(s), 'sem travessao nos textos');

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
