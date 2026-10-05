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

  // A qualidade que o jogo mostra vem com 2 casas (toFixed(2)): a de verdade esta a ate meia casa dela, e com 1,71 no lugar
  // de 1,7062 quase nenhum atributo fecha com IV inteiro. O poder do jogo (round da soma dos atributos x qualidade) aperta a
  // janela quando vem junto. Valor digitado com mais casas vale com a precisao dele.
  function qualityWindow(quality, power, observed) {
    const dec = (String(quality).split(".")[1] || "").length;
    const half = dec > 2 ? 0.5 * Math.pow(10, -Math.min(dec, 9)) : 0.005;
    let lo = quality - half;
    let hi = quality + half;
    const p = finite(power);
    const sum = STAT_KEYS.reduce((acc, key) => acc + (finite(observed[key]) || 0), 0);
    if (p > 0 && sum > 0) {
      const plo = (p - 0.5) / sum;
      const phi = (p + 0.5) / sum;
      if (plo < hi && phi > lo) { lo = Math.max(lo, plo); hi = Math.min(hi, phi); }
    }
    return [Math.max(1e-6, lo), hi];
  }

  // um q no meio de cada trecho da janela entre os pontos em que algum atributo muda de valor (round vira no meio inteiro)
  function qualityProbes(lo, hi, observed, bases, level) {
    const points = [lo, hi];
    for (const key of STAT_KEYS) {
      const s = finite(observed[key]);
      const b = finite(bases[key]);
      for (let growth = 1; growth <= 32; growth++) {
        const x = (b + 2 * growth) * level / 100;
        if (!(x > 0)) continue;
        for (const v of [s - 0.5, s + 0.5]) {
          if (v <= 0) continue;
          const q = Math.pow(v / x, 1 / EXPONENTS[key]);
          if (q > lo && q < hi) points.push(q);
        }
      }
    }
    points.sort((a, b) => a - b);
    const probes = [];
    for (let i = 0; i + 1 < points.length; i++) {
      if (points[i + 1] - points[i] > 1e-12) probes.push((points[i] + points[i + 1]) / 2);
    }
    return probes.length ? probes : [(lo + hi) / 2];
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

    // Primeiro a qualidade como veio; se com ela algum atributo nao fecha (ou o IV total nao bate), a janela de meia casa
    // em volta dela. Em cada q junta os IV que somam o IV total do jogo; sem total que feche, vale o que os atributos
    // sozinhos dizem (como antes).
    const [lo, hi] = qualityWindow(quality, pokemon && pokemon.power, observed);
    const total = finite(pokemon && pokemon.ivTotal);
    const wanted = total == null ? null : Math.round(total);
    let probes = [quality];
    const collect = useTotal => {
      const union = STAT_KEYS.map(() => new Set());
      let qMin = Infinity;
      let qMax = -Infinity;
      for (const q of probes) {
        const groups = STAT_KEYS.map(key => inferCandidates(observed[key], bases[key], level, q, key));
        if (!groups.every(group => group.length)) continue;
        if (useTotal && !possibleSums(groups).has(wanted)) continue;
        (useTotal ? constrainByTotal(groups, wanted) : groups).forEach((group, i) => group.forEach(v => union[i].add(v)));
        qMin = Math.min(qMin, q);
        qMax = Math.max(qMax, q);
      }
      return qMax >= qMin ? { union, quality: (qMin + qMax) / 2 } : null;
    };
    const window = qualityProbes(lo, hi, observed, bases, level);
    const tenta = useTotal => {
      probes = [quality];
      const exato = collect(useTotal);
      if (exato) return exato;
      probes = window;
      return collect(useTotal);
    };
    const found = (wanted != null && tenta(true)) || tenta(false);
    if (!found) return scenarioFromTotal(pokemon && pokemon.ivTotal);

    const values = {};
    const ranges = {};
    const groups = found.union.map(set => [...set].sort((a, b) => a - b));
    for (let index = 0; index < STAT_KEYS.length; index++) {
      const key = STAT_KEYS[index];
      const candidates = groups[index];
      const min = candidates[0];
      const max = candidates[candidates.length - 1];
      ranges[key] = [min, max];
      values[key] = candidates.length === 1 ? min : Math.round((min + max) / 2);
    }
    const exact = groups.every(group => group.length === 1);
    return { values, ranges, source: exact ? "observed-exact" : "observed-range", exact, quality: found.quality };
  }

  function projectPokemon(pokemon, level) {
    const species = pokemon && pokemon.species;
    const bases = species && species.baseStats || {};
    const iv = normalizeIvs(pokemon);
    // a qualidade de verdade (achada pelos atributos) quando houve leitura; senao a informada
    const quality = Math.max(.01, finite(iv.quality) || finite(pokemon && pokemon.quality) || 1);
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
