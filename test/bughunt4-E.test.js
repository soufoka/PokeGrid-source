// Caca de bugs 4, lote E (25/09/2026): documentacao. O README do repo do INSTALADOR (soufoka/PokeGrid) era copia
// do README do codigo-fonte (mandava abrir .bat, linkava TUTORIAL.md e COMO USAR.txt, que nao existem la), e
// FAQ/MANUAL/CHANGELOG tem que ser identicos nos dois repos. Os docs ficam fora do poke-multi: procura as pastas
// irmas ../PokeGrid e ../PokeGrid-source e pula o que nao achar (clone solto do source nao tem o repo do instalador).
// Roda com: node test/bughunt4-E.test.js
const fs = require('fs');
const path = require('path');
const ACIMA = path.join(__dirname, '..', '..');
const INST = path.join(ACIMA, 'PokeGrid'), SRC = path.join(ACIMA, 'PokeGrid-source');
let fail = 0, rodou = 0;
const ok = (c, l) => { rodou++; console.log((c ? 'OK  ' : 'FAIL') + ' ' + l); if (!c) fail = 1; };
const le = (p) => fs.readFileSync(p, 'utf8');
const tem = (p) => fs.existsSync(p);

// README do instalador (PT e EN): fala do release, nao do codigo
if (tem(path.join(INST, '.github', 'workflows')) && tem(path.join(INST, 'README.md'))) {
  for (const f of ['README.md', 'README.en.md']) {
    const r = le(path.join(INST, f));
    ok(r.includes('https://github.com/soufoka/PokeGrid/releases/latest'), f + ': link pra ultima versao');
    ok(r.includes('https://github.com/soufoka/PokeGrid-source'), f + ': link pra versao sem executavel');
    ok(/SmartScreen/.test(r), f + ': aviso do SmartScreen');
    ok(/xattr -cr \/Applications\/PokeGrid\.app/.test(r) && /Privacidade e Segurança|Privacy & Security/.test(r), f + ': aviso do Mac (app sem assinatura da Apple)');
    ok(!/TUTORIAL\.md|COMO USAR|iniciar\.(bat|sh)|Abrir PokeGrid|git clone|npm (install|start)/.test(r), f + ': sem passo do codigo-fonte (.bat, iniciar, TUTORIAL, COMO USAR, npm)');
    ok(/de 1 a 4 contas|1 to 4 accounts/.test(r) && /espanhol|Spanish/.test(r), f + ': recursos atuais (1 a 4 contas, espanhol)');
  }
} else console.log('pulado: README do instalador (../PokeGrid nao esta aqui)');

// FAQ, MANUAL e CHANGELOG: identicos nos dois repos, e sem os erros do lote
const pares = ['FAQ.md', 'MANUAL.md', 'CHANGELOG.md'];
if (tem(path.join(INST, 'FAQ.md')) && tem(path.join(SRC, 'FAQ.md'))) {
  pares.forEach(f => ok(le(path.join(INST, f)) === le(path.join(SRC, f)), f + ': identico em PokeGrid e PokeGrid-source'));
}
const base = tem(path.join(SRC, 'FAQ.md')) ? SRC : tem(path.join(INST, 'FAQ.md')) ? INST : null;
if (base) {
  const faq = le(path.join(base, 'FAQ.md')), man = le(path.join(base, 'MANUAL.md'));
  ok(faq.includes('https://github.com/soufoka/PokeGrid/releases/latest') && !faq.includes('na página de versões'), 'FAQ: o instalador aponta pro release do repo PokeGrid (o source nao tem releases)');
  ok(!/precisa dar x64/.test(faq) && /arm64/.test(faq), 'FAQ: arm64 tambem serve');
  ok(!/Clique no painel de outra conta/.test(man) && /aba com o nome da conta/.test(man), 'MANUAL: o Painel troca pela aba, nao pelo foco');
  ok(!/o `npm start` refaz/.test(faq), 'FAQ: npm start sozinho nao repoe dependencia');
  const chg = le(path.join(base, 'CHANGELOG.md'));
  ok(!/1,5 s depois do último clique|applies 1\.5 s/.test(faq + chg) && /de 1 a 4/.test(faq), 'Paineis: FAQ e CHANGELOG falam da escolha direta do numero, sem o ciclo de 1,5 s');
  ok(/já vem com \*\*Considerar preço dos itens no Mercado\*\* marcado/.test(faq) && /padrão do jogo/.test(man), 'FAQ e MANUAL: a caixa de preco do Mercado ja vem marcada no Hunt Analyzer');
  ok(!/Log in team|diamond shop name|nome da loja de diamante/.test(chg), 'CHANGELOG: o botao em ingles e o Log in all, e nada de prompt da loja de diamante (no Electron ele nao abre)');
  ok(!/até 500/.test(man + chg), 'Times & IV: a projecao vai alem do Lv500');
  const docs = pares.map(f => path.join(base, f)).concat(tem(path.join(INST, 'README.md')) ? [path.join(INST, 'README.md'), path.join(INST, 'README.en.md')] : []);
  docs.forEach(p => ok(!le(p).includes('—'), path.basename(path.dirname(p)) + '/' + path.basename(p) + ': sem travessao'));
} else console.log('pulado: FAQ/MANUAL (nenhum repo de docs aqui)');

console.log('\n' + (fail ? 'FALHOU' : 'OK: ' + rodou + ' checagens'));
process.exit(fail);
