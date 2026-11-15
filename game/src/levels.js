// Lumen Drift — the five levels: launch pad, gravity wells, light motes,
// void shards and the warp gate. One job: level data, nothing else.
// A planet pulls with `pull` at its surface, falling off with distance squared.
// A mote is collected by flying through it; the gate opens when all are taken.
export const LEVELS = [
  {
    name: 'First Light',
    hint: 'Drag back from the wisp and release to launch. Steer in flight with WASD or arrows.',
    dock: { x: 80, y: 300 },
    gate: { x: 890, y: 300 },
    planets: [
      { x: 480, y: 300, r: 52, pull: 150, color: '#7a5cff' },
    ],
    motes: [
      { x: 260, y: 170 }, { x: 380, y: 430 }, { x: 560, y: 160 }, { x: 700, y: 430 },
    ],
    shards: [],
  },
  {
    name: 'Twin Wells',
    hint: 'Two wells bend your flight. Swing wide around them, never straight through.',
    dock: { x: 80, y: 120 },
    gate: { x: 890, y: 480 },
    planets: [
      { x: 380, y: 210, r: 46, pull: 170, color: '#2ec4b6' },
      { x: 620, y: 400, r: 48, pull: 170, color: '#7a5cff' },
    ],
    motes: [
      { x: 250, y: 430 }, { x: 480, y: 90 }, { x: 500, y: 320 },
      { x: 700, y: 200 }, { x: 800, y: 330 },
    ],
    shards: [
      { x: 500, y: 520 }, { x: 660, y: 90 },
    ],
  },
  {
    name: 'The Shard Field',
    hint: 'Void shards end a flight on touch. Thread between them — slow is smooth.',
    dock: { x: 80, y: 300 },
    gate: { x: 890, y: 300 },
    planets: [
      { x: 480, y: 120, r: 40, pull: 140, color: '#ff9f5a' },
    ],
    motes: [
      { x: 240, y: 140 }, { x: 400, y: 300 }, { x: 560, y: 460 },
      { x: 700, y: 180 }, { x: 800, y: 420 },
    ],
    shards: [
      { x: 320, y: 300 }, { x: 480, y: 300 }, { x: 640, y: 300 },
      { x: 400, y: 480 }, { x: 640, y: 130 },
    ],
  },
  {
    name: 'Heavy Heart',
    hint: 'One great well owns this sky. Use its pull as a sling — or it keeps you.',
    dock: { x: 80, y: 500 },
    gate: { x: 890, y: 100 },
    planets: [
      { x: 480, y: 300, r: 78, pull: 300, color: '#7a5cff' },
      { x: 760, y: 460, r: 34, pull: 130, color: '#2ec4b6' },
    ],
    motes: [
      { x: 220, y: 180 }, { x: 340, y: 420 }, { x: 480, y: 80 },
      { x: 620, y: 200 }, { x: 700, y: 330 }, { x: 830, y: 260 },
    ],
    shards: [
      { x: 250, y: 330 }, { x: 620, y: 500 },
    ],
  },
  {
    name: 'The Long Way Home',
    hint: 'The last road home. Every mote, every well — then the gate.',
    dock: { x: 80, y: 300 },
    gate: { x: 890, y: 300 },
    planets: [
      { x: 330, y: 170, r: 44, pull: 170, color: '#ff9f5a' },
      { x: 480, y: 430, r: 50, pull: 190, color: '#7a5cff' },
      { x: 660, y: 180, r: 42, pull: 160, color: '#2ec4b6' },
    ],
    motes: [
      { x: 200, y: 470 }, { x: 330, y: 330 }, { x: 480, y: 110 },
      { x: 560, y: 300 }, { x: 700, y: 450 }, { x: 810, y: 160 },
    ],
    shards: [
      { x: 200, y: 220 }, { x: 400, y: 250 }, { x: 600, y: 380 },
      { x: 780, y: 300 },
    ],
  },
];
