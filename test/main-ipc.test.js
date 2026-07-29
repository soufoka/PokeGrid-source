"use strict";

// Guarda de boot: dois ipcMain.handle no mesmo canal fazem o Electron lancar
// "Attempted to register a second handler" durante o carregamento do main.js,
// antes do whenReady e de qualquer janela -- o app simplesmente nao abre.
// Foi o que aconteceu com 'webhook:send' da 1.5.5 ate a 1.5.9. O teste le o
// fonte porque carregar o main.js de verdade exigiria o Electron rodando.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fonte = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
const canais = [...fonte.matchAll(/ipcMain\.handle(?:Once)?\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const repetidos = [...new Set(canais.filter((canal, i) => canais.indexOf(canal) !== i))];

assert.ok(canais.length > 0, "nenhum ipcMain.handle encontrado: o padrao de busca ficou desatualizado");
assert.deepEqual(repetidos, [], `canal registrado mais de uma vez em main.js: ${repetidos.join(", ")}`);

console.log(`IPC do main: ${canais.length} canais, 0 duplicados`);
