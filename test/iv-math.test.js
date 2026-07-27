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

console.log("IV math: 4 checks passed");
