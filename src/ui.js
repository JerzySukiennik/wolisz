// Wolisz?! - DOM layer: question bar, player list, room window, action bar.

import { COLORS } from './config.js';
import { ACTIONS, POWERS, PAIRS, SLOT_KEYS } from './powers.js';
import { bindHold, pressSlot, releaseSlot } from './input.js';

export const $ = (id) => document.getElementById(id);

let toastTimer = 0;

export function toast(text, ms = 2200) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function renderPlayers(players, hostUid, meUid) {
  const list = [...players.values()].sort((a, b) => a.j - b.j);
  const html = list.map((p) => {
    const col = COLORS[p.c]?.hex || '#fff';
    const icons = p.ids.map((id) => POWERS[id]?.icon || '').join('');
    return `<div class="prow"><span class="dot" style="background:${col}"></span><span>${esc(p.n)}${p.uid === meUid ? ' (ty)' : ''}</span>${p.uid === hostUid ? '<span class="crown">👑</span>' : ''}<span class="ic">${icons}</span></div>`;
  }).join('');
  $('plist').innerHTML = html;
  $('rplayers').innerHTML = html;
}

export function renderSwatches(players, meUid, onPick) {
  const used = new Map();
  for (const p of players.values()) if (p.uid !== meUid) used.set(p.c, true);
  const mine = players.get(meUid)?.c;
  const box = $('swatches');
  box.innerHTML = '';
  COLORS.forEach((c, i) => {
    const b = document.createElement('div');
    b.className = 'sw' + (i === mine ? ' sel' : '') + (used.has(i) ? ' taken' : '');
    b.style.background = c.hex;
    b.title = c.name;
    b.addEventListener('click', () => { if (!used.has(i)) onPick(i); });
    box.appendChild(b);
  });
}

export function renderActions(slots) {
  const bar = $('abar');
  bar.innerHTML = '';
  slots.forEach((slot, i) => {
    const a = ACTIONS[slot.act];
    const b = document.createElement('button');
    b.className = 'abtn';
    b.innerHTML = `<span class="ic">${a.icon}</span><span>${a.label}</span><span class="key">${(SLOT_KEYS[i] || '').toUpperCase() || '·'}</span>`;
    bindHold(b, () => pressSlot(i), () => releaseSlot(i));
    bar.appendChild(b);
  });
}

export function renderMyPowers(ids) {
  $('mypowers').innerHTML = ids.map((id) => `<span class="pw" title="${esc(POWERS[id]?.name)}: ${esc(POWERS[id]?.desc)}">${POWERS[id]?.icon || ''}</span>`).join('');
}

function choiceHTML(id) {
  const p = POWERS[id];
  return `<span class="ic">${p.icon}</span><b>${esc(p.name)}</b><i>${esc(p.desc)}</i>`;
}

export function renderQuestion(meta, myPick, pickCount, total) {
  const pair = PAIRS[meta.qi];
  if (!pair) return;
  $('qround').textContent = `Runda ${meta.round}`;
  $('qtext').textContent = pair.q;
  const a = $('qa');
  const b = $('qb');
  a.innerHTML = choiceHTML(pair.a);
  b.innerHTML = choiceHTML(pair.b);
  a.className = 'choice' + (myPick === 'a' ? ' picked' : myPick ? ' lost' : '');
  b.className = 'choice' + (myPick === 'b' ? ' picked' : myPick ? ' lost' : '');
  $('qstat').textContent = myPick ? `Wybrałeś. Czekamy na resztę (${pickCount}/${total})` : `Wybrało ${pickCount}/${total}. Kliknij swoją opcję!`;
}

export function renderReveal(meta, picks, players, canSkip) {
  const pair = PAIRS[meta.qi];
  const chips = [];
  if (pair) {
    for (const p of [...players.values()].sort((x, y) => x.j - y.j)) {
      const side = picks[p.uid];
      if (!side) continue;
      const pw = POWERS[pair[side]];
      chips.push(`<span class="chip"><span class="dot" style="background:${COLORS[p.c]?.hex || '#fff'}"></span>${esc(p.n)} ${pw.icon} ${esc(pw.name)}</span>`);
    }
  }
  $('qchips').innerHTML = chips.join('');
  $('qnext').classList.toggle('hidden', !canSkip);
}

export function showQuestionMode(mode) {
  const bar = $('qbar');
  if (mode === 'none') { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  $('qbody').classList.toggle('hidden', mode !== 'pick');
  $('qreveal').classList.toggle('hidden', mode !== 'play');
  bar.querySelector('.titlebar').firstElementChild.classList.toggle('play', mode === 'play');
}

export function setTimer(sec, label) {
  const t = $('qtimer');
  t.textContent = sec;
  t.classList.toggle('low', sec <= 5);
  if (label) $('qround').textContent = label;
}
