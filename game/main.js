/* Gobble Dash boot: input (keyboard + mouse), the animation loop, screenshot scenes. */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var game = new window.GobbleGame(canvas);
  var Audio = window.GobbleAudio;
  var World = window.GobbleWorld;

  /* Screenshot scenes: ?scene=title|play|kitchen|end sets a fixed, lively state. */
  function applyScene() {
    var params = new URLSearchParams(window.location.search);
    var scene = params.get('scene');
    if (!scene) return;
    var rng = World.makeRng(20261127);
    if (scene === 'play') {
      game.start();
      game.distance = 120;
      game.score = 340;
      game.turkey.x = 330;
      game.obstacles = [
        { kind: 'fence', x: 700, w: 70, h: 64 },
        { kind: 'corn', x: 820, golden: false },
        { kind: 'corn', x: 866, golden: false },
        { kind: 'haystack', x: 980, w: 130, h: 90 },
        { kind: 'bale', x: 1180, r: 52 }
      ];
      game.pressure = 55;
      game.farmer.x = 120;
      game.time = 6;
    } else if (scene === 'kitchen') {
      game.start();
      game.distance = 720;
      game.stageId = 2;
      game.showBanner('THE KITCHEN', 'Ovens are HOT. Dodge the carving knives!');
      game.score = 1480;
      game.lives = 2;
      game.turkey.x = 420;
      game.turkey.y = 480;
      game.turkey.vy = -260;
      game.turkey.onGround = false;
      game.obstacles = [
        { kind: 'oven', x: 640, w: 110, h: 120 },
        { kind: 'knife', x: 900, w: 30, h: 40, vy: 900, y: 300, falling: true },
        { kind: 'knife', x: 1080, w: 30, h: 40, vy: 0, y: 590, falling: false, stuck: true },
        { kind: 'corn', x: 780, golden: true },
        { kind: 'corn', x: 826, golden: false }
      ];
      game.pressure = 82;
      game.farmer.x = 150;
      game.time = 11;
    } else if (scene === 'end') {
      game.start();
      game.distance = 1000;
      game.score = 2140;
      game.state = 'escaped';
      game.banner = null;
      game.best = 2140;
      game.time = 15;
    } else if (scene === 'title') {
      game.state = 'title';
      game.time = 4;
    }
    game.scene = scene;
  }

  function buttonAt(x, y) {
    // Canvas coordinates (the canvas is 1280x720 internally).
    if (game.state === 'title' && x >= 490 && x <= 790 && y >= 440 && y <= 504) return 'start';
    if ((game.state === 'caught' || game.state === 'escaped') && x >= 490 && x <= 790 && y >= 410 && y <= 474) return 'restart';
    return null;
  }

  function canvasPoint(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  window.addEventListener('keydown', function (evt) {
    if (evt.code === 'Space' || evt.code === 'ArrowUp' || evt.code === 'ArrowDown') evt.preventDefault();
    Audio.unlock();
    game.pressed[evt.code] = true;
    if (evt.repeat) return;
    if (evt.code === 'Space' || evt.code === 'ArrowUp' || evt.code === 'KeyW') {
      if (game.state === 'title') game.start();
      else if (game.state === 'caught' || game.state === 'escaped') game.start();
      else game.jump();
    }
    if (evt.code === 'ShiftLeft' || evt.code === 'ShiftRight') game.dash();
    if (evt.code === 'KeyM') {
      var muted = Audio.toggleMute();
      game.showBanner(muted ? 'SOUND OFF' : 'SOUND ON', 'Press M to toggle sound');
    }
    if (evt.code === 'KeyR' && (game.state === 'caught' || game.state === 'escaped')) game.start();
  });

  window.addEventListener('keyup', function (evt) {
    game.pressed[evt.code] = false;
  });

  canvas.addEventListener('mousedown', function (evt) {
    Audio.unlock();
    var p = canvasPoint(evt);
    var btn = buttonAt(p.x, p.y);
    if (btn === 'start' || btn === 'restart') { game.start(); return; }
    if (game.state === 'playing') game.jump();
  });

  canvas.addEventListener('touchstart', function (evt) {
    evt.preventDefault();
    Audio.unlock();
    if (game.state === 'title') { game.start(); return; }
    if (game.state === 'caught' || game.state === 'escaped') { game.start(); return; }
    game.jump();
  }, { passive: false });

  applyScene();

  // Exposed for automated play-testing only.
  window.GobbleGameInstance = game;

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!game.scene) game.update(dt);
    else if (game.scene === 'play' || game.scene === 'kitchen') game.update(dt * 0.25);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
