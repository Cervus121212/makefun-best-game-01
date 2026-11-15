// Lumen Drift — deterministic screenshot scenes: each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame.
//   title: the title screen over level 1, wisp docked and waiting.
//   play:  the autopilot launches, steers and collects motes mid-flight.
//   win:   the autopilot clears all five levels and the victory screen shows.
//   over:  a reckless pilot flies straight into the wells until no wisp is left.
import { STEP, MAX_SPEED, THRUST } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_VICTORY, EVENT_CLEAR, EVENT_OVER, EVENT_VICTORY } from './world.js';
import { LEVELS } from './levels.js';

const TITLE_STEPS = 3 * 60;
const PLAY_STEPS = 22 * 60;
const WIN_STEPS = 1500 * 60;
const OVER_STEPS = 600 * 60;

function emptyCommand() {
  return { thrustX: 0, thrustY: 0, launch: null, aim: null, confirm: false, pause: false, restart: false };
}

function nearestTarget(state, data) {
  const wisp = state.wisp;
  if (state.gateOpen) return data.gate;
  let best = null;
  let bestDistance = Infinity;
  for (const mote of state.motes) {
    if (mote.taken) continue;
    const distance = Math.hypot(mote.x - wisp.x, mote.y - wisp.y);
    if (distance < bestDistance) { bestDistance = distance; best = mote; }
  }
  return best ?? data.gate;
}

/** Distance from a point to the segment between two points. */
function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const nearX = from.x + t * dx;
  const nearY = from.y + t * dy;
  return Math.hypot(point.x - nearX, point.y - nearY);
}

/**
 * Where the pilot steers right now: the real target, unless a planet blocks the
 * straight line to it — then a point on the near side of that planet, so the
 * flight walks around the well instead of falling into it.
 */
function immediateTarget(state, data) {
  const target = nearestTarget(state, data);
  const wisp = state.wisp;
  for (const planet of data.planets) {
    if (distanceToSegment(planet, wisp, target) < planet.r + 55) {
      const midX = (wisp.x + target.x) / 2;
      const midY = (wisp.y + target.y) / 2;
      let px = midX - planet.x;
      let py = midY - planet.y;
      const length = Math.max(1, Math.hypot(px, py));
      px /= length; py /= length;
      return { x: planet.x + px * (planet.r + 85), y: planet.y + py * (planet.r + 85) };
    }
  }
  return target;
}

// The good pilot's memory: how long this flight has gone without a mote, and
// whether it has given up steering and is braking to a stop so the wisp is
// recalled to the pad for a fresh launch.
let pilotMemory = { mode: 'fly', flySteps: 0, taken: 0 };

function goodPilot(state, data) {
  const cmd = emptyCommand();
  const wisp = state.wisp;
  const taken = state.motes.filter((m) => m.taken).length;
  if (wisp.mode === 'docked') {
    pilotMemory.mode = 'fly';
    pilotMemory.flySteps = 0;
    pilotMemory.taken = taken;
    const target = nearestTarget(state, data);
    const dx = target.x - wisp.x;
    const dy = target.y - wisp.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = Math.min(MAX_SPEED * 0.55, 160 + distance * 0.45);
    cmd.launch = { vx: (dx / distance) * speed, vy: (dy / distance) * speed };
    return cmd;
  }
  if (wisp.mode === 'flying') {
    if (taken > pilotMemory.taken) { pilotMemory.taken = taken; pilotMemory.flySteps = 0; }
    else pilotMemory.flySteps += 1;
    // Six seconds without a mote: this flight is lost in an orbit. Brake to a
    // stop — the slow-recall brings the wisp home for a fresh launch.
    if (pilotMemory.flySteps > 6 * 60) pilotMemory.mode = 'brake';
    if (pilotMemory.mode === 'brake') {
      const speed = Math.hypot(wisp.vx, wisp.vy);
      if (speed > 1) {
        cmd.thrustX = -wisp.vx / speed;
        cmd.thrustY = -wisp.vy / speed;
      }
      return cmd;
    }
    const target = immediateTarget(state, data);
    const dx = target.x - wisp.x;
    const dy = target.y - wisp.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    // Velocity matching: chase a desired velocity toward the target (slow near
    // it, so the wisp can stop on it), instead of raw thrust — raw thrust
    // outruns its own steering and ends in wide, mote-missing swings.
    const desiredSpeed = distance < 120 ? 70 : 180;
    let dirX = dx / distance;
    let dirY = dy / distance;
    // Steer around hazards: push the desired direction away from every well
    // and shard nearby, so the flight bends around them, never through them.
    for (const planet of data.planets) {
      const px = wisp.x - planet.x;
      const py = wisp.y - planet.y;
      const pd = Math.max(1, Math.hypot(px, py));
      const zone = planet.r + 170;
      if (pd < zone) {
        const weight = (1 - (pd - planet.r) / (zone - planet.r)) * 2.2;
        dirX += (px / pd) * weight;
        dirY += (py / pd) * weight;
      }
    }
    for (const shard of data.shards) {
      const sx = wisp.x - shard.x;
      const sy = wisp.y - shard.y;
      const sd = Math.max(1, Math.hypot(sx, sy));
      if (sd < 130) {
        const weight = (1 - sd / 130) * 1.8;
        dirX += (sx / sd) * weight;
        dirY += (sy / sd) * weight;
      }
    }
    const dirLength = Math.max(0.001, Math.hypot(dirX, dirY));
    dirX /= dirLength;
    dirY /= dirLength;
    const gain = 3.0;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    cmd.thrustX = clamp((gain * (dirX * desiredSpeed - wisp.vx)) / THRUST);
    cmd.thrustY = clamp((gain * (dirY * desiredSpeed - wisp.vy)) / THRUST);
  }
  return cmd;
}

function recklessPilot(state, data) {
  const cmd = emptyCommand();
  const wisp = state.wisp;
  if (wisp.mode === 'docked') {
    const planet = data.planets[0];
    const dx = planet.x - wisp.x;
    const dy = planet.y - wisp.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    cmd.launch = { vx: (dx / distance) * MAX_SPEED, vy: (dy / distance) * MAX_SPEED };
  }
  return cmd;
}

/**
 * Set `world` to the named scene (title, play, win or over; any other name is
 * title) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  pilotMemory = { mode: 'fly', flySteps: 0, taken: 0 };
  if (name !== 'play' && name !== 'win' && name !== 'over') {
    for (let i = 0; i < TITLE_STEPS; i += 1) world.step(STEP, emptyCommand());
    return { screen: state.screen };
  }
  // Start the game, then let the pilot fly.
  world.step(STEP, { ...emptyCommand(), confirm: true });
  const pilot = name === 'over' ? recklessPilot : goodPilot;
  const limit = name === 'over' ? OVER_STEPS : name === 'win' ? WIN_STEPS : PLAY_STEPS;
  for (let i = 0; i < limit; i += 1) {
    if (state.screen === SCREEN_VICTORY || state.screen === SCREEN_OVER) break;
    if (state.screen !== SCREEN_PLAY) {
      // Level-clear intermission: press on to the next level.
      world.step(STEP, { ...emptyCommand(), confirm: true });
      continue;
    }
    const events = world.step(STEP, pilot(state, LEVELS[state.levelIndex]));
    void events;
    if (name === 'play' && state.motes.filter((m) => m.taken).length >= 2 && state.wisp.mode === 'flying') {
      // A lively mid-flight frame: two motes in, wisp still flying.
      break;
    }
    void EVENT_CLEAR; void EVENT_OVER; void EVENT_VICTORY;
  }
  return { screen: state.screen };
}
