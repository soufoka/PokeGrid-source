// 1.5.27: o Eco limitava o requestAnimationFrame do jogo mas nao trocava o cancelAnimationFrame. O jogo encerra varios
// loops SO com cancelAnimationFrame (barra da onda na pesca, etiquetas da cidade), entao cada loop "cancelado" seguia
// vivo pra sempre: medido 150 callbacks/s depois de 9 remontagens, contra 15 esperados. Aqui o ecoScript REAL do
// index.html roda sobre um relogio e um rAF falsos (vsync a cada 16 ms) com o padrao do jogo: monta, desmonta, remonta.
// Roda com: node test/eco-raf.test.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const a = html.indexOf('const ecoScript = (fps) => `') + 'const ecoScript = (fps) => `'.length;
const b = html.indexOf('})()`;', a) + 4;
const ecoScript = (fps) => eval('`' + html.slice(a, b) + '`'); // o ${fps} do template e resolvido aqui

let now = 0, tid = 0, rid = 0; const timers = [], rafs = new Map();
const win = {};
const setTimeout_ = (f, ms) => { timers.push({ id: ++tid, at: now + ms, f }); return tid; };
const clearTimeout_ = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
const roda = (code) => new Function('window', 'setTimeout', 'clearTimeout', 'performance', code)(win, setTimeout_, clearTimeout_, { now: () => now });
const avanca = (ms) => { const fim = now + ms; while (now < fim) { now += 1; for (const t of timers.filter((t) => t.at <= now)) { clearTimeout_(t.id); t.f(); } if (now % 16 === 0) { const fr = [...rafs.values()]; rafs.clear(); fr.forEach((f) => f(now)); } } };
const reinicia = () => { now = 0; timers.length = 0; rafs.clear(); delete win.__eco; win.requestAnimationFrame = (cb) => { rafs.set(++rid, cb); return rid; }; win.cancelAnimationFrame = (id) => { rafs.delete(id); }; };
function efeitoDoJogo(c) { let id; const loop = () => { c.n++; id = win.requestAnimationFrame(loop); }; id = win.requestAnimationFrame(loop); return () => win.cancelAnimationFrame(id); } // padrao do bundle
function cenario(fps, remontagens) {
  reinicia(); roda(ecoScript(fps));
  const c = { n: 0 }; let limpa = efeitoDoJogo(c);
  for (let k = 0; k < remontagens; k++) { avanca(500); limpa(); limpa = efeitoDoJogo(c); }
  avanca(1000); const antes = c.n; avanca(1000);
  return c.n - antes;
}

const e15 = cenario(15, 0), e15r = cenario(15, 9), off = cenario(0, 9), e1 = cenario(1, 3);
ok(e15 >= 14 && e15 <= 16, 'Eco a 15 fps: ' + e15 + ' quadros/s com 1 loop');
ok(e15r <= 16, 'depois de 9 remontagens continua ' + e15r + ' quadros/s: os loops cancelados morrem (antes: 150)');
ok(off >= 55 && off <= 70, 'Eco desligado: so o loop vivo, na taxa da tela (' + off + '/s)');
ok(e1 >= 1 && e1 <= 2, 'modo leve (Simples ou janela escondida): ' + e1 + ' quadro/s');

// rAF pedido ANTES da injecao (id nativo, abaixo de 1e9) ainda cancela pelo cancel nativo
reinicia();
const antigo = win.requestAnimationFrame(() => {});
roda(ecoScript(15));
win.cancelAnimationFrame(antigo);
ok(!rafs.has(antigo), 'um rAF de antes do Eco ainda e cancelado de verdade');
// e cancelar um id do Eco nunca derruba um rAF nativo alheio com o mesmo numero
const alheio = win.__eco.native(() => {});
const meu = win.requestAnimationFrame(() => {});
win.cancelAnimationFrame(meu);
ok(rafs.has(alheio) && meu > 1e9, 'ids do Eco ficam acima de 1e9 e nao colidem com os nativos');
// reinjetar (o app manda o ecoScript de novo ao trocar Eco/Simples) so muda a taxa, sem embrulhar duas vezes
const raf0 = win.requestAnimationFrame, eco0 = win.__eco;
roda(ecoScript(1)); roda(ecoScript(15));
ok(win.requestAnimationFrame === raf0 && win.__eco === eco0 && win.__eco.fps === 15, 'reinjetar so troca a taxa, sem embrulhar o rAF de novo (senao o de dentro ficaria preso a 1 fps)');

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
