// Lumen Drift — the game itself: state machine, physics and rules.
// One job: advance the world one fixed step from a command, and say what happened.
// Commands come from real input (main.js) or the autopilot (shots.js): the same
// shape either way, so a screenshot scene is a real game being played.
import {
  FIELD, STEP, MAX_SPEED, THRUST, LAUNCH_MAX_DRAG, LAUNCH_MAX_SPEED,
  SLOW_RECALL_SPEED, SLOW_RECALL_SECONDS, SHIPS_START, MOTE_SCORE,
  CLEAR_BONUS, SHIP_BONUS, PAR_SECONDS,
} from './config.js';
import { LEVELS } from './levels.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_CLEAR = 1;
export const EVENT_OVER = 2;
export const EVENT_VICTORY = 4;

const BEST_KEY = 'lumen-drift-best';

export function loadBest() {
  try { return Number(window.localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

export function saveBest(score) {
  try { window.localStorage.setItem(BEST_KEY, String(score)); } catch { /* private mode */ }
}

export function createWorld(audio) {
  const state = {
    screen: SCREEN_TITLE,
    levelIndex: 0,
    score: 0,
    ships: SHIPS_START,
    best: loadBest(),
    levelTime: 0,
    totalTime: 0,
    time: 0,
    wisp: { x: 0, y: 0, vx: 0, vy: 0, mode: 'docked', slowTimer: 0 },
    motes: [],
    trail: [],
    particles: [],
    shake: 0,
    respawnTimer: 0,
    clearTimer: 0,
    clearBonus: 0,
    // Default keyboard aim: up and right, toward the first mote — never
    // straight at the planet sitting in the middle of level 1.
    keyboardAim: { angle: -0.6, power: 0.65 },
    aim: null,
    gateOpen: false,
    levelStartScore: 0,
  };

  function level() { return LEVELS[state.levelIndex]; }

  function loadLevel(index) {
    const data = LEVELS[index];
    state.levelIndex = index;
    state.levelTime = 0;
    state.motes = data.motes.map((m) => ({ x: m.x, y: m.y, taken: false }));
    state.wisp.x = data.dock.x; state.wisp.y = data.dock.y;
    state.wisp.vx = 0; state.wisp.vy = 0; state.wisp.mode = 'docked'; state.wisp.slowTimer = 0;
    state.trail.length = 0;
    state.gateOpen = false;
    state.aim = null;
    state.respawnTimer = 0;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + state.time;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * (0.4 + 0.6 * ((i * 37) % 10) / 10),
        vy: Math.sin(angle) * speed * (0.4 + 0.6 * ((i * 53) % 10) / 10),
        life: 0.7, maxLife: 0.7, color, size: 2 + ((i * 29) % 3),
      });
    }
  }

  function crash() {
    const wisp = state.wisp;
    burst(wisp.x, wisp.y, '#ff5d73', 26, 220);
    burst(wisp.x, wisp.y, '#ffd166', 14, 140);
    state.shake = 14;
    state.ships -= 1;
    audio.crash();
    wisp.mode = 'gone';
    wisp.vx = 0; wisp.vy = 0;
    if (state.ships <= 0) {
      state.screen = SCREEN_OVER;
      if (state.score > state.best) { state.best = state.score; saveBest(state.score); }
      return EVENT_OVER;
    }
    state.respawnTimer = 1.0;
    return EVENT_NONE;
  }

  function recall() {
    const data = level();
    state.wisp.x = data.dock.x; state.wisp.y = data.dock.y;
    state.wisp.vx = 0; state.wisp.vy = 0; state.wisp.mode = 'docked'; state.wisp.slowTimer = 0;
    state.trail.length = 0;
    burst(data.dock.x, data.dock.y, '#7df9ff', 10, 60);
  }

  function clearLevel() {
    const timeBonus = Math.max(0, Math.round((PAR_SECONDS[state.levelIndex] - state.levelTime) * 10));
    state.clearBonus = CLEAR_BONUS + timeBonus;
    state.score += state.clearBonus;
    audio.clear();
    burst(level().gate.x, level().gate.y, '#8dff6e', 30, 200);
    if (state.levelIndex >= LEVELS.length - 1) {
      state.score += state.ships * SHIP_BONUS;
      state.screen = SCREEN_VICTORY;
      if (state.score > state.best) { state.best = state.score; saveBest(state.score); }
      audio.victory();
      return EVENT_VICTORY;
    }
    state.screen = SCREEN_CLEAR;
    state.clearTimer = 0;
    return EVENT_CLEAR;
  }

  function stepPlay(dt, cmd) {
    const data = level();
    const wisp = state.wisp;
    state.levelTime += dt;
    state.totalTime += dt;

    if (cmd.restart) { state.score = state.levelStartScore; loadLevel(state.levelIndex); return EVENT_NONE; }
    if (cmd.pause) { state.screen = SCREEN_PAUSE; return EVENT_NONE; }

    if (wisp.mode === 'gone') {
      state.respawnTimer -= dt;
      if (state.respawnTimer <= 0) recall();
    } else if (wisp.mode === 'docked') {
      // Keyboard aim: left/right rotate, up/down change power, Space launches.
      if (cmd.thrustX !== 0) state.keyboardAim.angle += cmd.thrustX * 1.9 * dt;
      if (cmd.thrustY !== 0) state.keyboardAim.power = Math.min(1, Math.max(0.25, state.keyboardAim.power - cmd.thrustY * 0.7 * dt));
      if (cmd.aim !== null) {
        const dx = state.wisp.x - cmd.aim.x;
        const dy = state.wisp.y - cmd.aim.y;
        const length = Math.hypot(dx, dy);
        state.aim = length > 8 ? { x: dx, y: dy, length } : null;
      } else {
        const power = state.keyboardAim.power * LAUNCH_MAX_SPEED;
        state.aim = {
          x: Math.cos(state.keyboardAim.angle) * power,
          y: Math.sin(state.keyboardAim.angle) * power,
          length: state.keyboardAim.power * LAUNCH_MAX_DRAG,
        };
      }
      if (cmd.launch !== null) {
        const speed = Math.min(LAUNCH_MAX_SPEED, Math.hypot(cmd.launch.vx, cmd.launch.vy));
        if (speed > 40) {
          wisp.vx = (cmd.launch.vx / Math.hypot(cmd.launch.vx, cmd.launch.vy)) * speed;
          wisp.vy = (cmd.launch.vy / Math.hypot(cmd.launch.vx, cmd.launch.vy)) * speed;
          wisp.mode = 'flying';
          state.aim = null;
          audio.launch();
        }
      }
    } else if (wisp.mode === 'flying') {
      // Gravity from every planet, then thrust, then integrate.
      let ax = 0; let ay = 0;
      for (const planet of data.planets) {
        const dx = planet.x - wisp.x;
        const dy = planet.y - wisp.y;
        const distance = Math.max(planet.r * 0.9, Math.hypot(dx, dy));
        const pull = planet.pull * ((planet.r / distance) ** 2);
        ax += (dx / distance) * pull;
        ay += (dy / distance) * pull;
      }
      ax += cmd.thrustX * THRUST;
      ay += cmd.thrustY * THRUST;
      wisp.vx += ax * dt;
      wisp.vy += ay * dt;
      const speed = Math.hypot(wisp.vx, wisp.vy);
      if (speed > MAX_SPEED) { wisp.vx = (wisp.vx / speed) * MAX_SPEED; wisp.vy = (wisp.vy / speed) * MAX_SPEED; }
      wisp.x += wisp.vx * dt;
      wisp.y += wisp.vy * dt;
      state.trail.push({ x: wisp.x, y: wisp.y, life: 0.45 });
      if (state.trail.length > 42) state.trail.shift();

      // A wisp that has drifted to a stop is recalled to the pad, free of charge.
      if (speed < SLOW_RECALL_SPEED) {
        wisp.slowTimer += dt;
        if (wisp.slowTimer > SLOW_RECALL_SECONDS) { recall(); return EVENT_NONE; }
      } else {
        wisp.slowTimer = 0;
      }

      // Out of the sky entirely: lost, but the ship is not.
      if (wisp.x < -60 || wisp.x > FIELD.width + 60 || wisp.y < -60 || wisp.y > FIELD.height + 60) {
        recall();
        return EVENT_NONE;
      }

      for (const mote of state.motes) {
        if (!mote.taken && Math.hypot(mote.x - wisp.x, mote.y - wisp.y) < 24) {
          mote.taken = true;
          state.score += MOTE_SCORE;
          burst(mote.x, mote.y, '#7df9ff', 16, 130);
          audio.collect();
          if (state.motes.every((m) => m.taken)) { state.gateOpen = true; audio.gateOpen(); }
        }
      }
      for (const planet of data.planets) {
        if (Math.hypot(planet.x - wisp.x, planet.y - wisp.y) < planet.r + 7) return crash();
      }
      for (const shard of data.shards) {
        if (Math.hypot(shard.x - wisp.x, shard.y - wisp.y) < 18) return crash();
      }
      if (state.gateOpen && Math.hypot(data.gate.x - wisp.x, data.gate.y - wisp.y) < 32) {
        return clearLevel();
      }
    }
    return EVENT_NONE;
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const t of state.trail) t.life -= dt;
    state.trail = state.trail.filter((t) => t.life > 0);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 30 * dt);
  }

  function startGame() {
    state.score = 0;
    state.ships = SHIPS_START;
    state.totalTime = 0;
    state.levelStartScore = 0;
    loadLevel(0);
    state.screen = SCREEN_PLAY;
  }

  function reset() {
    state.score = 0;
    state.ships = SHIPS_START;
    state.totalTime = 0;
    state.best = loadBest();
    state.particles.length = 0;
    state.trail.length = 0;
    state.shake = 0;
    loadLevel(0);
    state.screen = SCREEN_TITLE;
  }

  reset();

  return {
    state,
    level,
    reset,
    startGame,
    loadLevel,
    step(dt, cmd) {
      state.time += dt;
      updateParticles(dt);
      if (state.screen === SCREEN_TITLE) {
        if (cmd.confirm || cmd.launch !== null) { audio.click(); startGame(); }
        return EVENT_NONE;
      }
      if (state.screen === SCREEN_PLAY) return stepPlay(dt, cmd);
      if (state.screen === SCREEN_PAUSE) {
        if (cmd.pause || cmd.confirm) { state.screen = SCREEN_PLAY; audio.click(); }
        else if (cmd.restart) { state.score = state.levelStartScore; loadLevel(state.levelIndex); state.screen = SCREEN_PLAY; }
        return EVENT_NONE;
      }
      if (state.screen === SCREEN_CLEAR) {
        state.clearTimer += dt;
        if (cmd.confirm || state.clearTimer > 3.0) {
          state.levelStartScore = state.score;
          loadLevel(state.levelIndex + 1);
          state.screen = SCREEN_PLAY;
        }
        return EVENT_NONE;
      }
      if (state.screen === SCREEN_VICTORY || state.screen === SCREEN_OVER) {
        if (cmd.confirm) { reset(); }
        else if (cmd.restart) { startGame(); }
        return EVENT_NONE;
      }
      return EVENT_NONE;
    },
  };
}
