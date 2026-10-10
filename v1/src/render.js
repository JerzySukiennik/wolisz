// Wolisz?! - canvas renderer: 1998 GeoCities look, Win95 bevels, rainbow stripes.

import { WORLD, PHYS, COLORS } from './config.js';

const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const RAINBOW = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];

export function createRenderer(canvas) {
  let game = null;
  const ctx = canvas.getContext('2d');
  const cam = { x: 2200, y: 500, s: 1, vw: 800, vh: 600, dpr: 1 };
  let starPattern = null;
  let checkPattern = null;
  let time = 0;

  function makePatterns() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    for (let i = 0; i < 70; i++) {
      x.fillStyle = Math.random() < 0.2 ? '#ffff88' : '#ffffff';
      x.globalAlpha = 0.4 + Math.random() * 0.6;
      const r = Math.random() < 0.15 ? 2 : 1;
      x.fillRect(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), r, r);
    }
    starPattern = ctx.createPattern(c, 'repeat');
    const k = document.createElement('canvas');
    k.width = k.height = 64;
    const y = k.getContext('2d');
    y.fillStyle = '#0a5a0a';
    y.fillRect(0, 0, 64, 64);
    y.fillStyle = '#12801a';
    y.fillRect(0, 0, 32, 32);
    y.fillRect(32, 32, 32, 32);
    checkPattern = ctx.createPattern(k, 'repeat');
  }

  function resize() {
    cam.dpr = Math.min(window.devicePixelRatio || 1, 2);
    cam.vw = window.innerWidth;
    cam.vh = window.innerHeight;
    canvas.width = Math.round(cam.vw * cam.dpr);
    canvas.height = Math.round(cam.vh * cam.dpr);
    canvas.style.width = cam.vw + 'px';
    canvas.style.height = cam.vh + 'px';
    cam.s = Math.max(Math.min(cam.vw / 1100, cam.vh / 640), cam.vw / 900);
    makePatterns();
  }

  function screenToWorld(px, py) {
    return { x: (px - cam.vw / 2) / cam.s + cam.x, y: (py - cam.vh / 2) / cam.s + cam.y };
  }

  function bevel(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, 3);
    ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = '#707070';
    ctx.fillRect(x, y + h - 3, w, 3);
    ctx.fillRect(x + w - 3, y, 3, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, cam.vh);
    g.addColorStop(0, '#02024a');
    g.addColorStop(0.55, '#3a0f7a');
    g.addColorStop(1, '#c4309c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.vw, cam.vh);

    ctx.save();
    ctx.translate(-cam.x * 0.12 * cam.s, -cam.y * 0.12 * cam.s);
    ctx.fillStyle = starPattern;
    ctx.fillRect(cam.x * 0.12 * cam.s, cam.y * 0.12 * cam.s, cam.vw, cam.vh);
    ctx.restore();

    const horizon = (WORLD.ground - cam.y) * cam.s + cam.vh / 2;
    const cx = cam.vw / 2 - (cam.x - 2200) * 0.08 * cam.s;
    const R = cam.s * 900;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 26 * cam.s;
    for (let i = 0; i < RAINBOW.length; i++) {
      ctx.strokeStyle = RAINBOW[i];
      ctx.beginPath();
      ctx.arc(cx, horizon + 220 * cam.s, R - i * 26 * cam.s, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawClouds() {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 9; i++) {
      const bx = 200 + i * 520;
      const by = 80 + (i % 3) * 90;
      const px = bx + (cam.x - 2200) * 0.35;
      ctx.beginPath();
      ctx.arc(px, by, 36, 0, 6.3);
      ctx.arc(px + 40, by + 8, 30, 0, 6.3);
      ctx.arc(px - 40, by + 10, 28, 0, 6.3);
      ctx.fill();
    }
  }

  function drawSolid(s) {
    if (s.kind === 'ground') {
      ctx.fillStyle = checkPattern;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      for (let i = 0; i < RAINBOW.length; i++) {
        ctx.fillStyle = RAINBOW[i];
        ctx.fillRect(s.x, s.y + i * 4, s.w, 4);
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(s.x, s.y + 28, s.w, 2);
    } else if (s.one) {
      const g = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
      g.addColorStop(0, '#000080');
      g.addColorStop(1, '#1084d0');
      ctx.fillStyle = g;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#c0c0c0';
      for (let i = 0; i < 3; i++) ctx.fillRect(s.x + s.w - 16 - i * 15, s.y + 3, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.w, 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else if (s.kind === 'crate') {
      ctx.fillStyle = '#b87333';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = '#6b3d12';
      ctx.lineWidth = 4;
      ctx.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.beginPath();
      ctx.moveTo(s.x + 3, s.y + 3);
      ctx.lineTo(s.x + s.w - 3, s.y + s.h - 3);
      ctx.moveTo(s.x + s.w - 3, s.y + 3);
      ctx.lineTo(s.x + 3, s.y + s.h - 3);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else {
      bevel(s.x, s.y, s.w, s.h, '#c0c0c0');
      if (s.kind === 'pillar') {
        ctx.fillStyle = '#000080';
        ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, 14);
      }
    }
  }

  function drawSigns() {
    for (const sg of game.world.signs) {
      const y = WORLD.ground;
      ctx.fillStyle = '#6b3d12';
      ctx.fillRect(sg.x - 5, y - 70, 10, 70);
      ctx.font = 'bold 22px "Comic Sans MS","Chalkboard SE",cursive';
      const w = Math.max(ctx.measureText(sg.text).width + 28, 140);
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(sg.x - w / 2, y - 130, w, 62);
      ctx.fillStyle = '#000';
      for (let i = 0; i < w; i += 20) ctx.fillRect(sg.x - w / 2 + i, y - 130, 10, 6);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(sg.x - w / 2, y - 130, w, 62);
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(sg.text, sg.x, y - 100);
      ctx.font = '14px "Comic Sans MS","Chalkboard SE",cursive';
      ctx.fillText(sg.sub, sg.x, y - 78);
    }
  }

  function drawObjects() {
    for (const o of game.objs.values()) {
      if (o.k === 'paint') {
        ctx.fillStyle = COLORS[o.c]?.hex || '#fff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.w || 40, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(o.x - (o.w || 40) * 0.3, o.y - (o.w || 40) * 0.3, (o.w || 40) * 0.25, 0, 6.3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    const next = game.nextPoopTarget();
    for (const [id, o] of game.objs) {
      if (o.k === 'ice') {
        ctx.fillStyle = 'rgba(170,240,255,0.85)';
        ctx.fillRect(o.x - 32, o.y - 5, 64, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(o.x - 24, o.y - 4, 20, 2);
      } else if (o.k === 'peel') {
        ctx.font = `30px ${EMOJI}`;
        ctx.textAlign = 'center';
        ctx.fillText('🍌', o.x, o.y + 2);
      } else if (o.k === 'poop') {
        ctx.font = `34px ${EMOJI}`;
        ctx.textAlign = 'center';
        ctx.fillText('💩', o.x, o.y + 2);
        if (o.o === game.me.uid && o === next) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = -time * 30;
          ctx.beginPath();
          ctx.arc(o.x, o.y - 14, 26, 0, 6.3);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (o.k === 'block') {
        drawSolid({ x: o.x - game.CRATE_W / 2, y: o.y - game.CRATE_H, w: game.CRATE_W, h: game.CRATE_H, one: false, kind: 'crate' });
      }
    }
  }

  function surfaceUnder(x, y) {
    let best = WORLD.ground;
    let found = false;
    for (const s of game.solids) {
      if (x > s.x && x < s.x + s.w && s.y >= y - 2 && (!found || s.y < best)) { best = s.y; found = true; }
    }
    return best;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }

  function drawAvatar(a) {
    const m = a.mods;
    const s = m.size;
    const w = PHYS.w * s;
    const h = PHYS.h * s;
    const col = COLORS[a.c]?.hex || '#fff';
    const moving = Math.abs(a.vx) > 30 && (a.g & 1);
    const phase = Math.sin(time * 16) * 0.5;

    if (m.hover || (a.g & 2)) {
      if (m.hover) {
        const sy = surfaceUnder(a.x, a.y);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(a.x, sy, w * 0.6, 5, 0, 0, 6.3);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(a.x, a.y);
    if (a.spin) ctx.rotate(a.spin);
    const sq = a.squash || 1;
    ctx.scale(1 / Math.sqrt(sq), sq);
    ctx.globalAlpha = m.ghost ? 0.5 : 1;
    ctx.lineJoin = 'round';
    const lw = Math.max(2, 3 * s);
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#000';

    if (m.hover) {
      ctx.fillStyle = '#777';
      ctx.fillRect(-w * 0.45, -h * 1.02, w * 0.9, 4 * s);
      ctx.fillStyle = '#ddd';
      ctx.fillRect(-w * 0.45 + Math.sin(time * 40) * w * 0.3, -h * 1.02 - 2, w * 0.3, 3);
    }

    if (a.ids.includes('wings')) {
      const flap = (a.g & 1) ? 0.1 : Math.sin(time * 18) * 0.5;
      ctx.fillStyle = '#ffffff';
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * w * 0.5, -h * 0.55);
        ctx.rotate(side * (0.5 + flap));
        ctx.beginPath();
        ctx.ellipse(side * w * 0.5, 0, w * 0.6, h * 0.14, 0, 0, 6.3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    if (m.jet) {
      ctx.fillStyle = '#9a9a9a';
      ctx.fillRect(-w * 0.78, -h * 0.82, w * 0.3, h * 0.42);
      ctx.strokeRect(-w * 0.78, -h * 0.82, w * 0.3, h * 0.42);
      if (a.g & 2) {
        ctx.fillStyle = Math.random() < 0.5 ? '#ffb000' : '#ff3000';
        ctx.beginPath();
        ctx.moveTo(-w * 0.78, -h * 0.4);
        ctx.lineTo(-w * 0.48, -h * 0.4);
        ctx.lineTo(-w * 0.63, -h * 0.4 + h * (0.25 + Math.random() * 0.2));
        ctx.fill();
      }
    }

    ctx.fillStyle = shade(col, -60);
    const legH = h * 0.22;
    const lo = moving ? phase * w * 0.45 : 0;
    ctx.fillRect(-w * 0.42 + lo, -legH, w * 0.3, legH);
    ctx.fillRect(w * 0.12 - lo, -legH, w * 0.3, legH);
    ctx.strokeRect(-w * 0.42 + lo, -legH, w * 0.3, legH);
    ctx.strokeRect(w * 0.12 - lo, -legH, w * 0.3, legH);

    const bh = h * 0.8;
    const r = m.bounce ? w * 0.5 : w * 0.28;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, bh, r);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + lw, -h + lw, w * 0.35, bh * 0.4, r * 0.6);
    ctx.fill();

    const ey = -h * 0.72;
    const ex = a.f * w * 0.1;
    ctx.fillStyle = '#fff';
    for (const side of [-1, 1]) {
      ctx.fillRect(ex + side * w * 0.2 - w * 0.12, ey - w * 0.12, w * 0.24, w * 0.3);
      ctx.strokeRect(ex + side * w * 0.2 - w * 0.12, ey - w * 0.12, w * 0.24, w * 0.3);
    }
    ctx.fillStyle = '#000';
    for (const side of [-1, 1]) ctx.fillRect(ex + side * w * 0.2 - w * 0.04 + a.f * w * 0.05, ey, w * 0.1, w * 0.14);
    ctx.fillRect(ex - w * 0.12, -h * 0.5, w * 0.24, Math.max(2, w * 0.05));

    if (a.g & 8) {
      ctx.fillStyle = 'rgba(111,227,59,0.8)';
      ctx.beginPath();
      ctx.arc(-w * 0.2, -h * 0.55, w * 0.2, 0, 6.3);
      ctx.arc(w * 0.22, -h * 0.85, w * 0.16, 0, 6.3);
      ctx.fill();
    }
    ctx.restore();

    ctx.font = `bold ${Math.max(15, 15 * Math.min(s, 1.3))}px "Comic Sans MS","Chalkboard SE",cursive`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    const ny = a.y - h * (a.squash || 1) - 12;
    ctx.strokeText(a.name || '', a.x, ny);
    ctx.fillText(a.name || '', a.x, ny);
  }

  function drawProjectiles() {
    for (const p of game.projs) {
      const col = COLORS[p.c]?.hex || '#fff';
      if (p.pk === 'goo') {
        ctx.fillStyle = '#6fe33b';
        ctx.strokeStyle = '#1c6b00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, 6.3);
        ctx.fill();
        ctx.stroke();
      } else if (p.pk === 'bomb') {
        ctx.font = `34px ${EMOJI}`;
        ctx.textAlign = 'center';
        ctx.fillText('💣', p.x, p.y + 12);
        if (Math.floor(p.age * 8) % 2 === 0) {
          ctx.fillStyle = '#ff2a2a';
          ctx.beginPath();
          ctx.arc(p.x + 10, p.y - 12, 5, 0, 6.3);
          ctx.fill();
        }
      } else if (p.pk === 'fw') {
        ctx.fillStyle = col;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.fillRect(p.x - 4, p.y - 12, 8, 24);
        ctx.strokeRect(p.x - 4, p.y - 12, 8, 24);
      }
    }
  }

  function drawFx() {
    for (const f of game.fx) {
      const a = Math.max(0, f.life / f.max);
      if (f.kind === 'dot') {
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = f.col;
        ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'ring') {
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = f.col;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 - a), 0, 6.3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.kind === 'text') {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.font = 'bold 22px "Comic Sans MS","Chalkboard SE",cursive';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.col;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
    }
  }

  function draw(g, dt) {
    game = g;
    time += dt;
    const me = game.me;
    const tx = me.x;
    const ty = me.y - 130;
    cam.x += (tx - cam.x) * Math.min(1, 7 * dt);
    cam.y += (ty - cam.y) * Math.min(1, 7 * dt);
    const halfW = cam.vw / 2 / cam.s;
    const halfH = cam.vh / 2 / cam.s;
    cam.x = Math.max(halfW, Math.min(WORLD.w - halfW, cam.x));
    cam.y = Math.min(cam.y, WORLD.ground + 120 - halfH + 200);
    cam.y = Math.max(cam.y, WORLD.top + halfH);

    let sx = 0;
    let sy = 0;
    for (const f of game.fx) {
      if (f.kind === 'shake') {
        const k = f.life / f.max;
        sx = (Math.random() - 0.5) * 14 * k;
        sy = (Math.random() - 0.5) * 14 * k;
      }
    }

    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    drawBackground();
    ctx.save();
    ctx.translate(cam.vw / 2 + sx, cam.vh / 2 + sy);
    ctx.scale(cam.s, cam.s);
    ctx.translate(-cam.x, -cam.y);
    drawClouds();
    drawSigns();
    for (const s of game.world.solids) drawSolid(s);
    drawObjects();

    for (const r of game.remotes.values()) {
      if (!r.seen) continue;
      drawAvatar({
        x: r.x, y: r.y, f: r.f, g: r.g, vx: r.vx, vy: r.vy, c: r.c, name: r.n,
        mods: r.mods, ids: r.ids || [], squash: 1 + Math.max(-0.2, Math.min(0.25, -r.vy / 3000)),
        spin: (r.g & 4) ? time * 14 : 0,
      });
    }
    if (me.name) {
      const flags = (me.ground ? 1 : 0) | (me.thrust ? 2 : 0) | (me.goo > 0 ? 8 : 0);
      drawAvatar({
        x: me.x, y: me.y, f: me.face, g: flags, vx: me.vx, vy: me.vy, c: me.c, name: me.name,
        mods: me.mods, ids: me.ids, squash: me.squash, spin: me.spin,
      });
    }
    drawProjectiles();
    drawFx();
    ctx.restore();
  }

  window.addEventListener('resize', resize);
  resize();

  return { draw, resize, screenToWorld, cam };
}
