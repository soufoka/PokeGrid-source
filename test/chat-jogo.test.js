// 1.5.27: com o 💬 Chat oculto (o padrao), o app escondia o chat do jogo no mesmo instante em que o jogador abria
// pelo botao 💬 Chat do proprio jogo (.chat-fab): o observador de mutacao fechava o painel recem-montado (relato da rafa
// no Discord, 24/09/2026). Aqui o chatScript REAL do index.html roda sobre um DOM minimo falso.
// Roda com: node test/chat-jogo.test.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const ok = (c, l) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const ini = 'const chatScript = (esconder) => `';
const a = html.indexOf(ini) + ini.length, b = html.indexOf('})()`;', a) + 4;
const chatScript = (esconder) => eval('`' + html.slice(a, b) + '`'); // o ${esconder} do template e resolvido aqui

const cliques = [], obs = [];
const chat = { dataset: { pgchat: '1' }, style: { display: '' } }; // o painel de chat, ja marcado por uma execucao anterior
class MO { constructor(cb) { this.cb = cb; this.on = false; obs.push(this); } observe() { this.on = true; } disconnect() { this.on = false; } }
const win = {};
const doc = { querySelector: (sel) => (sel === '[data-pgchat]' ? chat : null), querySelectorAll: () => [], documentElement: {} };
const addEv = (tipo, f) => { if (tipo === 'click') cliques.push(f); };
const PLAY = { pathname: '/play' };
const roda = (code) => new Function('window', 'document', 'MutationObserver', 'addEventListener', 'getComputedStyle', 'innerHeight', 'location', code)(win, doc, MO, addEv, () => ({}), 800, PLAY);
const mutacao = () => obs.filter((o) => o.on).forEach((o) => o.cb()); // o jogo mexeu no DOM
const clica = (alvo) => cliques.forEach((f) => f({ target: alvo }));
const botaoChat = { closest: (sel) => (sel === '.chat-fab' ? {} : null) }, outro = { closest: () => null };

roda(chatScript(true));
ok(chat.style.display === 'none', 'com o 💬 Chat oculto, o painel de chat some');
chat.style.display = ''; mutacao();
ok(chat.style.display === 'none', 'e continua sumido quando o jogo remonta a tela');
clica(outro); chat.style.display = ''; mutacao();
ok(chat.style.display === 'none', 'clique em outra coisa do jogo nao libera o chat');
clica(botaoChat); mutacao();
ok(chat.style.display === '', 'clicar no botao 💬 Chat do proprio jogo abre o chat, e o app nao fecha de novo');
chat.style.display = ''; mutacao();
ok(chat.style.display === '', 'nem na proxima mudanca da tela');
roda(chatScript(true)); mutacao();
ok(chat.style.display === 'none', 'o app mandando de novo (botao 💬, Simples) volta a esconder');
roda(chatScript(false)); chat.style.display = ''; mutacao();
ok(chat.style.display === '' && obs.every((o) => !o.on), 'com o 💬 Chat visivel, nada fica vigiando o chat');
ok(cliques.length === 1, 'o ouvinte do botao do jogo entra uma vez so, por mais que o script seja reinjetado');

// jogo em espanhol (desde a 1.5.27 o jogo segue o idioma do app): o campo do chat e achado pelo placeholder "Hablar en ..."
{
  const caixa = { dataset: {}, style: { display: '' }, getBoundingClientRect: () => ({ width: 320, height: 400, top: 100 }), parentElement: null };
  const campo = { placeholder: 'Hablar en Global…', getBoundingClientRect: () => ({ width: 300, height: 30, top: 100 }), parentElement: caixa }; // na metade de cima: so o placeholder acha
  const doc2 = { querySelector: () => null, querySelectorAll: (q) => (q === 'input, textarea' ? [campo] : []), documentElement: {} };
  new Function('window', 'document', 'MutationObserver', 'addEventListener', 'getComputedStyle', 'innerHeight', 'location', chatScript(true))({}, doc2, MO, () => {}, (el) => ({ position: el === caixa ? 'fixed' : 'static' }), 800, PLAY);
  ok(caixa.style.display === 'none' && caixa.dataset.pgchat === '1', 'jogo em espanhol: acha o chat pelo "Hablar en" e esconde');
}

// 12/10/2026: o campo do codigo 2FA (input sem type, autocomplete one-time-code, no login e na Minha Conta do jogo) passava
// no filtro de "campo de texto na metade de baixo": com o chat escondido por padrao, a caixa do codigo sumia
{
  const cena = (pathname, campoProps) => {
    const caixa = { dataset: {}, style: { display: '' }, getBoundingClientRect: () => ({ width: 360, height: 420, top: 300 }), parentElement: null };
    const campo = Object.assign({ placeholder: '', autocomplete: '', getBoundingClientRect: () => ({ width: 300, height: 30, top: 600 }), parentElement: caixa }, campoProps);
    const doc3 = { querySelector: () => null, querySelectorAll: (q) => (q === 'input, textarea' || q === 'input[type=text], input:not([type]), textarea' ? [campo] : []), documentElement: {} };
    new Function('window', 'document', 'MutationObserver', 'addEventListener', 'getComputedStyle', 'innerHeight', 'location', chatScript(true))({}, doc3, MO, () => {}, (el) => ({ position: el === caixa ? 'fixed' : 'static' }), 800, { pathname });
    return caixa.style.display;
  };
  ok(cena('/login', { placeholder: 'Código de 6 dígitos', autocomplete: 'one-time-code' }) === '', 'tela de login com o campo do 2FA na metade de baixo: nada some');
  ok(cena('/login', { placeholder: 'Mensagem' }) === '', 'na tela de login nada e tratado como chat, nem campo com cara de chat');
  ok(cena('/play', { placeholder: '000000', autocomplete: 'one-time-code' }) === '', 'no jogo, o 2FA da Minha Conta na metade de baixo: nao e chat, nao some');
  ok(cena('/play', { placeholder: '' }) === 'none', 'no jogo, o chat sem placeholder conhecido continua achado pelo campo da metade de baixo');
}

console.log(fail ? '\nFALHOU' : '\nTODOS PASSARAM');
process.exit(fail);
