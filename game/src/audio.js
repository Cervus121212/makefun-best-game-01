// Lumen Drift — procedural sound: every effect is a small WebAudio synth,
// no audio files. One job: beeps, chimes and booms, with a mute switch.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (muted) return;
    const audio = ensure();
    if (audio === null) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    if (slideTo !== undefined) oscillator.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function noise(duration, volume) {
    if (muted) return;
    const audio = ensure();
    if (audio === null) return;
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    source.connect(gain).connect(audio.destination);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    launch() { tone(280, 0.25, 'sine', 0.18, 620); },
    collect() { tone(880, 0.12, 'triangle', 0.16); tone(1318, 0.18, 'triangle', 0.14); },
    crash() { noise(0.4, 0.3); tone(160, 0.4, 'sawtooth', 0.16, 40); },
    gateOpen() { tone(523, 0.12, 'triangle', 0.15); tone(659, 0.12, 'triangle', 0.15); tone(784, 0.22, 'triangle', 0.15); },
    clear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 110)); },
    victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 130)); },
    click() { tone(660, 0.06, 'square', 0.08); },
  };
}
