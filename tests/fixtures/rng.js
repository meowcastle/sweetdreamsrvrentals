// Deterministic, seedable PRNG so any chaos failure reproduces exactly.
// Usage: const rng = makeRng(seed); rng.float(); rng.int(0, 9); rng.pick([...]);

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const seedStr = String(seed);
  const next = mulberry32(xmur3(seedStr)());
  return {
    seed: seedStr,
    float: () => next(),
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    bool: (p = 0.5) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // weighted: pass [[item, weight], ...]
    weighted: (pairs) => {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [item, w] of pairs) {
        if ((r -= w) <= 0) return item;
      }
      return pairs[pairs.length - 1][0];
    },
  };
}

module.exports = { makeRng };
