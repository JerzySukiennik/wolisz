// Wolisz?! - the static level: ground, stairs, pillars, one-way platforms and signs.

import { WORLD } from './config.js';

export function buildWorld() {
  const g = WORLD.ground;
  const solids = [{ x: -600, y: g, w: WORLD.w + 1200, h: 800, one: false, kind: 'ground' }];

  for (let i = 0; i < 6; i++) {
    const top = g - (i + 1) * 36;
    solids.push({ x: 260 + i * 110, y: top, w: 110, h: g - top, one: false, kind: 'step' });
  }
  for (let i = 0; i < 6; i++) {
    const top = g - (6 - i) * 36;
    solids.push({ x: 3560 + i * 110, y: top, w: 110, h: g - top, one: false, kind: 'step' });
  }

  const pillars = [
    { x: 1280, y: 360, w: 46, h: g - 360 },
    { x: 2200, y: 430, w: 46, h: g - 430 },
    { x: 2960, y: 300, w: 46, h: g - 300 },
  ];
  for (const p of pillars) solids.push({ ...p, one: false, kind: 'pillar' });

  const plats = [
    [900, 560, 260], [1500, 540, 300], [1760, 400, 240], [2320, 560, 340],
    [2440, 330, 220], [1000, 400, 200], [3100, 540, 300], [3300, 380, 240],
    [3000, 210, 220], [1900, 230, 240], [600, 260, 220], [3700, 160, 240],
  ];
  for (const [x, y, w] of plats) solids.push({ x, y, w, h: 18, one: true, kind: 'plat' });

  const signs = [
    { x: 2050, text: 'WOLISZ?!', sub: 'witaj w piaskownicy' },
    { x: 700, text: 'UNDER CONSTRUCTION', sub: 'zawsze' },
    { x: 3400, text: 'BEST VIEWED IN NETSCAPE 4.0', sub: 'albo w Safari' },
    { x: 1600, text: 'GZOWO.FUN', sub: 'odwiedziny: 000042' },
  ];

  return { solids, signs, w: WORLD.w, ground: g };
}

export function spawnX() {
  return 1850 + Math.random() * 700;
}
