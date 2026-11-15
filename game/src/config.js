// Lumen Drift — shared constants: field size, physics tuning and palette.
// One job: every number the rest of the game agrees on lives here.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const MAX_SPEED = 460;
export const THRUST = 300;
export const LAUNCH_MAX_DRAG = 150;
export const LAUNCH_MAX_SPEED = 430;
export const SLOW_RECALL_SPEED = 14;
export const SLOW_RECALL_SECONDS = 2.5;
export const SHIPS_START = 3;
export const MOTE_SCORE = 100;
export const CLEAR_BONUS = 500;
export const SHIP_BONUS = 1000;
export const PAR_SECONDS = [45, 60, 75, 90, 105];

export const PALETTE = {
  spaceTop: '#0b1026',
  spaceBottom: '#1a0f2e',
  nebulaA: '#3b2a6e',
  nebulaB: '#0e4a5e',
  nebulaC: '#6e2a4a',
  hud: '#e8f6ff',
  hudDim: '#9db8cc',
  gold: '#ffd166',
  mote: '#7df9ff',
  gateClosed: '#5a6b7d',
  gateOpen: '#8dff6e',
  wisp: '#fff3b0',
  danger: '#ff5d73',
  planetA: '#7a5cff',
  planetB: '#2ec4b6',
  planetC: '#ff9f5a',
};
