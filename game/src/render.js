// Lumen Drift — everything the player sees: the sky, the world and the screens.
// One job: draw the current state on a 960x600 canvas, deterministically.
import { FIELD, PALETTE, CLEAR_BONUS } from './config.js';
import { makeRandom, range } from './random.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_CLEAR, SCREEN_VICTORY, SCREEN_OVER,
} from './world.js';
import { LEVELS } from './levels.js';

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function buildSky(seed, levelIndex) {
  const random = makeRandom(seed * 1000 + levelIndex * 77 + 13);
  const sky = document.createElement('canvas');
  sky.width = FIELD.width;
  sky.height = FIELD.height;
  const g = sky.getContext('2d');
  const gradient = g.createLinearGradient(0, 0, 0, FIELD.height);
  gradient.addColorStop(0, PALETTE.spaceTop);
  gradient.addColorStop(1, PALETTE.spaceBottom);
  g.fillStyle = gradient;
  g.fillRect(0, 0, FIELD.width, FIELD.height);
  for (let i = 0; i < 5; i += 1) {
    const x = range(random, 0, FIELD.width);
    const y = range(random, 0, FIELD.height);
    const radius = range(random, 120, 260);
    const color = [PALETTE.nebulaA, PALETTE.nebulaB, PALETTE.nebulaC][i % 3];
    const blob = g.createRadialGradient(x, y, 0, x, y, radius);
    blob.addColorStop(0, color);
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.5;
    g.fillStyle = blob;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 150; i += 1) {
    const x = range(random, 0, FIELD.width);
    const y = range(random, 0, FIELD.height);
    const size = range(random, 0.5, 2.2);
    g.globalAlpha = range(random, 0.3, 1);
    g.fillStyle = i % 9 === 0 ? PALETTE.gold : '#ffffff';
    g.beginPath();
    g.arc(x, y, size, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return sky;
}

function drawPlanet(g, planet, time) {
  const glow = g.createRadialGradient(planet.x, planet.y, planet.r * 0.4, planet.x, planet.y, planet.r * 1.7);
  glow.addColorStop(0, `${planet.color}55`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(planet.x, planet.y, planet.r * 1.7, 0, Math.PI * 2);
  g.fill();
  const body = g.createRadialGradient(planet.x - planet.r * 0.3, planet.y - planet.r * 0.3, planet.r * 0.1, planet.x, planet.y, planet.r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.25, planet.color);
  body.addColorStop(1, '#1a1030');
  g.fillStyle = body;
  g.beginPath();
  g.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(planet.x, planet.y, planet.r * 1.35, planet.r * 0.28, -0.4 + Math.sin(time * 0.2) * 0.05, 0, Math.PI * 2);
  g.stroke();
}

function drawShard(g, shard, time) {
  const spin = time * 0.8 + shard.x;
  g.save();
  g.translate(shard.x, shard.y);
  g.rotate(spin);
  g.fillStyle = PALETTE.danger;
  g.strokeStyle = '#ffb3bd';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(0, -13);
  g.lineTo(9, 8);
  g.lineTo(-9, 8);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}

function drawMote(g, mote, time) {
  if (mote.taken) return;
  const pulse = 1 + Math.sin(time * 3 + mote.x) * 0.15;
  const glow = g.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, 26 * pulse);
  glow.addColorStop(0, 'rgba(125,249,255,0.7)');
  glow.addColorStop(1, 'rgba(125,249,255,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(mote.x, mote.y, 26 * pulse, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.translate(mote.x, mote.y);
  g.rotate(time * 1.2 + mote.y);
  g.fillStyle = PALETTE.mote;
  g.beginPath();
  g.moveTo(0, -9 * pulse);
  g.lineTo(7 * pulse, 0);
  g.lineTo(0, 9 * pulse);
  g.lineTo(-7 * pulse, 0);
  g.closePath();
  g.fill();
  g.restore();
}

function drawGate(g, gate, open, time) {
  const color = open ? PALETTE.gateOpen : PALETTE.gateClosed;
  const swirl = open ? 1 + Math.sin(time * 4) * 0.12 : 1;
  const glow = g.createRadialGradient(gate.x, gate.y, 0, gate.x, gate.y, 52 * swirl);
  glow.addColorStop(0, open ? 'rgba(141,255,110,0.55)' : 'rgba(90,107,125,0.35)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(gate.x, gate.y, 52 * swirl, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(gate.x, gate.y, 26, time * (open ? 2 : 0.5), time * (open ? 2 : 0.5) + Math.PI * 1.5);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(gate.x, gate.y, 18, -time * (open ? 3 : 0.7), -time * (open ? 3 : 0.7) + Math.PI * 1.2);
  g.stroke();
  if (open) {
    g.fillStyle = color;
    g.font = 'bold 11px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('OPEN', gate.x, gate.y + 44);
  }
}

function drawDock(g, dock, time) {
  g.strokeStyle = 'rgba(232,246,255,0.7)';
  g.lineWidth = 2;
  const pulse = 1 + Math.sin(time * 2) * 0.1;
  g.beginPath();
  g.arc(dock.x, dock.y, 16 * pulse, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([4, 6]);
  g.beginPath();
  g.arc(dock.x, dock.y, 24 * pulse, time * 0.6, time * 0.6 + Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
}

function drawWisp(g, wisp, time) {
  if (wisp.mode === 'gone') return;
  const glow = g.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, 30);
  glow.addColorStop(0, 'rgba(255,243,176,0.9)');
  glow.addColorStop(0.4, 'rgba(255,209,102,0.35)');
  glow.addColorStop(1, 'rgba(255,209,102,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(wisp.x, wisp.y, 30, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = PALETTE.wisp;
  g.beginPath();
  g.arc(wisp.x, wisp.y, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(wisp.x - 2.5, wisp.y - 2.5, 3.5, 0, Math.PI * 2);
  g.fill();
  void time;
}

function drawAim(g, state) {
  if (state.wisp.mode !== 'docked' || state.aim === null) return;
  const wisp = state.wisp;
  const length = Math.hypot(state.aim.x, state.aim.y);
  const dirX = state.aim.x / length;
  const dirY = state.aim.y / length;
  const power = Math.min(1, state.aim.length / 150);
  const endX = wisp.x + dirX * (26 + power * 46);
  const endY = wisp.y + dirY * (26 + power * 46);
  g.strokeStyle = power > 0.85 ? PALETTE.danger : PALETTE.gold;
  g.lineWidth = 3;
  g.setLineDash([8, 7]);
  g.beginPath();
  g.moveTo(wisp.x + dirX * 16, wisp.y + dirY * 16);
  g.lineTo(endX, endY);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = g.strokeStyle;
  g.beginPath();
  g.arc(endX, endY, 5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(232,246,255,0.85)';
  g.font = '12px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('DRAG TO AIM — RELEASE TO LAUNCH', FIELD.width / 2, FIELD.height - 18);
}

function drawHud(g, state) {
  const data = LEVELS[state.levelIndex];
  g.fillStyle = 'rgba(6,10,24,0.55)';
  g.fillRect(0, 0, FIELD.width, 44);
  g.fillStyle = PALETTE.hud;
  g.font = 'bold 15px system-ui, sans-serif';
  g.textAlign = 'left';
  g.fillText(`SCORE ${state.score}`, 14, 28);
  g.fillStyle = PALETTE.hudDim;
  g.font = '13px system-ui, sans-serif';
  g.fillText(`BEST ${state.best}`, 150, 28);
  g.fillStyle = PALETTE.hud;
  g.font = 'bold 15px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(`LEVEL ${state.levelIndex + 1} — ${data.name.toUpperCase()}`, FIELD.width / 2, 28);
  g.textAlign = 'right';
  const taken = state.motes.filter((m) => m.taken).length;
  g.fillStyle = PALETTE.mote;
  g.fillText(`✦ ${taken}/${state.motes.length}`, FIELD.width - 170, 28);
  g.fillStyle = PALETTE.hud;
  g.fillText(`⏱ ${formatTime(state.levelTime)}`, FIELD.width - 96, 28);
  for (let i = 0; i < 3; i += 1) {
    const x = FIELD.width - 52 + i * 16;
    g.fillStyle = i < state.ships ? PALETTE.wisp : 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.arc(x, 22, 5.5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = PALETTE.hudDim;
  g.font = '12px system-ui, sans-serif';
  g.textAlign = 'center';
  if (state.screen === SCREEN_PLAY && state.wisp.mode === 'docked') {
    g.fillText(data.hint, FIELD.width / 2, 62);
  }
}

function panel(g, title, lines, accent) {
  g.fillStyle = 'rgba(6,10,24,0.82)';
  const width = 560;
  const height = 120 + lines.length * 30;
  const x = (FIELD.width - width) / 2;
  const y = (FIELD.height - height) / 2;
  g.fillRect(x, y, width, height);
  g.strokeStyle = accent;
  g.lineWidth = 2;
  g.strokeRect(x, y, width, height);
  g.fillStyle = accent;
  g.font = 'bold 34px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(title, FIELD.width / 2, y + 58);
  g.fillStyle = PALETTE.hud;
  g.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => g.fillText(line, FIELD.width / 2, y + 96 + i * 30));
}

export function createRenderer(canvas, seed) {
  const g = canvas.getContext('2d');
  const skies = new Map();
  function skyFor(levelIndex) {
    if (!skies.has(levelIndex)) skies.set(levelIndex, buildSky(seed, levelIndex));
    return skies.get(levelIndex);
  }

  function render(state) {
    const data = LEVELS[state.levelIndex];
    const time = state.time;
    g.save();
    if (state.shake > 0) {
      g.translate(Math.sin(time * 47) * state.shake * 0.5, Math.cos(time * 39) * state.shake * 0.5);
    }
    g.drawImage(skyFor(state.levelIndex), 0, 0);
    for (const planet of data.planets) drawPlanet(g, planet, time);
    drawGate(g, data.gate, state.gateOpen, time);
    drawDock(g, data.dock, time);
    for (const shard of data.shards) drawShard(g, shard, time);
    for (const mote of state.motes) drawMote(g, mote, time);
    for (const t of state.trail) {
      g.globalAlpha = Math.max(0, t.life / 0.45) * 0.7;
      g.fillStyle = PALETTE.gold;
      g.beginPath();
      g.arc(t.x, t.y, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    for (const p of state.particles) {
      g.globalAlpha = Math.max(0, p.life / p.maxLife);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    drawWisp(g, state.wisp, time);
    if (state.screen === SCREEN_PLAY) drawAim(g, state);
    g.restore();

    if (state.screen === SCREEN_TITLE) {
      g.fillStyle = 'rgba(6,10,24,0.45)';
      g.fillRect(0, 0, FIELD.width, FIELD.height);
      g.fillStyle = PALETTE.gold;
      g.font = 'bold 64px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('LUMEN DRIFT', FIELD.width / 2, 190);
      g.fillStyle = PALETTE.hud;
      g.font = '20px Georgia, serif';
      g.fillText('A slingshot voyage through the nebula', FIELD.width / 2, 228);
      g.font = '16px system-ui, sans-serif';
      g.fillStyle = PALETTE.hudDim;
      g.fillText('Drag back from the wisp and release to launch — gravity bends your flight.', FIELD.width / 2, 300);
      g.fillText('Steer in flight with WASD or arrow keys. Collect every mote to open the gate.', FIELD.width / 2, 326);
      g.fillText('Planets and void shards end a flight. Three wisps. Five levels. Bring them home.', FIELD.width / 2, 352);
      g.fillStyle = PALETTE.wisp;
      g.font = 'bold 20px system-ui, sans-serif';
      const blink = 0.6 + Math.sin(time * 3) * 0.4;
      g.globalAlpha = blink;
      g.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 420);
      g.globalAlpha = 1;
      if (state.best > 0) {
        g.fillStyle = PALETTE.hudDim;
        g.font = '15px system-ui, sans-serif';
        g.fillText(`BEST SCORE  ${state.best}`, FIELD.width / 2, 462);
      }
      g.fillStyle = PALETTE.hudDim;
      g.font = '13px system-ui, sans-serif';
      g.fillText('P pause   •   R restart level   •   M mute', FIELD.width / 2, 500);
    } else {
      drawHud(g, state);
      if (state.screen === SCREEN_PAUSE) {
        panel(g, 'PAUSED', ['Take a breath. The nebula waits.', 'ENTER resume  •  R restart level  •  M mute'], PALETTE.hudDim);
      } else if (state.screen === SCREEN_CLEAR) {
        panel(g, 'LEVEL CLEAR', [
          `Bonus  +${state.clearBonus}  (clear ${CLEAR_BONUS} + time)`,
          `Score  ${state.score}`,
          `Next: ${LEVELS[state.levelIndex + 1].name} — press ENTER`,
        ], PALETTE.gateOpen);
      } else if (state.screen === SCREEN_VICTORY) {
        panel(g, 'THE WAY HOME', [
          'Every mote gathered. Every gate crossed.',
          `Final score  ${state.score}   •   Best  ${state.best}`,
          'Press R to fly again',
        ], PALETTE.gold);
      } else if (state.screen === SCREEN_OVER) {
        panel(g, 'THE LIGHT FADES', [
          'Three wisps spent. The nebula keeps its motes — this time.',
          `Score  ${state.score}   •   Best  ${state.best}`,
          'Press R to try again',
        ], PALETTE.danger);
      }
    }
  }

  return { render };
}
