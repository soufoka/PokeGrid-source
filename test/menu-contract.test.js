"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const preload = fs.readFileSync(path.join(root, "preload.js"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");

const ids = [
  "hunt", "scriptsBtn", "count", "alerts", "sellguard", "chat", "cleanHud",
  "muteAll", "eco", "awake", "minTray", "sndShiny", "bkExp", "bkImp",
  "layout", "errlogBtn"
];

for (const id of ids) {
  const matches = html.match(new RegExp(`id=["']${id}["']`, "g")) || [];
  assert.equal(matches.length, 1, `${id} precisa existir exatamente uma vez`);
  assert.match(html, new RegExp(`\\[['"]${id}["'],\\s*["']`), `${id} precisa estar no contrato executável`);
}

assert.match(html, /<dialog id="menu"/, "Opções deve usar dialog nativo");
assert.doesNotMatch(html, /id="menu"[^>]*popover/, "Opções não deve voltar ao popover instável");
assert.match(html, /menu\.showModal\(\)/);
assert.match(html, /menu\.close\(\)/);
assert.match(html, /id="menuClose"/);
assert.match(html, /event\.target !== menu/);

const handlers = [
  "huntBtn.onclick", "countBtn.onclick", "alertBtn.onclick", "sgBtn.onclick",
  "chatBtn.onclick", "cleanBtn.onclick", "muteBtn.onclick", "ecoBtn.onclick",
  "awakeBtn.onclick", "minTrayBtn.onclick", "sndBtn.onclick",
  "getElementById('scriptsBtn').onclick", "getElementById('bkExp').onclick",
  "getElementById('bkImp').onclick", "getElementById('layout').onclick",
  "getElementById('errlogBtn').onclick", "langBtns.forEach"
];
for (const fragment of handlers) assert.ok(html.includes(fragment), `handler ausente: ${fragment}`);

for (const key of [
  "alerts", "sellguard", "chatHidden", "cleanHud", "muted", "eco",
  "awake", "minTray", "sndShiny", "layout", "lang"
]) {
  assert.ok(html.includes(`localStorage.setItem('${key}'`), `persistência ausente: ${key}`);
}

const huntScript = html.slice(html.indexOf("const huntScript"), html.indexOf("const huntBtn"));
assert.doesNotMatch(huntScript, /x\.click\(\)/, "Hunt deve abrir sem fechar contas já abertas");

const scriptsHandler = html.slice(
  html.indexOf("getElementById('scriptsBtn').onclick"),
  html.indexOf("getElementById('scClose').onclick")
);
assert.ok(
  scriptsHandler.indexOf("closeMenu()") < scriptsHandler.indexOf("scOverlay.classList.add('show')"),
  "Scripts deve fechar Opções antes de abrir seu modal"
);

for (const method of ["setAwake", "setMinToTray", "openErrorLog", "readPreset"]) {
  assert.ok(preload.includes(`${method}:`), `ponte preload ausente: ${method}`);
}
for (const channel of ["awake:set", "mintray:set", "errlog:open", "preset:read"]) {
  assert.ok(main.includes(`'${channel}'`), `handler principal ausente: ${channel}`);
}

console.log("Options menu: 17 controls and native shell verified");
