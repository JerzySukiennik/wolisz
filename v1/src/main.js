// Wolisz?! - boot, lobby, round flow (host-driven) and the main loop.

import { PICK_TIME, PLAY_TIME, COLORS } from './config.js';
import { PAIRS, POWERS } from './powers.js';
import { createOnlineNet, createLocalNet } from './net.js';
import { createGame } from './game.js';
import { createRenderer } from './render.js';
import * as input from './input.js';
import { sfx, unlock, setMuted } from './audio.js';
import * as ui from './ui.js';

const { $ } = ui;
const canvas = $('game');
const renderer = createRenderer(canvas);

let net = createLocalNet();
let game = createGame(net);
let inRoom = false;
let meta = { phase: 'lobby', round: 0, end: 0, qi: -1, era: 0, used: '' };
let picks = {};
let lastEra = null;
let muted = false;
let idleT = 0;

input.setTypingCheck(() => document.activeElement && document.activeElement.tagName === 'INPUT');
input.bindPad($('tleft'), 'left');
input.bindPad($('tright'), 'right');
input.bindPad($('tjump'), 'jump');
input.bindPad($('tdown'), 'down');

const savedName = (() => { try { return localStorage.getItem('wolisz.name') || ''; } catch (e) { return ''; } })();
$('name').value = savedName;
const params = new URLSearchParams(location.search);
if (params.get('room')) $('code').value = params.get('room').toUpperCase().slice(0, 4);

function playerName() {
  const n = $('name').value.trim().slice(0, 14) || `Gracz${Math.floor(100 + Math.random() * 900)}`;
  try { localStorage.setItem('wolisz.name', n); } catch (e) { }
  return n;
}

function hostUid() {
  let best = null;
  for (const p of game.players.values()) {
    if (!best || p.j < best.j || (p.j === best.j && p.uid < best.uid)) best = p;
  }
  return best ? best.uid : null;
}

const isHost = () => hostUid() === net.uid;
const myPick = () => (picks[meta.round] || {})[net.uid] || null;

function pickCounts() {
  const cur = picks[meta.round] || {};
  const got = Object.keys(cur).filter((u) => game.players.has(u)).length;
  return [got, game.players.size];
}

function refreshPlayers() {
  const host = hostUid();
  ui.renderPlayers(game.players, host, net.uid);
  ui.renderSwatches(game.players, net.uid, (i) => { sfx.click(); net.patchProfile({ c: i }); });
  const me = game.players.get(net.uid);
  if (me) {
    const mine = [...game.players.values()].filter((p) => p.uid !== net.uid && p.c === me.c && p.j < me.j);
    if (mine.length) {
      const taken = new Set([...game.players.values()].filter((p) => p.uid !== net.uid).map((p) => p.c));
      const free = COLORS.findIndex((_, i) => !taken.has(i));
      if (free >= 0) net.patchProfile({ c: free });
    }
  }
  refreshRoom();
  refreshQuestion();
}

function refreshRoom() {
  const lobby = meta.phase === 'lobby';
  const host = isHost();
  $('rstart').classList.toggle('hidden', !(lobby && host));
  $('rwait').classList.toggle('hidden', !(lobby && !host));
  $('rreset').classList.toggle('hidden', !host || lobby);
}

function refreshQuestion() {
  if (!inRoom) return;
  if (meta.phase === 'lobby') { ui.showQuestionMode('none'); return; }
  const [got, total] = pickCounts();
  if (meta.phase === 'pick') {
    ui.showQuestionMode('pick');
    ui.renderQuestion(meta, myPick(), got, total);
  } else {
    ui.showQuestionMode('play');
    ui.renderReveal(meta, picks[meta.round] || {}, game.players, isHost());
  }
  tickTimer();
}

function tickTimer() {
  if (!inRoom || meta.phase === 'lobby') return;
  const sec = Math.max(0, Math.ceil((meta.end - net.serverNow()) / 1000));
  ui.setTimer(sec, meta.phase === 'pick' ? `Runda ${meta.round}: wybierz!` : `Runda ${meta.round}: zabawa, następne pytanie za`);
}

function pick(side) {
  if (meta.phase !== 'pick') return;
  choose(side);
}

function choose(side) {
  if (myPick()) return;
  const pair = PAIRS[meta.qi];
  if (!pair) return;
  sfx.pick();
  net.setPick(meta.round, side);
  game.addPower(pair[side]);
  picks = { ...picks, [meta.round]: { ...(picks[meta.round] || {}), [net.uid]: side } };
  refreshQuestion();
}

function onMeta(m) {
  if (!m) return;
  const prev = meta;
  meta = m;
  if (lastEra === null) lastEra = m.era;
  else if (m.era !== lastEra) {
    lastEra = m.era;
    game.resetPowers();
    ui.toast('NOWA ERA! Wszystkie moce wyzerowane.', 3000);
  }
  if (m.phase !== prev.phase || m.round !== prev.round) {
    if (m.phase === 'pick') {
      $('room').classList.add('hidden');
      sfx.next();
    }
    if (m.phase === 'play' && !myPick() && PAIRS[m.qi]) choose(Math.random() < 0.5 ? 'a' : 'b');
  }
  refreshRoom();
  refreshQuestion();
}

function nextRound() {
  const now = net.serverNow();
  let used = meta.used ? meta.used.split(',').map(Number) : [];
  let era = meta.era;
  if (used.length >= PAIRS.length) { used = []; era++; }
  const pool = PAIRS.map((_, i) => i).filter((i) => !used.includes(i));
  const qi = meta.round === 0 && used.length === 0 ? 0 : pool[Math.floor(Math.random() * pool.length)];
  net.setMeta({ phase: 'pick', round: meta.round + 1, end: now + PICK_TIME * 1000, qi, era, used: [...used, qi].join(',') });
}

function hostTick() {
  if (!inRoom || !isHost()) return;
  const now = net.serverNow();
  net.sweep();
  if (meta.phase === 'pick') {
    const [got, total] = pickCounts();
    if (got >= total || now >= meta.end) net.setMeta({ ...meta, phase: 'play', end: now + PLAY_TIME * 1000 });
  } else if (meta.phase === 'play' && now >= meta.end) nextRound();
}

function wireGame() {
  net.handlers.meta = onMeta;
  net.handlers.pk = (v) => { picks = v || {}; refreshQuestion(); };
  game.listeners.players = refreshPlayers;
  game.listeners.slots = (slots, ids) => { ui.renderActions(slots); ui.renderMyPowers(ids); };
}

function setHomeMsg(text, err) {
  const m = $('homemsg');
  m.textContent = text;
  m.classList.toggle('err', !!err);
}

async function enter(kind, code) {
  unlock();
  sfx.click();
  setHomeMsg('Łączenie...', false);
  ['bcreate', 'bjoin', 'bsolo'].forEach((id) => { $(id).disabled = true; });
  try {
    const newNet = kind === 'solo' ? createLocalNet() : await createOnlineNet();
    net = newNet;
    game = createGame(net);
    meta = { phase: 'lobby', round: 0, end: 0, qi: -1, era: 0, used: '' };
    picks = {};
    lastEra = null;
    wireGame();
    const profile = { n: playerName(), c: Math.floor(Math.random() * COLORS.length), pw: '' };
    const c = code ? await net.join(code, profile) : await net.create(profile);
    inRoom = true;
    $('rcode').textContent = c;
    $('home').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('room').classList.remove('hidden');
    if (kind === 'online') history.replaceState(null, '', `${location.pathname}?room=${c}`);
    refreshPlayers();
  } catch (e) {
    const map = { NOROOM: 'Nie ma takiego pokoju.', FULL: 'Pokój jest pełny.', NOCODE: 'Nie udało się wylosować kodu, spróbuj jeszcze raz.' };
    setHomeMsg(map[e.code] || 'Brak połączenia z serwerem. Możesz zagrać solo.', true);
    net = createLocalNet();
    game = createGame(net);
  } finally {
    ['bcreate', 'bjoin', 'bsolo'].forEach((id) => { $(id).disabled = false; });
  }
}

$('bcreate').addEventListener('click', () => enter('online', null));
$('bjoin').addEventListener('click', () => {
  const c = $('code').value.trim().toUpperCase();
  if (c.length !== 4) { setHomeMsg('Wpisz 4-literowy kod pokoju.', true); return; }
  enter('online', c);
});
$('bsolo').addEventListener('click', () => enter('solo', null));
$('code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

$('qa').addEventListener('click', () => pick('a'));
$('qb').addEventListener('click', () => pick('b'));
$('qnext').addEventListener('click', () => { sfx.click(); if (isHost()) nextRound(); });
$('rstart').addEventListener('click', () => { sfx.click(); net.clearPicks(); nextRound(); });
$('rreset').addEventListener('click', () => { sfx.click(); net.setMeta({ ...meta, era: meta.era + 1 }); });
$('rclose').addEventListener('click', () => { sfx.click(); $('room').classList.add('hidden'); });
$('mroom').addEventListener('click', () => { sfx.click(); $('room').classList.toggle('hidden'); });
$('mhome').addEventListener('click', () => { sfx.click(); game.respawn(); });
$('mmute').addEventListener('click', () => {
  muted = !muted;
  setMuted(muted);
  $('mmute').textContent = muted ? '🔇' : '🔊';
});
$('rleave').addEventListener('click', async () => {
  try { await net.leave(); } catch (e) { void e; }
  location.href = location.pathname;
});
$('rcopy').addEventListener('click', async () => {
  const link = `${location.origin}${location.pathname}?room=${$('rcode').textContent}`;
  try { await navigator.clipboard.writeText(link); ui.toast('Link skopiowany!'); } catch (e) { ui.toast(link, 4000); }
});

canvas.addEventListener('pointerdown', (e) => {
  unlock();
  if (!inRoom) return;
  const w = renderer.screenToWorld(e.clientX, e.clientY);
  game.clickWorld(w.x, w.y);
});
window.addEventListener('keydown', unlock, { once: true });

window.addEventListener('pagehide', () => { if (inRoom) net.leave(); });

setInterval(hostTick, 300);
setInterval(tickTimer, 250);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!inRoom) {
    idleT += dt;
    game.me.x = 2000 + Math.sin(idleT * 0.15) * 800;
    game.me.y = 560;
  } else {
    game.step(dt, input.read());
    input.clearEdges();
  }
  renderer.draw(game, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__wolisz = { get game() { return game; }, get net() { return net; }, get meta() { return meta; }, POWERS };
