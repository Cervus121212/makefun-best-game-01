// Lumen Drift — bootstrap: fixed-step loop, real input, and the deterministic
// screenshot mode (?shot=title|play|win|over&seed=N) the maker uses for shots.
// One job: wire input, world, audio and renderer together and run the loop.
import { FIELD, STEP, LAUNCH_MAX_DRAG, LAUNCH_MAX_SPEED } from './config.js';
import { createWorld, SCREEN_TITLE } from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

canvas.width = FIELD.width;
canvas.height = FIELD.height;

const audio = createAudio();
const world = createWorld(audio);
const renderer = createRenderer(canvas, seed);
const input = createInput(canvas);
const status = document.getElementById('status');
let draggingBefore = false;

function setStatus() {
  const state = world.state;
  status.textContent = `Lumen Drift — level ${state.levelIndex + 1}, score ${state.score}, `
    + `${state.ships} wisps left, ${state.motes.filter((m) => m.taken).length} of ${state.motes.length} motes.`;
}

function commandFromInput() {
  const state = world.state;
  const pointer = input.pointer;
  const cmd = {
    thrustX: input.thrustX(),
    thrustY: input.thrustY(),
    launch: null,
    aim: null,
    confirm: input.wasPressed('Enter') || input.wasPressed('Space'),
    pause: input.wasPressed('KeyP') || input.wasPressed('Escape'),
    restart: input.wasPressed('KeyR'),
  };
  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    status.textContent = muted ? 'Sound muted.' : 'Sound on.';
  }
  if (state.screen === SCREEN_TITLE && pointer.down) cmd.confirm = true;
  if (state.wisp.mode === 'docked') {
    if (pointer.dragging) {
      // Dragging back from the wisp aims the slingshot; releasing fires it.
      cmd.aim = { x: pointer.x, y: pointer.y };
    } else if (draggingBefore && !pointer.down && state.aim !== null) {
      // The release edge: launch along the last aim arrow, if it was a real pull.
      const power = Math.hypot(state.aim.x, state.aim.y);
      if (power > 40) cmd.launch = { vx: state.aim.x, vy: state.aim.y };
    }
    if (input.wasPressed('Space') && state.aim !== null) {
      // Keyboard launch: Space fires along the shown aim arrow.
      cmd.launch = { vx: state.aim.x, vy: state.aim.y };
      cmd.confirm = false;
    }
  }
  draggingBefore = pointer.dragging;
  return cmd;
}

if (shotName !== null) {
  // Screenshot mode: stage one deterministic scene, draw it once, signal ready.
  stageShot(shotName, world);
  renderer.render(world.state);
  setStatus();
  window.__shotReady = true;
} else {
  // A handle for play-testing and debugging from the console.
  window.__lumen = world;
  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      const cmd = commandFromInput();
      if (steps === 0) audio.unlock();
      world.step(STEP, cmd);
      input.consumePressed();
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 5) accumulator = 0;
    renderer.render(world.state);
    setStatus();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
