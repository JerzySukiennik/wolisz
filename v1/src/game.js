// Wolisz?! - game simulation: local avatar physics, powers, shared objects, events and projectiles.

import { WORLD, PHYS, COLORS } from './config.js';
import { ACTIONS, POWERS, computeMods, slotsFor } from './powers.js';
import { buildWorld, spawnX } from './world.js';
import { sfx } from './audio.js';

const CRATE_W = 80;
const CRATE_H = 40;

function approach(v, target, delta) {
  if (v < target) return Math.min(v + delta, target);
  return Math.max(v - delta, target);
}

export function createGame(net) {
  const world = buildWorld();
  const players = new Map();
  const remotes = new Map();
  const objs = new Map();
  const projs = [];
  const fx = [];
  const listeners = { players: () => {}, slots: () => {} };
  let solids = world.solids;
  let stateTimer = 0;
  let lastSent = '';
  let lastSentAt = 0;
  let iceX = -9999;
  const holdClock = [];

  const me = {
    uid: net.uid, name: '', c: 0, ids: [], mods: computeMods([]), slots: [],
    x: spawnX(), y: WORLD.ground - 200, vx: 0, vy: 0, face: 1,
    ground: false, wall: 0, coyote: 0, buf: 0, air: 0, holdT: 0, jumping: false,
    slip: 0, goo: 0, stink: 0, dropT: 0, thrust: false, climbing: false,
    squash: 1, tpIdx: 0, spin: 0, knock: 0,
  };

  function body() {
    const s = me.mods.size;
    return { hw: PHYS.w * s / 2, hh: PHYS.h * s };
  }

  function rebuildSolids() {
    const list = world.solids.slice();
    for (const o of objs.values()) {
      if (o.k === 'block') list.push({ x: o.x - CRATE_W / 2, y: o.y - CRATE_H, w: CRATE_W, h: CRATE_H, one: false, kind: 'crate' });
    }
    solids = list;
  }

  function puff(x, y, col, n = 8, spd = 140) {
    for (let i = 0; i < n; i++) {
      fx.push({ kind: 'dot', x, y, vx: (Math.random() - 0.5) * spd * 2, vy: (Math.random() - 0.9) * spd, life: 0.5 + Math.random() * 0.4, max: 0.9, col, size: 4 + Math.random() * 6, g: 260 });
    }
  }

  function sparks(x, y, col, n = 30, spd = 360) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.35 + Math.random() * 0.65);
      fx.push({ kind: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + Math.random() * 0.5, max: 1.2, col, size: 3 + Math.random() * 4, g: 380 });
    }
  }

  function ring(x, y, r, col) {
    fx.push({ kind: 'ring', x, y, r, life: 0.45, max: 0.45, col });
  }

  function say(x, y, text, col = '#ffff00') {
    fx.push({ kind: 'text', x, y, vy: -50, life: 1.4, max: 1.4, text, col });
  }

  function setIds(ids) {
    me.ids = ids;
    me.mods = computeMods(ids);
    me.slots = slotsFor(ids);
    listeners.slots(me.slots, ids);
  }

  function bodyRectOverlap(x, y, w, h) {
    const { hw, hh } = body();
    return me.x + hw > x && me.x - hw < x + w && me.y > y && me.y - hh < y + h;
  }

  function blast(x, y, R, power, lift) {
    const { hh } = body();
    const dx = me.x - x;
    const dy = me.y - hh / 2 - y;
    const d = Math.hypot(dx, dy);
    if (d >= R) return;
    const f = 1 - d / R;
    const nx = dx / (d || 1);
    const ny = dy / (d || 1);
    me.vx += nx * power * f;
    me.vy = Math.min(me.vy, 0) + ny * power * 0.8 * f - lift * f;
    me.ground = false;
    me.knock = 0.6;
  }

  function teleport(x, y, silent) {
    const { hh } = body();
    const c = COLORS[me.c]?.hex || '#fff';
    puff(me.x, me.y - hh / 2, c, 10);
    me.x = x;
    me.y = y;
    me.vx = 0;
    me.vy = 0;
    puff(me.x, me.y - hh / 2, c, 10);
    if (!silent) {
      net.sendEvent({ k: 'fx', pk: 'tp', x: Math.round(x), y: Math.round(y), c: me.c });
      sfx.zap();
    }
  }

  function ownObjs(kind) {
    const arr = [];
    for (const [id, o] of objs) if (o.o === me.uid && o.k === kind) arr.push([id, o]);
    arr.sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
    return arr;
  }

  function place(kind, x, y, extra, max) {
    const arr = ownObjs(kind);
    while (arr.length >= max) net.removeObj(arr.shift()[0]);
    return net.addObj({ k: kind, x: Math.round(x), y: Math.round(y), c: me.c, ...extra });
  }

  function doAction(act) {
    const { hw, hh } = body();
    const col = COLORS[me.c]?.hex || '#fff';
    const cx = me.x;
    const cy = me.y - hh / 2;
    switch (act) {
      case 'poop':
        place('poop', me.x, me.y, {}, 10);
        puff(me.x, me.y - 6, '#8a5a2b', 6, 90);
        sfx.plop();
        break;
      case 'tp': {
        const poops = ownObjs('poop');
        if (!poops.length) { say(cx, me.y - hh - 20, 'Najpierw zrób kupę!', '#ffffff'); break; }
        const target = poops[me.tpIdx % poops.length][1];
        me.tpIdx++;
        teleport(target.x, target.y);
        break;
      }
      case 'fart':
        me.vx = me.face * 640;
        me.vy = -560;
        me.ground = false;
        me.buf = 0;
        puff(me.x - me.face * hw, me.y - hh * 0.3, '#8bd13b', 10, 120);
        net.sendEvent({ k: 'fx', pk: 'fart', x: Math.round(me.x), y: Math.round(me.y - hh * 0.3), c: me.face > 0 ? 1 : 0 });
        sfx.fart();
        break;
      case 'goo':
        net.sendEvent({ k: 'proj', pk: 'goo', x: Math.round(cx + me.face * hw), y: Math.round(cy - hh * 0.2), vx: me.face * 720, vy: -260, c: me.c });
        sfx.whoosh();
        break;
      case 'bomb':
        net.sendEvent({ k: 'proj', pk: 'bomb', x: Math.round(cx + me.face * hw), y: Math.round(cy - hh * 0.2), vx: Math.round(me.face * 330 + me.vx * 0.4), vy: -460, c: me.c });
        sfx.whoosh();
        break;
      case 'firework':
        net.sendEvent({ k: 'proj', pk: 'fw', x: Math.round(cx), y: Math.round(me.y - hh), vx: Math.round((Math.random() - 0.5) * 160), vy: -780, c: me.c });
        sfx.whoosh();
        break;
      case 'peel':
        place('peel', me.x - me.face * (hw + 8), me.y, {}, 8);
        sfx.place();
        break;
      case 'block':
        place('block', me.x + me.face * (hw + CRATE_W / 2 + 6), me.y, {}, 12);
        sfx.place();
        break;
      case 'paint':
        place('paint', me.x + (Math.random() - 0.5) * 90, cy + (Math.random() - 0.5) * 110, { w: 28 + Math.round(Math.random() * 40) }, 60);
        sfx.splat();
        break;
      case 'scream':
        net.sendEvent({ k: 'push', x: Math.round(cx), y: Math.round(cy), r: 380, f: 1 });
        ring(cx, cy, 380, col);
        sfx.shout();
        break;
      case 'pull':
        net.sendEvent({ k: 'pull', x: Math.round(cx), y: Math.round(cy), r: 420, f: 1 });
        break;
      case 'swap': {
        const live = [...remotes.values()].filter((r) => r.seen);
        if (!live.length) { say(cx, me.y - hh - 20, 'Nie ma z kim!', '#ffffff'); break; }
        const t = live[Math.floor(Math.random() * live.length)];
        net.sendEvent({ k: 'swap', to: t.uid, x: Math.round(me.x), y: Math.round(me.y) });
        teleport(t.x, t.y, true);
        net.sendEvent({ k: 'fx', pk: 'tp', x: Math.round(me.x), y: Math.round(me.y), c: me.c });
        sfx.zap();
        break;
      }
      default:
        break;
    }
  }

  function handleEvent(ev) {
    const { hh } = body();
    const own = ev.o === me.uid;
    const col = COLORS[ev.c]?.hex || '#ffffff';
    switch (ev.k) {
      case 'fx':
        if (own) break;
        if (ev.pk === 'tp') { puff(ev.x, ev.y - 30, col, 12); sparks(ev.x, ev.y - 30, col, 8, 160); }
        if (ev.pk === 'fart') puff(ev.x - (ev.c ? 1 : -1) * 18, ev.y, '#8bd13b', 10, 120);
        break;
      case 'proj':
        projs.push({ pk: ev.pk, x: ev.x, y: ev.y, vx: ev.vx, vy: ev.vy, age: 0, o: ev.o, c: ev.c });
        break;
      case 'quake':
        ring(ev.x, ev.y, ev.r, '#ffffff');
        puff(ev.x, ev.y, '#c0c0c0', 10, 200);
        if (!own && me.ground) {
          const dx = me.x - ev.x;
          if (Math.abs(dx) < ev.r && Math.abs(me.y - ev.y) < 120) {
            const f = 1 - Math.abs(dx) / ev.r;
            me.vy = -(440 + 320 * f);
            me.vx += Math.sign(dx || 1) * 260 * f;
            me.ground = false;
            me.knock = 0.6;
          }
        }
        break;
      case 'push':
        if (!own) blast(ev.x, ev.y, ev.r, 1150, 360);
        ring(ev.x, ev.y, ev.r, '#ffffff');
        break;
      case 'pull':
        if (!own) {
          const dx = ev.x - me.x;
          const dy = ev.y - (me.y - hh / 2);
          const d = Math.hypot(dx, dy);
          if (d < ev.r && d > 8) {
            const f = 1 - d / ev.r * 0.5;
            me.vx += dx / d * 300 * f;
            me.vy += dy / d * 300 * f - 40;
            const sp = Math.hypot(me.vx, me.vy);
            if (sp > 760) { me.vx *= 760 / sp; me.vy *= 760 / sp; }
            me.ground = false;
            me.knock = 0.6;
          }
        }
        break;
      case 'swap':
        if (ev.to === me.uid) teleport(ev.x, ev.y, true);
        break;
      default:
        break;
    }
  }

  function wire() {
    net.handlers.pl = (uid, d) => {
      if (!d) {
        players.delete(uid);
        remotes.delete(uid);
        listeners.players(players);
        return;
      }
      const ids = d.pw ? d.pw.split(',').filter((s) => POWERS[s]) : [];
      const prev = players.get(uid);
      players.set(uid, { uid, n: d.n, c: d.c, j: d.j, ids });
      if (uid === me.uid) {
        me.name = d.n;
        me.c = d.c;
        if (ids.join() !== me.ids.join()) setIds(ids);
      } else {
        let r = remotes.get(uid);
        if (!r) {
          r = { uid, x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, f: 1, g: 0, seen: false, lastT: 0, mods: computeMods([]) };
          remotes.set(uid, r);
        }
        r.n = d.n;
        r.c = d.c;
        r.ids = ids;
        r.mods = computeMods(ids);
        if (!prev) sfx.join();
      }
      listeners.players(players);
    };
    net.handlers.st = (uid, d) => {
      if (uid === me.uid) return;
      const r = remotes.get(uid);
      if (!r || !d) return;
      if (!r.seen) { r.x = d.x; r.y = d.y; r.seen = true; }
      r.tx = d.x; r.ty = d.y; r.vx = d.vx; r.vy = d.vy; r.f = d.f; r.g = d.g;
      r.lastT = performance.now();
    };
    net.handlers.ob = (id, d) => {
      if (d) objs.set(id, d);
      else objs.delete(id);
      rebuildSolids();
    };
    net.handlers.ev = (id, ev) => {
      if (ev.t && ev.t < net.serverNow() - 4000) return;
      handleEvent(ev);
    };
  }

  function surfaceBelow(hw) {
    let best = Infinity;
    for (const s of solids) {
      if (me.x + hw > s.x && me.x - hw < s.x + s.w && s.y >= me.y - 2 && s.y < best) best = s.y;
    }
    return best === Infinity ? WORLD.ground : best;
  }

  function onIce() {
    for (const o of objs.values()) {
      if (o.k === 'ice' && o.o !== me.uid && Math.abs(me.x - o.x) < 42 && Math.abs(me.y - o.y) < 8) return true;
    }
    return false;
  }

  function physics(dt, inp) {
    const m = me.mods;
    const { hw, hh } = body();
    let dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (m.reverse) dir = -dir;
    if (me.slip > 0) dir = 0;
    if (dir) me.face = dir;

    const icy = me.ground && (m.slippery || onIce());
    const sp = PHYS.run * m.speed * (me.goo > 0 ? 0.35 : 1) * (me.stink > 0 ? 0.6 : 1);
    const acc = me.ground ? (icy ? 420 : 3200) : 1900;
    const dec = me.ground ? (icy ? 150 : (me.knock > 0 ? 450 : 3200)) : 220;
    const target = dir * sp;
    let rate;
    if (me.slip > 0) rate = 60;
    else if (dir !== 0 && Math.sign(me.vx) === dir && Math.abs(me.vx) > Math.abs(target)) rate = me.ground ? dec : 260;
    else if (dir !== 0) rate = acc;
    else rate = dec;
    me.vx = approach(me.vx, me.slip > 0 ? me.vx : target, rate * dt);
    if (me.slip > 0) me.vx *= Math.pow(0.5, dt);

    if (inp.jump) me.holdT += dt; else me.holdT = 0;
    if (me.ground) { me.coyote = 0.09; me.air = m.airJumps; } else me.coyote -= dt;
    if (inp.jumpEdge) me.buf = 0.12; else me.buf -= dt;

    const g = PHYS.gravity * m.grav;
    me.thrust = false;
    me.climbing = false;

    if (m.climb && me.wall && !me.ground && dir === me.wall) {
      if (inp.jumpEdge) {
        me.vx = -me.wall * 420;
        me.vy = -PHYS.jump * 0.85 * m.jump;
        me.wall = 0;
        me.buf = 0;
        sfx.jump();
      } else {
        me.climbing = true;
        me.vy = inp.jump ? -230 : Math.min(me.vy, 70);
      }
    }

    if (!me.climbing) {
      if (me.buf > 0 && (me.ground || me.coyote > 0)) {
        me.vy = -PHYS.jump * m.jump;
        me.ground = false;
        me.coyote = 0;
        me.buf = 0;
        me.jumping = true;
        me.squash = 1.3;
        sfx.jump();
      } else if (me.buf > 0 && !me.ground && me.air > 0) {
        me.vy = -PHYS.jump * 0.9 * m.jump;
        me.air--;
        me.buf = 0;
        me.jumping = true;
        me.squash = 1.25;
        puff(me.x, me.y, '#ffffff', 5, 80);
        sfx.jump();
      }
      if (!inp.jump && me.jumping && me.vy < -220 && !m.bounce) { me.vy *= 0.5; me.jumping = false; }

      if (m.hover && inp.jump && me.holdT > 0.18 && !m.jet) {
        const want = surfaceBelow(hw) - 40;
        const dvy = Math.max(-320, Math.min(260, (want - me.y) * 7));
        me.vy += (dvy - me.vy) * Math.min(1, 14 * dt);
        me.thrust = true;
        me.ground = false;
      } else {
        me.vy = Math.min(me.vy + g * dt, PHYS.fall * Math.max(1, m.grav));
        if (m.jet && inp.jump && me.holdT > 0.1) {
          me.vy = Math.max(me.vy - 3800 * dt, -540);
          me.thrust = true;
        }
      }
    }

    const dropping = inp.down && me.ground;
    if (dropping) me.dropT = 0.22;
    me.dropT -= dt;

    const prevX = me.x;
    me.x += me.vx * dt;
    me.wall = 0;
    if (!m.ghost) {
      for (const s of solids) {
        if (s.one) continue;
        if (me.x + hw > s.x && me.x - hw < s.x + s.w && me.y > s.y + 0.5 && me.y - hh < s.y + s.h - 0.5) {
          if (prevX < s.x + s.w / 2) { me.x = s.x - hw; me.wall = 1; } else { me.x = s.x + s.w + hw; me.wall = -1; }
          me.vx = 0;
        }
      }
    }
    me.x = Math.max(hw, Math.min(WORLD.w - hw, me.x));

    const prevY = me.y;
    const impact = me.vy;
    me.y += me.vy * dt;
    const wasGround = me.ground;
    me.ground = false;
    let land = null;
    for (const s of solids) {
      if (m.ghost && s.kind !== 'ground') continue;
      if (!(me.x + hw > s.x + 1 && me.x - hw < s.x + s.w - 1)) continue;
      if (me.vy >= 0 && prevY <= s.y + 1 && me.y >= s.y && !(s.one && me.dropT > 0)) {
        if (land === null || s.y < land) land = s.y;
      } else if (!s.one && me.vy < 0 && prevY - hh >= s.y + s.h - 1 && me.y - hh < s.y + s.h) {
        me.y = s.y + s.h + hh;
        me.vy = 0;
      }
    }
    if (land !== null) {
      me.y = land;
      me.ground = true;
      me.vy = 0;
      me.jumping = false;
      if (!wasGround && impact > 260) {
        me.squash = 0.65;
        sfx.land();
        if (m.quake && impact > 520) {
          net.sendEvent({ k: 'quake', x: Math.round(me.x), y: Math.round(me.y), r: Math.round(260 * m.size) });
          fx.push({ kind: 'shake', life: 0.3, max: 0.3 });
        }
      }
      if (m.bounce && impact > 160) {
        me.vy = -Math.max(impact * m.bounce, inp.jump ? PHYS.jump * 0.95 * m.jump : 0);
        me.ground = false;
        me.jumping = true;
      }
    }

    if (me.y > WORLD.floor) teleport(spawnX(), WORLD.ground - 300, true);
    if (me.y < WORLD.top) { me.y = WORLD.top; me.vy = 0; }

    me.squash += (1 - me.squash) * Math.min(1, 10 * dt);
    me.slip = Math.max(0, me.slip - dt);
    me.goo = Math.max(0, me.goo - dt);
    me.stink = Math.max(0, me.stink - dt);
    me.knock = Math.max(0, me.knock - dt);
    me.spin += (me.slip > 0 ? 14 : 0) * dt;
    if (me.slip <= 0) me.spin = 0;
  }

  function contacts(dt) {
    const { hh } = body();
    for (const [id, o] of objs) {
      if (o.o === me.uid) continue;
      if (o.k === 'peel' && me.slip <= 0 && bodyRectOverlap(o.x - 16, o.y - 18, 32, 20)) {
        me.slip = 1.2;
        me.vx = (Math.abs(me.vx) > 40 ? Math.sign(me.vx) : me.face) * 520;
        me.vy = -300;
        me.ground = false;
        net.removeObj(id);
        say(me.x, me.y - hh - 16, 'UPS!', '#ffee00');
        sfx.slip();
      } else if (o.k === 'poop' && me.stink <= 0 && bodyRectOverlap(o.x - 16, o.y - 24, 32, 26)) {
        me.stink = 1.2;
        say(me.x, me.y - hh - 16, 'FUJ!', '#8bd13b');
        sfx.stink();
      }
    }
  }

  function updateProjectiles(dt) {
    const { hw, hh } = body();
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      p.age += dt;
      const col = COLORS[p.c]?.hex || '#fff';
      let dead = false;
      if (p.pk === 'goo') {
        p.vy += 700 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        for (const s of solids) {
          if (s.one) continue;
          if (p.x > s.x && p.x < s.x + s.w && p.y > s.y && p.y < s.y + s.h) { dead = true; puff(p.x, p.y, '#6fe33b', 8, 100); break; }
        }
        if (!dead && p.o !== me.uid && p.x > me.x - hw - 8 && p.x < me.x + hw + 8 && p.y > me.y - hh - 8 && p.y < me.y + 8) {
          me.goo = 3;
          dead = true;
          puff(p.x, p.y, '#6fe33b', 12, 120);
          say(me.x, me.y - hh - 16, 'BLEE!', '#6fe33b');
          sfx.splat();
        }
        if (p.age > 3) dead = true;
      } else if (p.pk === 'bomb') {
        p.vy += 1500 * dt;
        p.x += p.vx * dt;
        const py = p.y;
        p.y += p.vy * dt;
        for (const s of solids) {
          if (p.x < s.x || p.x > s.x + s.w) continue;
          if (p.vy > 0 && py <= s.y && p.y >= s.y) { p.y = s.y; p.vy = -p.vy * 0.4; p.vx *= 0.7; if (Math.abs(p.vy) < 60) p.vy = 0; break; }
        }
        for (const s of solids) {
          if (s.one) continue;
          if (p.x > s.x && p.x < s.x + s.w && p.y > s.y + 2 && p.y < s.y + s.h) { p.x -= p.vx * dt; p.vx = -p.vx * 0.4; break; }
        }
        if (p.age > 1.5) {
          dead = true;
          sparks(p.x, p.y, '#ffb000', 28, 420);
          puff(p.x, p.y, '#555555', 12, 160);
          ring(p.x, p.y, 190, '#ffb000');
          fx.push({ kind: 'shake', life: 0.35, max: 0.35 });
          sfx.boom();
          blast(p.x, p.y, 190, 1250, 420);
        }
      } else if (p.pk === 'fw') {
        p.vy += 120 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (Math.random() < 0.6) fx.push({ kind: 'dot', x: p.x, y: p.y, vx: 0, vy: 40, life: 0.4, max: 0.4, col: '#ffe08a', size: 3, g: 0 });
        if (p.age > 0.95) {
          dead = true;
          sparks(p.x, p.y, col, 36, 300);
          sparks(p.x, p.y, '#ffffff', 14, 200);
          ring(p.x, p.y, 120, col);
          sfx.pop();
        }
      } else dead = true;
      if (dead) projs.splice(i, 1);
    }
  }

  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      if (f.life <= 0) { fx.splice(i, 1); continue; }
      if (f.kind === 'dot') { f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      else if (f.kind === 'text') f.y += f.vy * dt;
    }
  }

  function updateRemotes(dt) {
    const now = performance.now();
    for (const r of remotes.values()) {
      if (!r.seen) continue;
      const lag = Math.min(0.14, (now - r.lastT) / 1000);
      const k = Math.min(1, 14 * dt);
      r.x += (r.tx + r.vx * lag - r.x) * k;
      r.y += (r.ty + r.vy * lag - r.y) * k;
    }
  }

  function runActions(inp, dt) {
    me.slots.forEach((slot, i) => {
      const a = ACTIONS[slot.act];
      if (!a) return;
      if (a.hold) {
        if (inp.slotHeld[i]) {
          holdClock[i] = (holdClock[i] || 0) - dt * 1000;
          if (holdClock[i] <= 0) { doAction(slot.act); holdClock[i] = a.hold; }
        } else holdClock[i] = 0;
      } else if (inp.slotEdge[i]) doAction(slot.act);
    });
  }

  function sendState(dt) {
    stateTimer += dt;
    if (stateTimer < 0.075) return;
    stateTimer = 0;
    const g = (me.ground ? 1 : 0) | (me.thrust ? 2 : 0) | (me.slip > 0 ? 4 : 0) | (me.goo > 0 ? 8 : 0) | (me.climbing ? 16 : 0);
    const s = { x: Math.round(me.x), y: Math.round(me.y), vx: Math.round(me.vx), vy: Math.round(me.vy), f: me.face, g };
    const key = `${s.x},${s.y},${s.f},${s.g}`;
    const now = performance.now();
    if (key === lastSent && now - lastSentAt < 500) return;
    lastSent = key;
    lastSentAt = now;
    net.sendState(s);
  }

  function step(dt, inp) {
    dt = Math.min(dt, 1 / 30);
    if (me.name) {
      runActions(inp, dt);
      physics(dt / 2, inp);
      physics(dt / 2, { ...inp, jumpEdge: false, slotEdge: inp.slotEdge });
      if (me.mods.ice && me.ground && Math.abs(me.x - iceX) > 64) {
        iceX = me.x;
        const id = place('ice', me.x, me.y, {}, 7);
        setTimeout(() => net.removeObj(id), 6000);
      }
      contacts(dt);
      sendState(dt);
    }
    updateProjectiles(dt);
    updateFx(dt);
    updateRemotes(dt);
  }

  function clickWorld(wx, wy) {
    for (const [, o] of ownObjs('poop')) {
      if (Math.hypot(o.x - wx, o.y - 16 - wy) < 38) { teleport(o.x, o.y); return true; }
    }
    return false;
  }

  function resetPowers() {
    net.patchProfile({ pw: '' });
  }

  function addPower(id) {
    const next = [...me.ids, id];
    net.patchProfile({ pw: next.join(',') });
  }

  function respawn() {
    teleport(spawnX(), WORLD.ground - 300, true);
  }

  function nextPoopTarget() {
    const p = ownObjs('poop');
    return p.length ? p[me.tpIdx % p.length][1] : null;
  }

  wire();

  return {
    world, me, players, remotes, objs, projs, fx, listeners,
    step, clickWorld, resetPowers, addPower, respawn, nextPoopTarget, say,
    get solids() { return solids; },
    CRATE_W, CRATE_H,
  };
}
