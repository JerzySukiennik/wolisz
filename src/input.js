// Wolisz?! - keyboard, touch pad and action-slot input.

import { SLOT_KEYS } from './powers.js';

const held = new Set();
const edges = new Set();
const slotHeld = new Array(SLOT_KEYS.length).fill(false);
const slotEdge = new Array(SLOT_KEYS.length).fill(false);
const pad = { left: false, right: false, jump: false, down: false };
let jumpEdge = false;
let typing = () => false;

export function setTypingCheck(fn) {
  typing = fn;
}

const MOVE = {
  left: ['arrowleft', 'a'],
  right: ['arrowright', 'd'],
  jump: ['arrowup', 'w', ' '],
  down: ['arrowdown', 's'],
};

function anyHeld(names) {
  return names.some((k) => held.has(k));
}

window.addEventListener('keydown', (e) => {
  if (typing()) return;
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  held.add(k);
  edges.add(k);
  if (MOVE.jump.includes(k)) jumpEdge = true;
  const si = SLOT_KEYS.indexOf(k);
  if (si >= 0) { slotHeld[si] = true; slotEdge[si] = true; }
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  held.delete(k);
  const si = SLOT_KEYS.indexOf(k);
  if (si >= 0) slotHeld[si] = false;
});

window.addEventListener('blur', () => {
  held.clear();
  slotHeld.fill(false);
  pad.left = pad.right = pad.jump = pad.down = false;
});

export function bindHold(el, onDown, onUp) {
  const down = (e) => { e.preventDefault(); el.classList.add('on'); onDown(); };
  const up = (e) => { e.preventDefault(); el.classList.remove('on'); onUp(); };
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture?.(e.pointerId); down(e); });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function bindPad(el, name) {
  bindHold(el, () => { pad[name] = true; if (name === 'jump') jumpEdge = true; }, () => { pad[name] = false; });
}

export function pressSlot(i) {
  slotHeld[i] = true;
  slotEdge[i] = true;
}

export function releaseSlot(i) {
  slotHeld[i] = false;
}

export function read() {
  return {
    left: anyHeld(MOVE.left) || pad.left,
    right: anyHeld(MOVE.right) || pad.right,
    jump: anyHeld(MOVE.jump) || pad.jump,
    down: anyHeld(MOVE.down) || pad.down,
    jumpEdge,
    slotHeld,
    slotEdge,
  };
}

export function clearEdges() {
  jumpEdge = false;
  edges.clear();
  slotEdge.fill(false);
}
