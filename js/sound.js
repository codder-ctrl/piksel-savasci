// Tiny chiptune effects with WebAudio. Browsers only allow audio after a user gesture, so
// main.js calls unlockAudio() from the first tap.

let ac = null;
let noiseBuf = null;
let enabled = true;
let lastCoin = 0;

export function setSoundEnabled(on) {
  enabled = on;
}

export function unlockAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
}

const ready = () => enabled && ac && ac.state === 'running';

function tone(freq, dur, { type = 'square', vol = 0.04, slide = 0, delay = 0 } = {}) {
  if (!ready()) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.05) {
  if (!ready()) return;
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = noiseBuf;
  gain.gain.setValueAtTime(vol, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  src.connect(gain).connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + dur);
}

export const sfx = {
  hit: () => tone(170 + Math.random() * 60, 0.06, { slide: -90, vol: 0.03 }),
  crit: () => { tone(520, 0.05, { vol: 0.035 }); tone(820, 0.09, { delay: 0.04, slide: -250, vol: 0.035 }); },
  kill: () => { noise(0.12, 0.04); tone(130, 0.12, { slide: -60, vol: 0.03 }); },
  coin: () => {
    const now = performance.now();
    if (now - lastCoin < 70) return;
    lastCoin = now;
    tone(1320, 0.04, { vol: 0.02 });
    tone(1760, 0.07, { delay: 0.04, vol: 0.02 });
  },
  buy: () => { tone(440, 0.05, { vol: 0.03 }); tone(660, 0.08, { delay: 0.05, vol: 0.03 }); },
  boss: () => [220, 185, 147].forEach((f, i) => tone(f, 0.16, { delay: i * 0.13, type: 'sawtooth', vol: 0.025 })),
  fail: () => tone(300, 0.45, { slide: -220, type: 'triangle', vol: 0.06 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, { delay: i * 0.07, vol: 0.03 })),
};
