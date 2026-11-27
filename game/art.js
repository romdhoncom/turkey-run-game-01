/* Gobble Dash art: every sprite is drawn with canvas paths — no image files. */
(function () {
  'use strict';

  var W = 1280;
  var H = 720;
  var GROUND_Y = 600;

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSky(ctx, stage, t) {
    var sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    if (stage === 2) { sky.addColorStop(0, '#3a2a4a'); sky.addColorStop(1, '#8a5a3a'); }
    else if (stage === 1) { sky.addColorStop(0, '#e8a34c'); sky.addColorStop(1, '#f7cf7d'); }
    else { sky.addColorStop(0, '#7ec3ee'); sky.addColorStop(1, '#fde9b8'); }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);
    // Sun / moon.
    ctx.fillStyle = stage === 2 ? '#f5d76e' : '#ffdf6b';
    circle(ctx, 1080, 110, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (var i = 0; i < 4; i++) {
      var cx = ((i * 340 + t * 6) % (W + 260)) - 130;
      var cy = 70 + i * 38;
      ellipse(ctx, cx, cy, 70, 22, 0);
      ellipse(ctx, cx + 40, cy + 8, 50, 18, 0);
    }
  }

  function drawHills(ctx, stage, offset) {
    ctx.fillStyle = stage === 2 ? '#5a3a2a' : '#8fae5a';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (var x = 0; x <= W; x += 40) {
      var y = GROUND_Y - 60 - Math.sin((x + offset * 0.4) * 0.006) * 34;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    // Distant trees / barn silhouette.
    ctx.fillStyle = stage === 2 ? '#3a2418' : '#6a8a3f';
    for (var i = 0; i < 7; i++) {
      var tx = ((i * 210 - offset * 0.6) % (W + 160) + W + 160) % (W + 160) - 80;
      var ty = GROUND_Y - 58 - Math.sin((tx + offset * 0.4) * 0.006) * 30;
      ctx.fillRect(tx - 4, ty - 46, 8, 46);
      circle(ctx, tx, ty - 58, 26);
    }
  }

  function drawGround(ctx, stage) {
    var g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    if (stage === 2) { g.addColorStop(0, '#7a4a34'); g.addColorStop(1, '#4a2c1e'); }
    else if (stage === 1) { g.addColorStop(0, '#c9a35a'); g.addColorStop(1, '#8a6a34'); }
    else { g.addColorStop(0, '#a8c46a'); g.addColorStop(1, '#6f9a44'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (var x = 0; x < W; x += 90) ctx.fillRect(x, GROUND_Y + 46, 60, 3);
  }

  function drawKitchenWall(ctx) {
    // Warm tiled kitchen wall, floor to ceiling of the play area.
    ctx.fillStyle = '#b98a5a';
    ctx.fillRect(0, 0, W, GROUND_Y);
    ctx.fillStyle = '#a87a4e';
    for (var y = 0; y < 300; y += 50) ctx.fillRect(0, y, W, 3);
    for (var x = 0; x < W; x += 100) ctx.fillRect(x, 0, 3, 300);
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(0, 300, W, 12);
    // Hanging pots and a window.
    ctx.fillStyle = '#5a5a5a';
    circle(ctx, 180, 120, 34); circle(ctx, 300, 120, 28); circle(ctx, 420, 120, 30);
    ctx.fillStyle = '#cfe8f5';
    ctx.fillRect(880, 60, 220, 150);
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(985, 60, 10, 150); ctx.fillRect(880, 130, 220, 10);
  }

  /* Gus the turkey. pose: run phase 0..1, ducking, hiding, hurt. */
  function drawTurkey(ctx, x, y, pose, opts) {
    opts = opts || {};
    var bob = Math.sin(pose * Math.PI * 2) * 3;
    var duck = opts.ducking ? 10 : 0;
    ctx.save();
    ctx.translate(x, y + bob + duck);
    if (opts.hurt && Math.floor(pose * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    // Tail fan.
    ctx.fillStyle = '#8a5a2a';
    for (var i = -2; i <= 2; i++) {
      ctx.save();
      ctx.rotate(i * 0.35);
      ellipse(ctx, -26, -16, 7, 22, 0);
      ctx.restore();
    }
    ctx.fillStyle = '#c94f2a';
    for (var j = -1; j <= 1; j++) {
      ctx.save();
      ctx.rotate(j * 0.5);
      ellipse(ctx, -24, -20, 4, 14, 0);
      ctx.restore();
    }
    // Body.
    ctx.fillStyle = '#7a4a21';
    ellipse(ctx, 0, 0, 30, 24, 0);
    ctx.fillStyle = '#a8703a';
    ellipse(ctx, 2, -4, 22, 17, 0);
    // Wing.
    ctx.fillStyle = '#5a3416';
    ellipse(ctx, -4, -2, 16, 10, -0.4);
    // Legs (running).
    ctx.strokeStyle = '#e8a33a';
    ctx.lineWidth = 4;
    var legSwing = Math.sin(pose * Math.PI * 2) * 10;
    ctx.beginPath(); ctx.moveTo(-6, 20); ctx.lineTo(-6 + legSwing, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(8 - legSwing, 34); ctx.stroke();
    // Neck and head.
    ctx.fillStyle = '#c94f2a';
    ellipse(ctx, 24, -26, 7, 18, 0.25);
    ctx.fillStyle = '#e8e0d0';
    circle(ctx, 30, -44, 12);
    // Beak + wattle + eye.
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.moveTo(38, -46); ctx.lineTo(52, -42); ctx.lineTo(38, -38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d92b2b';
    ellipse(ctx, 36, -34, 4, 7, 0);
    ctx.fillStyle = '#222';
    circle(ctx, 33, -47, 2.5);
    ctx.restore();
    if (opts.hiding) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.fillText('SHHH…', x - 30, y - 70);
    }
  }

  /* Farmer Bram, chasing from behind. */
  function drawFarmer(ctx, x, y, pose, angry) {
    var bob = Math.abs(Math.sin(pose * Math.PI * 2)) * -6;
    ctx.save();
    ctx.translate(x, y + bob);
    // Legs.
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 7;
    var swing = Math.sin(pose * Math.PI * 2) * 14;
    ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(-8 + swing, 62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 30); ctx.lineTo(8 - swing, 62); ctx.stroke();
    // Body: overalls.
    ctx.fillStyle = '#3a5a8a';
    ctx.fillRect(-18, -6, 36, 40);
    ctx.fillStyle = '#d94f2a';
    ctx.fillRect(-18, -6, 36, 14);
    // Arms reaching forward.
    ctx.strokeStyle = '#e8b88a';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(34, -8 + Math.sin(pose * Math.PI * 2) * 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(30, 12); ctx.stroke();
    // Head + hat.
    ctx.fillStyle = '#e8b88a';
    circle(ctx, 0, -22, 14);
    ctx.fillStyle = '#f5d76e';
    ctx.fillRect(-16, -34, 32, 8);
    ctx.fillRect(-10, -48, 20, 16);
    // Angry eyes + moustache.
    ctx.fillStyle = '#222';
    if (angry) {
      ctx.fillRect(-10, -28, 8, 3);
      ctx.fillRect(2, -28, 8, 3);
    } else {
      circle(ctx, -6, -24, 2); circle(ctx, 6, -24, 2);
    }
    ctx.fillStyle = '#5a3416';
    ctx.fillRect(-8, -14, 16, 4);
    ctx.restore();
    if (angry) {
      ctx.fillStyle = '#d92b2b';
      ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
      ctx.fillText('COME BACK HERE!', x - 60, y - 62);
    }
  }

  function drawFence(ctx, x, y, w, h) {
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(x, y - h, 8, h);
    ctx.fillRect(x + w - 8, y - h, 8, h);
    ctx.fillRect(x, y - h + 8, w, 7);
    ctx.fillRect(x, y - h / 2, w, 7);
  }

  function drawHayBale(ctx, x, y, r) {
    ctx.fillStyle = '#d9a83a';
    circle(ctx, x, y, r);
    ctx.strokeStyle = '#a87a1e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r - 16, 0, Math.PI * 2); ctx.stroke();
  }

  function drawHaystack(ctx, x, y, w, h) {
    ctx.fillStyle = '#e8c25a';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - h - 30, x + w, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b8922e';
    ctx.lineWidth = 2;
    for (var i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (w * i) / 5, y - 6);
      ctx.quadraticCurveTo(x + (w * i) / 5, y - h * 0.6, x + w / 2, y - h - 18);
      ctx.stroke();
    }
  }

  function drawOven(ctx, x, y, w, h) {
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(x + 6, y - h + 6, w - 12, h - 12);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 16, y - h + 26, w - 32, h - 50);
    // Fire glow inside.
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y - h + 44);
    ctx.quadraticCurveTo(x + w / 2 + 16, y - 26, x + w / 2, y - 12);
    ctx.quadraticCurveTo(x + w / 2 - 16, y - 26, x + w / 2, y - h + 44);
    ctx.fill();
    ctx.fillStyle = '#ffd76e';
    circle(ctx, x + w / 2, y - h + 10, 5);
    ctx.fillStyle = '#ff5a2a';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText('HOT!', x + w / 2 - 16, y - h - 8);
  }

  function drawKnife(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.fillStyle = '#c8c8d8';
    ctx.beginPath();
    ctx.moveTo(0, -34); ctx.lineTo(10, -6); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3416';
    ctx.fillRect(-5, 6, 10, 16);
    ctx.restore();
  }

  function drawCorn(ctx, x, y, golden, t) {
    var bob = Math.sin(t * 4 + x) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(-0.5);
    ctx.fillStyle = golden ? '#ffd700' : '#f5c542';
    ellipse(ctx, 0, 0, 9, 16, 0);
    ctx.fillStyle = golden ? '#fff3a0' : '#ffe98a';
    for (var i = -1; i <= 1; i++) { ctx.fillRect(i * 5 - 1, -12, 2, 24); }
    ctx.fillStyle = '#5a8a2a';
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(-8, 24); ctx.lineTo(2, 20); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  window.GobbleArt = {
    W: W, H: H, GROUND_Y: GROUND_Y,
    drawSky: drawSky,
    drawHills: drawHills,
    drawGround: drawGround,
    drawKitchenWall: drawKitchenWall,
    drawTurkey: drawTurkey,
    drawFarmer: drawFarmer,
    drawFence: drawFence,
    drawHayBale: drawHayBale,
    drawHaystack: drawHaystack,
    drawOven: drawOven,
    drawKnife: drawKnife,
    drawCorn: drawCorn
  };
})();
