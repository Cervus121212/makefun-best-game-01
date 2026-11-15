// Lumen Drift — a small seeded random generator (mulberry32) and helpers.
// One job: deterministic randomness, so a seeded run always draws the same sky.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(random, low, high) {
  return low + random() * (high - low);
}

export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
