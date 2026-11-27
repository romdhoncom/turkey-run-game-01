/* Gobble Dash sound bank: every sound is synthesized with WebAudio, no files. */
(function () {
  'use strict';

  var ctx = null;
  var muted = false;
  var musicTimer = null;
  var musicStep = 0;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  /* Sounds only play on a running context: before any user gesture the
     context stays suspended, so scheduling tones then would only spam
     autoplay warnings into the console. */
  function ready() {
    return !muted && ctx !== null && ctx.state === 'running';
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ready()) return;
    var c = ctx;
    try {
      var t0 = c.currentTime + (delay || 0);
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) { /* sound is decoration, never fatal */ }
  }

  function noiseBurst(dur, vol, delay) {
    if (!ready()) return;
    var c = ctx;
    try {
      var t0 = c.currentTime + (delay || 0);
      var len = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = c.createBufferSource();
      src.buffer = buf;
      var g = c.createGain();
      g.gain.value = vol || 0.12;
      src.connect(g);
      g.connect(c.destination);
      src.start(t0);
    } catch (e) { /* ignore */ }
  }

  /* A turkey gobble: two quick descending honks. */
  function gobble() {
    tone(520, 0.09, 'sawtooth', 0.10, 300);
    tone(470, 0.09, 'sawtooth', 0.10, 280, 0.10);
    tone(620, 0.07, 'square', 0.06, 380, 0.20);
  }

  /* Farmer's angry shout: low buzzing slide down. */
  function farmerShout() {
    tone(180, 0.35, 'sawtooth', 0.16, 70);
    tone(120, 0.25, 'square', 0.08, 60, 0.05);
  }

  /* A cheerful little farm tune, plucked notes on a loop. */
  var MELODY = [392, 523, 659, 523, 587, 659, 784, 659, 587, 523, 440, 523];
  function musicTick() {
    if (!ready()) return;
    var note = MELODY[musicStep % MELODY.length];
    musicStep++;
    tone(note, 0.22, 'triangle', 0.05);
    if (musicStep % 4 === 1) tone(note / 2, 0.30, 'sine', 0.05);
  }

  window.GobbleAudio = {
    unlock: function () {
      // Automated runs (screenshots) have no gesture and cannot play audio:
      // skip creating the context there so the console stays clean.
      if (window.navigator && window.navigator.webdriver) return;
      var c = ensureCtx();
      if (c && c.state === 'suspended') c.resume().catch(function () {});
      if (!musicTimer) musicTimer = setInterval(musicTick, 260);
    },
    toggleMute: function () {
      muted = !muted;
      return muted;
    },
    isMuted: function () { return muted; },
    jump: function () { tone(300, 0.16, 'sine', 0.14, 620); },
    land: function () { noiseBurst(0.08, 0.08); },
    coin: function () { tone(880, 0.10, 'sine', 0.14); tone(1318, 0.14, 'sine', 0.12, 0, 0.07); },
    golden: function () { tone(880, 0.10, 'sine', 0.14); tone(1108, 0.10, 'sine', 0.14, 0, 0.08); tone(1318, 0.18, 'sine', 0.14, 0, 0.16); },
    stumble: function () { noiseBurst(0.18, 0.16); tone(160, 0.25, 'sawtooth', 0.12, 70); },
    hide: function () { noiseBurst(0.12, 0.06); tone(700, 0.08, 'sine', 0.06, 900); },
    spotted: function () { farmerShout(); },
    caught: function () { farmerShout(); tone(98, 0.5, 'sawtooth', 0.14, 50, 0.15); },
    escaped: function () {
      var seq = [523, 659, 784, 1046, 784, 1046];
      for (var i = 0; i < seq.length; i++) tone(seq[i], 0.18, 'triangle', 0.14, 0, i * 0.13);
      gobble();
    },
    gobble: gobble,
    stage: function () { tone(523, 0.12, 'triangle', 0.12); tone(784, 0.20, 'triangle', 0.12, 0, 0.11); }
  };
})();
