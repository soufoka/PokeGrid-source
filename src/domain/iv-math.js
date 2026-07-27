(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PokeGridIvMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "speed"];
  const EXPONENTS = { hp: .95, atk: .80, def: .80, spa: .80, spd: .80, speed: .95 };

  const finite = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  function projectStat(base, growth, level, quality, key) {
    const b = finite(base);
    const g = finite(growth);
    const lv = finite(level);
    const q = finite(quality);
    if (b == null || g == null || lv == null || q == null || lv <= 0 || q <= 0) return null;
    return Math.round((b + 2 * g) * (lv / 100) * Math.pow(q, EXPONENTS[key]));
  }

  function inferCandidates(observed, base, level, quality, key) {
    const target = finite(observed);
    if (target == null) return [];
    const candidates = [];
    for (let growth = 1; growth <= 32; growth++) {
      if (projectStat(base, growth, level, quality, key) === target) candidates.push(growth);
    }
    return candidates;
  }

  function possibleSums(groups) {
    let sums = new Set([0]);
    for (const group of groups) {
      const next = new Set();
      for (const sum of sums) for (const value of group) next.add(sum + value);
      sums = next;
    }
    return sums;
  }

  function constrainByTotal(groups, total) {
    const expected = finite(total);
    if (expected == null || !groups.every(group => group.length)) return groups;
    const wanted = Math.round(expected);
    return groups.map((group, index) => {
      const before = possibleSums(groups.slice(0, index));
      const after = possibleSums(groups.slice(index + 1));
      const allowed = group.filter(value => {
        for (const left of before) {
          for (const right of after) {
            if (left + value + right === wanted) return true;
          }
        }
        return false;
      });
      return allowed.length ? allowed : group;
    });
  }

  function scenarioFromTotal(total) {
    const parsed = finite(total);
    if (parsed == null || parsed <= 0) {
      return {
        values: Object.fromEntries(STAT_KEYS.map(key => [key, 0])),
        ranges: Object.fromEntries(STAT_KEYS.map(key => [key, null])),
        source: "unknown",
        exact: false
      };
    }
    const wanted = Math.max(6, Math.min(192, Math.round(parsed)));
    const values = Object.fromEntries(STAT_KEYS.map(key => [key, 1]));
    let remaining = wanted - 6;
    let cursor = 0;
    while (remaining > 0) {
      const key = STAT_KEYS[cursor++ % STAT_KEYS.length];
      if (values[key] < 32) {
        values[key]++;
        remaining--;
      }
    }
    const min = Math.max(1, wanted - 5 * 32);
    const max = Math.min(32, wanted - 5);
    return {
      values,
      ranges: Object.fromEntries(STAT_KEYS.map(key => [key, [min, max]])),
      source: "total-scenario",
      exact: false
    };
  }

  function normalizeIvs(pokemon) {
    const provided = pokemon && pokemon.ivs || {};
    const hasIndividual = STAT_KEYS.every(key => finite(provided[key]) != null);
    if (hasIndividual) {
      const values = Object.fromEntries(STAT_KEYS.map(key => [
        key, Math.max(0, Math.min(32, finite(provided[key])))
      ]));
      return {
        values,
        ranges: Object.fromEntries(STAT_KEYS.map(key => [key, [values[key], values[key]]])),
        source: "individual",
        exact: true
      };
    }

    const species = pokemon && pokemon.species;
    const bases = species && species.baseStats || {};
    const observed = pokemon && pokemon.observedStats || {};
    const level = finite(pokemon && pokemon.level);
    const quality = finite(pokemon && pokemon.quality);
    const canInfer = level > 0 && quality > 0 && STAT_KEYS.every(key =>
      finite(observed[key]) != null && finite(bases[key]) != null
    );
    if (!canInfer) return scenarioFromTotal(pokemon && pokemon.ivTotal);

    let groups = STAT_KEYS.map(key =>
      inferCandidates(observed[key], bases[key], level, quality, key)
    );
    groups = constrainByTotal(groups, pokemon && pokemon.ivTotal);
    if (!groups.every(group => group.length)) return scenarioFromTotal(pokemon && pokemon.ivTotal);

    const values = {};
    const ranges = {};
    for (let index = 0; index < STAT_KEYS.length; index++) {
      const key = STAT_KEYS[index];
      const candidates = groups[index];
      const min = candidates[0];
      const max = candidates[candidates.length - 1];
      ranges[key] = [min, max];
      values[key] = candidates.length === 1 ? min : Math.round((min + max) / 2);
    }
    const exact = groups.every(group => group.length === 1);
    return { values, ranges, source: exact ? "observed-exact" : "observed-range", exact };
  }

  function projectPokemon(pokemon, level) {
    const species = pokemon && pokemon.species;
    const bases = species && species.baseStats || {};
    const iv = normalizeIvs(pokemon);
    const quality = Math.max(.01, finite(pokemon && pokemon.quality) || 1);
    const stats = {};
    for (const key of STAT_KEYS) {
      stats[key] = projectStat(bases[key], iv.values[key], level, quality, key);
    }
    const valid = STAT_KEYS.every(key => stats[key] != null);
    const power = valid
      ? Math.round(STAT_KEYS.reduce((sum, key) => sum + stats[key], 0) * quality)
      : null;
    return {
      stats,
      power,
      ivSource: iv.source,
      ivs: iv.values,
      ivRanges: iv.ranges,
      ivExact: iv.exact
    };
  }

  return {
    STAT_KEYS,
    EXPONENTS,
    projectStat,
    inferCandidates,
    normalizeIvs,
    projectPokemon
  };
});
