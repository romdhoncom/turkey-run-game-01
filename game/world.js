/* Gobble Dash world: the three stages, obstacle spawning and the escape route. */
(function () {
  'use strict';

  var GOAL_DISTANCE = 1000; // metres to the woods and freedom

  var STAGES = [
    { id: 0, name: 'THE FARMYARD', from: 0, to: 300, speed: 260,
      tip: 'Jump the fences, grab the corn!' },
    { id: 1, name: 'THE BARN', from: 300, to: 650, speed: 310,
      tip: 'Hay bales are tall — jump high! Knives fall here.' },
    { id: 2, name: 'THE KITCHEN', from: 650, to: 1000, speed: 360,
      tip: 'Ovens are HOT. Dodge the carving knives!' }
  ];

  function stageAt(distance) {
    for (var i = STAGES.length - 1; i >= 0; i--) {
      if (distance >= STAGES[i].from) return STAGES[i];
    }
    return STAGES[0];
  }

  /* Seeded random so screenshot scenes are stable. */
  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* One obstacle or pickup, in world coordinates (x = metres * 40 ahead). */
  function spawnFor(distance, rng) {
    var stage = stageAt(distance);
    var roll = rng();
    var x = 1500 + rng() * 300; // spawn off the right edge
    if (stage.id === 2) {
      if (roll < 0.30) return { kind: 'oven', x: x, w: 110, h: 120 };
      if (roll < 0.55) return { kind: 'knife', x: x + rng() * 200, w: 30, h: 40, vy: 0, y: -40, falling: true };
      if (roll < 0.70) return { kind: 'fence', x: x, w: 70, h: 64 };
      if (roll < 0.82) return { kind: 'corn', x: x, golden: rng() < 0.2 };
      if (roll < 0.92) return { kind: 'haystack', x: x, w: 130, h: 90 };
      return { kind: 'bale', x: x, r: 52 };
    }
    if (stage.id === 1) {
      if (roll < 0.30) return { kind: 'bale', x: x, r: 52 };
      if (roll < 0.50) return { kind: 'fence', x: x, w: 70, h: 64 };
      if (roll < 0.62) return { kind: 'knife', x: x + rng() * 200, w: 30, h: 40, vy: 0, y: -40, falling: true };
      if (roll < 0.78) return { kind: 'corn', x: x, golden: rng() < 0.2 };
      if (roll < 0.90) return { kind: 'haystack', x: x, w: 130, h: 90 };
      return { kind: 'fence', x: x, w: 70, h: 64 };
    }
    if (roll < 0.34) return { kind: 'fence', x: x, w: 70, h: 64 };
    if (roll < 0.50) return { kind: 'bale', x: x, r: 44 };
    if (roll < 0.72) return { kind: 'corn', x: x, golden: rng() < 0.15 };
    if (roll < 0.86) return { kind: 'haystack', x: x, w: 130, h: 90 };
    return { kind: 'corn', x: x + 90, golden: false };
  }

  /* A corn arc to reward a good jump. */
  function cornArc(x, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({ kind: 'corn', x: x + i * 46, y: 470 - Math.sin((i / (n - 1)) * Math.PI) * 90, golden: false, arc: true });
    }
    return out;
  }

  window.GobbleWorld = {
    GOAL_DISTANCE: GOAL_DISTANCE,
    STAGES: STAGES,
    stageAt: stageAt,
    makeRng: makeRng,
    spawnFor: spawnFor,
    cornArc: cornArc
  };
})();
