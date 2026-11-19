/* CAT / TRANSFORM CITY — procedural sound: purring, music box, paper clacks, bells, meows */
(function () {
  'use strict';
  const CTC = (window.CTC = window.CTC || {});

  const A = (CTC.audio = {
    ctx: null,
    ready: false,
    muted: false,
    purrTarget: 0,
    _last: {},
  });

  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    A.master = ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.9;
    A.master.connect(comp);

    // shared reverb-ish feedback delay for the music box / bells
    A.wet = ctx.createGain();
    A.wet.gain.value = 0.35;
    const d1 = ctx.createDelay(1.0);
    d1.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    A.wet.connect(d1);
    d1.connect(lp);
    lp.connect(fb);
    fb.connect(d1);
    lp.connect(A.master);

    // noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    A.noise = buf;

    // --- purr: low noise, amplitude modulated at ~25 Hz, slow breathing envelope
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const plp = ctx.createBiquadFilter();
    plp.type = 'lowpass';
    plp.frequency.value = 260;
    plp.Q.value = 2;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 25;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt);
    lfoAmt.connect(am.gain);
    const hum = ctx.createOscillator();
    hum.type = 'triangle';
    hum.frequency.value = 50;
    const humG = ctx.createGain();
    humG.gain.value = 0.25;
    hum.connect(humG);
    humG.connect(am);
    A.purrGain = ctx.createGain();
    A.purrGain.gain.value = 0;
    src.connect(plp);
    plp.connect(am);
    am.connect(A.purrGain);
    A.purrGain.connect(A.master);
    src.start();
    lfo.start();
    hum.start();
    A.purrLfo = lfo;

    // --- ambient pad
    A.padGain = ctx.createGain();
    A.padGain.gain.value = 0.0;
    const padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass';
    padLp.frequency.value = 900;
    A.padLp = padLp;
    A.padGain.connect(padLp);
    padLp.connect(A.master);
    padLp.connect(A.wet);
    A.pad = [0, 1, 2, 3].map((i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = midi(48 + [0, 4, 7, 11][i]);
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      o.connect(g);
      g.connect(A.padGain);
      o.start();
      return o;
    });
    A.padGain.gain.setTargetAtTime(0.05, ctx.currentTime, 2.0);
    A.ready = true;
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.1);
  };

  const CHORDS = {
    night: [45, 52, 57, 60],
    dawn: [41, 48, 52, 57],
    day: [48, 52, 55, 59],
    dusk: [44, 51, 55, 60],
  };
  A.setChord = function (name) {
    if (!A.ready || A._chord === name) return;
    A._chord = name;
    const c = CHORDS[name];
    A.pad.forEach((o, i) => o.frequency.setTargetAtTime(midi(c[i]), A.ctx.currentTime, 1.5));
  };

  A.update = function (dt, purr, breath) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    A.purrGain.gain.setTargetAtTime(purr * (0.55 + 0.45 * breath), t, 0.08);
    A.purrLfo.frequency.setTargetAtTime(23 + purr * 4, t, 0.3);
  };

  function limiter(key, ms) {
    const now = performance.now();
    if (A._last[key] && now - A._last[key] < ms) return false;
    A._last[key] = now;
    return true;
  }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  /* music box note: index in pentatonic scale */
  A.note = function (idx, vol = 0.12, base = 72) {
    if (!A.ready || !limiter('note' + (idx % 3), 45)) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.005;
    const n = PENTA[((idx % PENTA.length) + PENTA.length) % PENTA.length] + base;
    const f = midi(n);
    [1, 2.01, 4.2].forEach((h, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * h;
      const g = ctx.createGain();
      env(g, t, 0.004, vol / (i * 2.5 + 1), 1.4 / (i + 1));
      o.connect(g);
      g.connect(A.master);
      g.connect(A.wet);
      o.start(t);
      o.stop(t + 1.6);
    });
  };

  /* paper clack — a piece landing */
  A.clack = function (pitch = 1, vol = 0.18) {
    if (!A.ready || !limiter('clack', 28)) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.002;
    const s = ctx.createBufferSource();
    s.buffer = A.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 * pitch + Math.random() * 600;
    bp.Q.value = 1.4;
    const g = ctx.createGain();
    env(g, t, 0.002, vol, 0.06);
    s.connect(bp);
    bp.connect(g);
    g.connect(A.master);
    s.start(t, Math.random() * 1.5, 0.1);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    const g2 = ctx.createGain();
    env(g2, t, 0.002, vol * 0.8, 0.09);
    o.connect(g2);
    g2.connect(A.master);
    o.start(t);
    o.stop(t + 0.12);
  };

  A.pop = function () {
    if (!A.ready || !limiter('pop', 40)) return;
    const ctx = A.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(500 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
    const g = ctx.createGain();
    env(g, t, 0.003, 0.05, 0.07);
    o.connect(g);
    g.connect(A.master);
    o.start(t);
    o.stop(t + 0.1);
  };

  A.bell = function (vol = 0.3) {
    if (!A.ready) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.01;
    const f = 330;
    [
      [0.5, 1],
      [1, 0.8],
      [2.0, 0.5],
      [2.76, 0.4],
      [5.4, 0.2],
      [8.93, 0.1],
    ].forEach(([h, a]) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * h;
      const g = ctx.createGain();
      env(g, t, 0.005, vol * a, 3.5 / Math.sqrt(h));
      o.connect(g);
      g.connect(A.master);
      g.connect(A.wet);
      o.start(t);
      o.stop(t + 5);
    });
  };

  A.meow = function (pitch = 1, vol = 0.12) {
    if (!A.ready || !limiter('meow', 120)) return;
    const ctx = A.ctx;
    const t = ctx.currentTime + 0.01;
    const p = pitch * (0.85 + Math.random() * 0.4);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * p, t);
    o.frequency.linearRampToValueAtTime(820 * p, t + 0.16);
    o.frequency.linearRampToValueAtTime(430 * p, t + 0.48);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 5;
    f.frequency.setValueAtTime(800, t);
    f.frequency.linearRampToValueAtTime(1800, t + 0.15);
    f.frequency.linearRampToValueAtTime(900, t + 0.48);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    o.connect(f);
    f.connect(g);
    g.connect(A.master);
    o.start(t);
    o.stop(t + 0.6);
  };

  A.squeak = function () {
    if (!A.ready) return;
    const ctx = A.ctx;
    for (let i = 0; i < 3; i++) {
      const t = ctx.currentTime + i * 0.09;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(2600, t);
      o.frequency.exponentialRampToValueAtTime(3800, t + 0.05);
      const g = ctx.createGain();
      env(g, t, 0.003, 0.06, 0.05);
      o.connect(g);
      g.connect(A.master);
      o.start(t);
      o.stop(t + 0.08);
    }
  };

  A.toot = function () {
    if (!A.ready || !limiter('toot', 300)) return;
    const ctx = A.ctx;
    [0, 0.32].forEach((dt) => {
      const t = ctx.currentTime + dt;
      [392, 494, 587].forEach((f) => {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.02);
        g.gain.setValueAtTime(0.035, t + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(lp);
        lp.connect(g);
        g.connect(A.master);
        o.start(t);
        o.stop(t + 0.3);
      });
    });
  };

  A.sneeze = function () {
    if (!A.ready) return;
    const ctx = A.ctx;
    const t = ctx.currentTime;
    // "ah... ah..."
    [0, 0.35].forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300 + i * 60, t + dt);
      o.frequency.linearRampToValueAtTime(420 + i * 80, t + dt + 0.25);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 3;
      const g = ctx.createGain();
      env(g, t + dt, 0.05, 0.05, 0.22);
      o.connect(f);
      f.connect(g);
      g.connect(A.master);
      o.start(t + dt);
      o.stop(t + dt + 0.35);
    });
    // "CHOO"
    const s = ctx.createBufferSource();
    s.buffer = A.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(3500, t + 0.8);
    bp.frequency.exponentialRampToValueAtTime(900, t + 1.2);
    const g = ctx.createGain();
    env(g, t + 0.8, 0.01, 0.4, 0.35);
    s.connect(bp);
    bp.connect(g);
    g.connect(A.master);
    s.start(t + 0.8, 0, 0.6);
  };

  A.chime = function (up = true) {
    if (!A.ready) return;
    [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => A.note(up ? i * 2 : 10 - i * 2, 0.1, 76), i * 90));
  };

  /* occasional music-box tinkle for the city's ambience */
  A.tinkle = function (mood) {
    if (!A.ready) return;
    const base = mood === 'night' ? 69 : mood === 'dusk' ? 68 : 72;
    A.note(Math.floor(Math.random() * 9), 0.05, base);
  };
})();
