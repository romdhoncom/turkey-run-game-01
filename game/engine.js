/* Gobble Dash engine: game states, physics, the chasing farmer, scoring. */
(function () {
  'use strict';

  var Art = window.GobbleArt;
  var Audio = window.GobbleAudio;
  var World = window.GobbleWorld;

  var GRAVITY = 2100;
  var JUMP_V = -820;
  var TURKEY_MIN_X = 190;
  var TURKEY_MAX_X = 760;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'title'; // title | playing | caught | escaped
    this.time = 0;
    this.distance = 0;
    this.score = 0;
    this.lives = 3;
    this.best = 0;
    try { this.best = parseInt(window.localStorage.getItem('gobbleDashBest') || '0', 10) || 0; } catch (e) { this.best = 0; }
    this.resetRun();
    this.banner = null;
    this.bannerT = 0;
    this.shake = 0;
    this.hideT = 0;
    this.searchT = 0;
    this.invulnT = 0;
    this.pressed = {};
    this.scene = null;
  }

  Game.prototype.resetRun = function () {
    this.distance = 0;
    this.score = 0;
    this.lives = 3;
    this.pressure = 25;
    this.speed = 260;
    this.turkey = { x: 330, y: Art.GROUND_Y - 34, vy: 0, onGround: true, ducking: false, hiding: false, pose: 0 };
    this.farmer = { x: 60, pose: 0 };
    this.obstacles = [];
    this.spawnIn = 1.2;
    this.rng = World.makeRng((Date.now() % 100000) + 7);
    this.hideT = 0;
    this.searchT = 0;
    this.invulnT = 0;
    this.banner = null;
    this.stageId = 0;
  };

  Game.prototype.start = function () {
    this.resetRun();
    this.state = 'playing';
    this.showBanner('THE FARMYARD', 'Jump the fences, grab the corn!');
    Audio.unlock();
    Audio.gobble();
  };

  Game.prototype.showBanner = function (title, sub) {
    this.banner = { title: title, sub: sub };
    this.bannerT = 2.4;
  };

  Game.prototype.jump = function () {
    if (this.state !== 'playing') return;
    if (this.turkey.onGround && !this.turkey.hiding) {
      this.turkey.vy = JUMP_V;
      this.turkey.onGround = false;
      Audio.jump();
    }
  };

  Game.prototype.dash = function () {
    if (this.state !== 'playing') return;
    this.speed = Math.min(this.speed + 160, 620);
    this.pressure = Math.max(0, this.pressure - 6);
  };

  Game.prototype.stumble = function (reason) {
    if (this.invulnT > 0 || this.state !== 'playing') return;
    this.lives--;
    this.invulnT = 1.6;
    this.shake = 14;
    this.pressure = Math.min(100, this.pressure + 34);
    Audio.stumble();
    if (this.lives <= 0) {
      this.state = 'caught';
      Audio.caught();
      this.saveBest();
    }
  };

  Game.prototype.saveBest = function () {
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem('gobbleDashBest', String(this.best)); } catch (e) { /* ignore */ }
    }
  };

  Game.prototype.update = function (dt) {
    this.time += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.state !== 'playing') return;

    var stage = World.stageAt(this.distance);
    if (stage.id !== this.stageId) {
      this.stageId = stage.id;
      this.showBanner(stage.name, stage.tip);
      Audio.stage();
    }
    var baseSpeed = stage.speed + this.distance * 0.06;
    this.speed += (baseSpeed - this.speed) * dt * 0.5;
    var move = this.speed * dt;
    this.distance += move / 40;
    this.score += move / 40;

    // Horizontal movement: Left/Right (or A/D) within the run zone.
    var tx = 0;
    if (this.pressed.ArrowLeft || this.pressed.KeyA) tx -= 1;
    if (this.pressed.ArrowRight || this.pressed.KeyD) tx += 1;
    this.turkey.x = clamp(this.turkey.x + tx * 340 * dt, TURKEY_MIN_X, TURKEY_MAX_X);
    this.turkey.ducking = !!(this.pressed.ArrowDown || this.pressed.KeyS);

    // Gravity and landing.
    if (!this.turkey.onGround) {
      this.turkey.vy += GRAVITY * dt;
      this.turkey.y += this.turkey.vy * dt;
      if (this.turkey.y >= Art.GROUND_Y - 34) {
        this.turkey.y = Art.GROUND_Y - 34;
        this.turkey.vy = 0;
        this.turkey.onGround = true;
        Audio.land();
      }
    }
    this.turkey.pose += dt * (this.turkey.onGround ? this.speed / 130 : 1.2);

    // Spawning.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      var gap = clamp(1.15 - this.distance / 1400, 0.55, 1.15);
      this.spawnIn = gap + this.rng() * 0.5;
      var ob = World.spawnFor(this.distance, this.rng);
      this.obstacles.push(ob);
      if (ob.kind === 'fence' && this.rng() < 0.5) {
        var arc = World.cornArc(ob.x + 60, 4);
        for (var ai = 0; ai < arc.length; ai++) this.obstacles.push(arc[ai]);
      }
    }

    // Move obstacles, knives fall.
    var i, ob2;
    for (i = this.obstacles.length - 1; i >= 0; i--) {
      ob2 = this.obstacles[i];
      ob2.x -= move;
      if (ob2.kind === 'knife' && ob2.falling) {
        ob2.vy = (ob2.vy || 0) + 2600 * dt;
        ob2.y += ob2.vy * dt;
        if (ob2.y > Art.GROUND_Y - 10) { ob2.y = Art.GROUND_Y - 10; ob2.falling = false; ob2.stuck = true; }
      }
      if (ob2.x < -220) this.obstacles.splice(i, 1);
    }

    // Hiding in a haystack.
    var nearHay = null;
    for (i = 0; i < this.obstacles.length; i++) {
      var h = this.obstacles[i];
      if (h.kind === 'haystack' && Math.abs(h.x + h.w / 2 - this.turkey.x) < 90 && this.turkey.onGround) { nearHay = h; break; }
    }
    if (nearHay && this.turkey.ducking && this.hideT <= 0 && this.searchT <= 0) {
      this.turkey.hiding = true;
      this.hideT = 2.4;
      Audio.hide();
    }
    if (this.turkey.hiding) {
      this.hideT -= dt;
      if (this.hideT <= 0) {
        this.turkey.hiding = false;
        this.searchT = 1.6; // farmer stops and searches — suspicious!
        this.pressure = Math.min(100, this.pressure + 18);
      }
    }
    if (this.searchT > 0) this.searchT -= dt;

    // Collisions (skip while hiding or invulnerable).
    if (!this.turkey.hiding && this.invulnT <= 0) {
      for (i = this.obstacles.length - 1; i >= 0; i--) {
        ob2 = this.obstacles[i];
        var hit = false;
        if (ob2.kind === 'fence' || ob2.kind === 'oven') {
          var top = Art.GROUND_Y - ob2.h;
          if (this.turkey.x + 22 > ob2.x && this.turkey.x - 22 < ob2.x + ob2.w && this.turkey.y + 30 > top) hit = true;
        } else if (ob2.kind === 'bale') {
          var dx = this.turkey.x - ob2.x;
          var dy = this.turkey.y - (Art.GROUND_Y - ob2.r);
          if (dx * dx + dy * dy < (ob2.r + 18) * (ob2.r + 18)) hit = true;
        } else if ((ob2.kind === 'knife' && !ob2.falling) || (ob2.kind === 'knife' && ob2.y > Art.GROUND_Y - 120)) {
          if (Math.abs(this.turkey.x - ob2.x) < 26 && this.turkey.y + 30 > ob2.y - 10) hit = true;
        } else if (ob2.kind === 'corn') {
          var cy = ob2.y || (Art.GROUND_Y - 40);
          if (Math.abs(this.turkey.x - ob2.x) < 34 && Math.abs(this.turkey.y - cy) < 44) {
            this.score += ob2.golden ? 50 : 10;
            if (ob2.golden) Audio.golden(); else Audio.coin();
            this.obstacles.splice(i, 1);
            continue;
          }
        }
        if (hit) {
          this.obstacles.splice(i, 1);
          this.stumble(ob2.kind);
          break;
        }
      }
    }

    // Farmer pressure: rises when slow or stumbling, falls when running clean.
    if (this.turkey.hiding) {
      this.pressure = Math.max(0, this.pressure - 40 * dt);
    } else if (this.searchT > 0) {
      this.pressure = Math.min(100, this.pressure + 12 * dt);
    } else {
      this.pressure = clamp(this.pressure + (this.speed < 300 ? 3 : -2.5) * dt, 0, 100);
    }
    // Farmer closes in as pressure rises; a dash or clean run pushes him back.
    var farmerTarget = 60 + (100 - this.pressure) * 1.1;
    this.farmer.x += (farmerTarget - this.farmer.x) * dt * 1.4;
    this.farmer.pose += dt * 7;
    if (this.pressure >= 100) {
      // The farmer grabs Gus!
      this.stumble('farmer');
      this.pressure = 40;
      Audio.spotted();
    }

    // Escape!
    if (this.distance >= World.GOAL_DISTANCE) {
      this.state = 'escaped';
      this.score += 500;
      Audio.escaped();
      this.saveBest();
    }
  };

  Game.prototype.draw = function () {
    var ctx = this.ctx;
    var stage = World.stageAt(this.distance);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    var offset = this.distance * 40;
    if (stage.id === 2) {
      Art.drawKitchenWall(ctx);
    } else {
      Art.drawSky(ctx, stage.id, this.time);
      Art.drawHills(ctx, stage.id, offset);
    }
    Art.drawGround(ctx, stage.id);

    // Obstacles and pickups.
    for (var i = 0; i < this.obstacles.length; i++) {
      var ob = this.obstacles[i];
      var sx = ob.x;
      if (ob.kind === 'fence') Art.drawFence(ctx, sx, Art.GROUND_Y, ob.w, ob.h);
      else if (ob.kind === 'bale') Art.drawHayBale(ctx, sx, Art.GROUND_Y - ob.r, ob.r);
      else if (ob.kind === 'haystack') Art.drawHaystack(ctx, sx, Art.GROUND_Y, ob.w, ob.h);
      else if (ob.kind === 'oven') Art.drawOven(ctx, sx, Art.GROUND_Y, ob.w, ob.h);
      else if (ob.kind === 'knife') {
        if (ob.falling) {
          // Telegraph: shadow where it will land.
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(sx, Art.GROUND_Y + 4, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        Art.drawKnife(ctx, sx, ob.y, ob.falling ? 0.3 : 0);
      } else if (ob.kind === 'corn') Art.drawCorn(ctx, sx, ob.y || (Art.GROUND_Y - 40), ob.golden, this.time);
    }

    // Haystack hides the turkey: draw the turkey behind the hay when hiding.
    // In title / end states the scene actors stay hidden — those screens draw
    // their own turkey and farmer as decoration.
    var inPlay = this.state === 'playing';
    var hiding = this.turkey.hiding;
    if (inPlay && !hiding) Art.drawFarmer(ctx, this.farmer.x, Art.GROUND_Y - 62, this.farmer.pose, this.pressure > 70);
    if (inPlay && hiding) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      Art.drawTurkey(ctx, this.turkey.x, this.turkey.y, this.turkey.pose, { hiding: true });
      ctx.restore();
    } else if (inPlay) {
      Art.drawTurkey(ctx, this.turkey.x, this.turkey.y, this.turkey.pose, {
        ducking: this.turkey.ducking, hurt: this.invulnT > 0
      });
    }
    if (inPlay && hiding) Art.drawFarmer(ctx, this.farmer.x + 260, Art.GROUND_Y - 62, this.farmer.pose, false);

    // Woods at the finish.
    if (this.distance > World.GOAL_DISTANCE - 120) {
      ctx.fillStyle = '#2a5a2a';
      ctx.fillRect(1150, 300, 130, 300);
      ctx.fillStyle = '#3a7a3a';
      ctx.beginPath(); ctx.moveTo(1150, 320); ctx.lineTo(1215, 180); ctx.lineTo(1280, 320); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    this.drawHud();
    if (this.state === 'title') this.drawTitle();
    else if (this.state === 'caught') this.drawEnd(false);
    else if (this.state === 'escaped') this.drawEnd(true);
    if (this.banner && this.bannerT > 0) this.drawBanner();
  };

  Game.prototype.drawHud = function () {
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(43,26,18,0.72)';
    ctx.fillRect(0, 0, 1280, 54);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE ' + Math.floor(this.score), 18, 36);
    ctx.fillText('DISTANCE ' + Math.floor(this.distance) + ' / ' + World.GOAL_DISTANCE + ' m', 260, 36);
    // Lives as hearts.
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.lives ? '#e84a5f' : 'rgba(255,255,255,0.25)';
      var hx = 700 + i * 36;
      ctx.beginPath();
      ctx.moveTo(hx, 40);
      ctx.bezierCurveTo(hx - 12, 26, hx - 22, 34, hx, 48);
      ctx.bezierCurveTo(hx + 22, 34, hx + 12, 26, hx, 40);
      ctx.fill();
    }
    // Farmer pressure bar.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(830, 18, 200, 18);
    ctx.fillStyle = this.pressure > 70 ? '#e84a2a' : '#f5a623';
    ctx.fillRect(830, 18, 200 * (this.pressure / 100), 18);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText('FARMER', 1040, 33);
    if (this.pressure > 70 && this.state === 'playing') {
      ctx.fillStyle = '#ff5a2a';
      ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("HE'S RIGHT BEHIND YOU!", 640, 92);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BEST ' + this.best, 1262, 36);
    ctx.textAlign = 'left';
    if (this.searchT > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
      ctx.fillText('Farmer Bram is searching… stay quiet!', 420, 92);
    }
  };

  Game.prototype.drawBanner = function () {
    var ctx = this.ctx;
    var a = Math.min(1, this.bannerT);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(43,26,18,0.8)';
    ctx.fillRect(340, 240, 600, 110);
    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth = 3;
    ctx.strokeRect(340, 240, 600, 110);
    ctx.fillStyle = '#ffd76e';
    ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.banner.title, 640, 292);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText(this.banner.sub, 640, 326);
    ctx.textAlign = 'left';
    ctx.restore();
  };

  Game.prototype.drawTitle = function () {
    var ctx = this.ctx;
    ctx.fillStyle = 'rgba(43,26,18,0.55)';
    ctx.fillRect(0, 54, 1280, 666);
    ctx.fillStyle = '#ffd76e';
    ctx.font = 'bold 84px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOBBLE DASH', 640, 220);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.fillText("Turkey's Great Escape", 640, 268);
    ctx.font = '21px "Trebuchet MS", sans-serif';
    ctx.fillText('Gus the turkey has 1000 metres to reach the woods before Thanksgiving dinner.', 640, 330);
    ctx.fillText('Jump the fences and ovens. Duck into haystacks to hide. Dodge the falling knives.', 640, 362);
    ctx.fillText('Grab corn for points — and whatever you do, do not let Farmer Bram catch you.', 640, 394);
    // Start button.
    ctx.fillStyle = '#e84a2a';
    ctx.fillRect(490, 440, 300, 64);
    ctx.strokeStyle = '#ffd76e';
    ctx.lineWidth = 4;
    ctx.strokeRect(490, 440, 300, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText('▶  START THE RUN', 640, 482);
    ctx.font = '17px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#f5e6c8';
    ctx.fillText('Space / ↑ / click to jump · ↓ to duck & hide · → to dash · M to mute', 640, 556);
    ctx.textAlign = 'left';
    Art.drawTurkey(ctx, 240, 566, this.time * 0.8, {});
    Art.drawFarmer(ctx, 1020, 538, this.time * 0.8, true);
  };

  Game.prototype.drawEnd = function (won) {
    var ctx = this.ctx;
    ctx.fillStyle = won ? 'rgba(20,60,20,0.72)' : 'rgba(60,10,10,0.72)';
    ctx.fillRect(0, 54, 1280, 666);
    ctx.textAlign = 'center';
    if (won) {
      ctx.fillStyle = '#ffd76e';
      ctx.font = 'bold 72px "Trebuchet MS", sans-serif';
      ctx.fillText('ESCAPED!', 640, 240);
      ctx.fillStyle = '#f5e6c8';
      ctx.font = '28px "Trebuchet MS", sans-serif';
      ctx.fillText('Gus made it to the woods — no Thanksgiving dinner for him this year.', 640, 300);
    } else {
      ctx.fillStyle = '#ff8a6a';
      ctx.font = 'bold 72px "Trebuchet MS", sans-serif';
      ctx.fillText('CAUGHT!', 640, 240);
      ctx.fillStyle = '#f5e6c8';
      ctx.font = '28px "Trebuchet MS", sans-serif';
      ctx.fillText('Farmer Bram has Gus by the drumstick. Thanksgiving dinner is served…', 640, 300);
    }
    ctx.font = 'bold 30px "Trebuchet MS", sans-serif';
    ctx.fillText('SCORE ' + Math.floor(this.score) + '   ·   DISTANCE ' + Math.floor(this.distance) + ' m   ·   BEST ' + this.best, 640, 360);
    ctx.fillStyle = '#e84a2a';
    ctx.fillRect(490, 410, 300, 64);
    ctx.strokeStyle = '#ffd76e';
    ctx.lineWidth = 4;
    ctx.strokeRect(490, 410, 300, 64);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Trebuchet MS", sans-serif';
    ctx.fillText('↻  RUN AGAIN  (R)', 640, 452);
    ctx.textAlign = 'left';
    if (won) Art.drawTurkey(ctx, 640, 560, this.time * 0.8, {});
    else Art.drawFarmer(ctx, 640, 560, this.time * 0.8, true);
  };

  window.GobbleGame = Game;
})();
