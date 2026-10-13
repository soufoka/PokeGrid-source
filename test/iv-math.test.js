"use strict";

const assert = require("node:assert/strict");
const {
  STAT_KEYS,
  projectPokemon,
  normalizeIvs
} = require("../src/domain/iv-math");

const gyarados = {
  level: 138,
  quality: 1.53,
  ivTotal: 177,
  ivs: { hp: 31, atk: 30, def: 28, spa: 27, spd: 30, speed: 31 },
  species: { baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, speed: 81 } }
};

const current = projectPokemon(gyarados, 138);
assert.deepEqual(STAT_KEYS.map(key => current.stats[key]), [325, 359, 262, 221, 310, 296]);
assert.equal(current.power, 2713);

const level500 = projectPokemon(gyarados, 500);
assert.deepEqual(STAT_KEYS.map(key => level500.stats[key]), [1176, 1300, 949, 801, 1124, 1071]);
assert.equal(level500.power, 9824);

const inferred = normalizeIvs({
  ...gyarados,
  ivs: {},
  observedStats: current.stats
});
assert.equal(inferred.source, "observed-exact");
assert.deepEqual(inferred.values, gyarados.ivs);

const totalOnly = normalizeIvs({
  ivTotal: 177,
  level: 138,
  quality: 1.53,
  species: gyarados.species
});
assert.equal(totalOnly.source, "total-scenario");
assert.equal(totalOnly.exact, false);
assert.deepEqual(totalOnly.ranges.hp, [17, 32]);

// o tooltip do jogo mostra a qualidade com 2 casas (toFixed(2)): Tyranitar real, x1,71 na tela e 1,7062 de verdade.
// Com 1,71 exato so o SpA fecha; com a janela de meia casa (e o poder apertando) os 6 fecham num IV so.
const tyranitar = {
  level: 149,
  quality: 1.71,
  ivTotal: 140,
  power: 3513,
  observedStats: { hp: 386, atk: 452, def: 370, spa: 240, spd: 361, speed: 250 },
  species: { baseStats: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, speed: 61 } }
};
const ivsTyranitar = { hp: 28, atk: 32, def: 26, spa: 5, spd: 29, speed: 20 };
const tyr = normalizeIvs(tyranitar);
assert.equal(tyr.source, "observed-exact");
assert.deepEqual(tyr.values, ivsTyranitar);
assert.ok(tyr.quality > 3512.5 / 2059 && tyr.quality < 3513.5 / 2059, "qualidade de verdade dentro da janela do poder: " + tyr.quality);
assert.equal(projectPokemon(tyranitar, 149).power, 3513);
const semPoder = normalizeIvs({ ...tyranitar, power: undefined });
assert.deepEqual(semPoder.values, ivsTyranitar);
assert.equal(semPoder.exact, true);
const digitada = normalizeIvs({ ...tyranitar, power: undefined, quality: 1.7062 }); // mais casas: vale a precisao dela
assert.deepEqual(digitada.values, ivsTyranitar);

// 12/10/2026: o jogo sorteia a qualidade com 3 casas (rollQuality). Slaking real 1,425 aparece como x1,43, e com 1,43 os 6
// atributos fechavam num IV so, ERRADO (23/22/27/32/5/14), com o card dizendo exato. As qualidades de 3 casas vem primeiro.
const slaking = {
  level: 20,
  quality: 1.43,
  ivTotal: 123,
  power: 353,
  observedStats: { hp: 55, atk: 54, def: 41, spa: 42, spd: 20, speed: 36 },
  species: { baseStats: { hp: 150, atk: 160, def: 100, spa: 95, spd: 65, speed: 100 } }
};
const verdadeSlaking = { hp: 24, atk: 21, def: 27, spa: 31, spd: 6, speed: 14 };
const sl = normalizeIvs(slaking);
assert.ok(Object.keys(verdadeSlaking).every((k) => sl.ranges[k][0] <= verdadeSlaking[k] && verdadeSlaking[k] <= sl.ranges[k][1]), "o IV de verdade dentro de cada faixa: " + JSON.stringify(sl.ranges));
assert.ok(!sl.exact || JSON.stringify(sl.values) === JSON.stringify(verdadeSlaking), "nunca exato com IV errado");

console.log("IV math: 13 checks passed");
