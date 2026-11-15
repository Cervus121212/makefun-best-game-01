// Lumen Drift — keyboard and mouse state, translated into game intent.
// One job: know which keys are held, where the pointer is, and what was just pressed.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, downX: 0, downY: 0, dragging: false };

  function toGame(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 960,
      y: ((clientY - rect.top) / rect.height) * 600,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); pointer.down = false; pointer.dragging = false; });

  canvas.addEventListener('pointerdown', (event) => {
    const p = toGame(event.clientX, event.clientY);
    pointer.x = p.x; pointer.y = p.y;
    pointer.downX = p.x; pointer.downY = p.y;
    pointer.down = true; pointer.dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    const p = toGame(event.clientX, event.clientY);
    pointer.x = p.x; pointer.y = p.y;
  });
  canvas.addEventListener('pointerup', (event) => {
    const p = toGame(event.clientX, event.clientY);
    pointer.x = p.x; pointer.y = p.y;
    pointer.down = false; pointer.dragging = false;
  });

  return {
    pointer,
    thrustX() {
      let x = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return x;
    },
    thrustY() {
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return y;
    },
    wasPressed(code) { return pressed.has(code); },
    consumePressed() { pressed.clear(); },
  };
}
