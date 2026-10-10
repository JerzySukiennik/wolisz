// Wolisz?! - the powers, the actions they unlock and the questions that offer them.

export const ACTIONS = {
  poop: { label: 'Kupa', icon: '💩' },
  tp: { label: 'Teleport', icon: '🌀' },
  fart: { label: 'Rakieta', icon: '💨' },
  goo: { label: 'Glut', icon: '🟢' },
  peel: { label: 'Banan', icon: '🍌' },
  swap: { label: 'Zamiana', icon: '🔀' },
  bomb: { label: 'Bomba', icon: '💣' },
  block: { label: 'Skrzynia', icon: '📦' },
  pull: { label: 'Magnes', icon: '🧲', hold: 110 },
  scream: { label: 'Krzyk', icon: '📣' },
  paint: { label: 'Farba', icon: '🎨', hold: 90 },
  firework: { label: 'Fajerwerk', icon: '🎆' },
};

export const POWERS = {
  warp: {
    name: 'Kupa-Teleport',
    icon: '💩',
    desc: 'Robisz kupę, a potem teleportujesz się do dowolnej swojej kupy.',
    acts: ['poop', 'tp'],
  },
  hover: {
    name: 'Latanie na metr',
    icon: '🛸',
    desc: 'Przytrzymaj skok i lecisz równo metr nad ziemią.',
    mod: (m) => { m.hover = true; },
  },
  springs: {
    name: 'Sprężyny w butach',
    icon: '🦘',
    desc: 'Skaczesz prawie dwa razy wyżej.',
    mod: (m) => { m.jump *= 1.9; },
  },
  turbo: {
    name: 'Turbo-buty',
    icon: '👟',
    desc: 'Biegasz ponad dwa razy szybciej.',
    mod: (m) => { m.speed *= 2.1; },
  },
  giant: {
    name: 'Gigant',
    icon: '🦣',
    desc: 'Dwa razy większy. Lądowanie trzęsie ziemią i podrzuca innych.',
    mod: (m) => { m.size *= 2; m.speed *= 0.9; m.quake = true; },
  },
  tiny: {
    name: 'Mikrus',
    icon: '🐜',
    desc: 'Połowa wzrostu, zwinny jak mrówka.',
    mod: (m) => { m.size *= 0.5; m.speed *= 1.15; m.jump *= 1.1; },
  },
  fart: {
    name: 'Rakietowy bąk',
    icon: '💨',
    desc: 'Pierdnięcie wystrzeliwuje cię do przodu i w górę. W powietrzu też.',
    acts: ['fart'],
  },
  goo: {
    name: 'Plucie klejem',
    icon: '🟢',
    desc: 'Strzelasz klejem. Kogo trafisz, ten się wlecze.',
    acts: ['goo'],
  },
  gecko: {
    name: 'Łapki gekona',
    icon: '🦎',
    desc: 'Wchodzisz po ścianach i odbijasz się od nich.',
    mod: (m) => { m.climb = true; },
  },
  rubber: {
    name: 'Gumowe ciało',
    icon: '🏀',
    desc: 'Odbijasz się od wszystkiego i nie możesz przestać.',
    mod: (m) => { m.bounce = 0.82; },
  },
  moon: {
    name: 'Grawitacja Księżyca',
    icon: '🌙',
    desc: 'Lekki jak piórko, długo wiszysz w powietrzu.',
    mod: (m) => { m.grav *= 0.35; },
  },
  lead: {
    name: 'Ołowiane ciało',
    icon: '⚓',
    desc: 'Spadasz jak kamień, a twoje lądowanie podrzuca innych.',
    mod: (m) => { m.grav *= 2; m.speed *= 0.92; m.jump *= 1.35; m.quake = true; },
  },
  banana: {
    name: 'Skórki od banana',
    icon: '🍌',
    desc: 'Zostawiasz skórki. Kto nadepnie, ten leci.',
    acts: ['peel'],
  },
  icetrail: {
    name: 'Lodowa ścieżka',
    icon: '🧊',
    desc: 'Za tobą zostaje lód, po którym inni się ślizgają.',
    mod: (m) => { m.ice = true; },
  },
  swap: {
    name: 'Zamiana miejsc',
    icon: '🔀',
    desc: 'Zamieniasz się miejscami z losowym graczem.',
    acts: ['swap'],
  },
  bomb: {
    name: 'Bombardier',
    icon: '💣',
    desc: 'Rzucasz bombę, która po chwili podrzuca wszystkich w pobliżu.',
    acts: ['bomb'],
  },
  ghost: {
    name: 'Duch',
    icon: '👻',
    desc: 'Przenikasz przez platformy, ściany i skrzynie.',
    mod: (m) => { m.ghost = true; },
  },
  builder: {
    name: 'Budowniczy',
    icon: '📦',
    desc: 'Stawiasz skrzynie, z których robisz schody i wieże.',
    acts: ['block'],
  },
  jetpack: {
    name: 'Jetpack',
    icon: '🚀',
    desc: 'Przytrzymaj skok i wznosisz się bez końca.',
    mod: (m) => { m.jet = true; },
  },
  wings: {
    name: 'Skrzydełka',
    icon: '🪽',
    desc: 'Skaczesz w powietrzu bez limitu, jak w Flappy Birdzie.',
    mod: (m) => { m.airJumps = Infinity; },
  },
  magnet: {
    name: 'Magnes',
    icon: '🧲',
    desc: 'Przytrzymaj, a wszyscy dookoła są przyciągani do ciebie.',
    acts: ['pull'],
  },
  scream: {
    name: 'Ultra-krzyk',
    icon: '📣',
    desc: 'Krzyk odpycha wszystkich w pobliżu.',
    acts: ['scream'],
  },
  painter: {
    name: 'Malarz',
    icon: '🎨',
    desc: 'Chlapiesz farbą swojego koloru po całym świecie.',
    acts: ['paint'],
  },
  fireworks: {
    name: 'Fajerwerkarz',
    icon: '🎆',
    desc: 'Wystrzeliwujesz fajerwerki, które wybuchają w twoim kolorze.',
    acts: ['firework'],
  },
  drunk: {
    name: 'Sterowanie na odwrót',
    icon: '🙃',
    desc: 'Lewo to prawo, ale biegasz prawie dwa razy szybciej i skaczesz wyżej.',
    mod: (m) => { m.reverse = true; m.speed *= 1.8; m.jump *= 1.3; },
  },
  skates: {
    name: 'Łyżwy',
    icon: '⛸️',
    desc: 'Ślizgasz się jak po lodzie, ale jesteś szybszy.',
    mod: (m) => { m.slippery = true; m.speed *= 1.5; },
  },
};

export const PAIRS = [
  { q: 'Wolisz teleportować się tam, gdzie zrobisz kupę, czy latać, ale tylko metr nad ziemią?', a: 'warp', b: 'hover' },
  { q: 'Wolisz skakać jak na sprężynach czy biegać jak turbo?', a: 'springs', b: 'turbo' },
  { q: 'Wolisz być gigantem czy mrówką?', a: 'giant', b: 'tiny' },
  { q: 'Wolisz rakietowego bąka czy plucie klejem?', a: 'fart', b: 'goo' },
  { q: 'Wolisz łapki gekona czy gumowe ciało?', a: 'gecko', b: 'rubber' },
  { q: 'Wolisz grawitację Księżyca czy ciało z ołowiu?', a: 'moon', b: 'lead' },
  { q: 'Wolisz zostawiać za sobą skórki od banana czy lodową ścieżkę?', a: 'banana', b: 'icetrail' },
  { q: 'Wolisz zamieniać się miejscami z innymi czy rzucać bombami?', a: 'swap', b: 'bomb' },
  { q: 'Wolisz przenikać przez ściany czy budować skrzynie?', a: 'ghost', b: 'builder' },
  { q: 'Wolisz mieć jetpack czy skrzydełka?', a: 'jetpack', b: 'wings' },
  { q: 'Wolisz przyciągać wszystkich magnesem czy odpychać ich krzykiem?', a: 'magnet', b: 'scream' },
  { q: 'Wolisz malować świat czy odpalać fajerwerki?', a: 'painter', b: 'fireworks' },
  { q: 'Wolisz sterować na odwrót, ale turbo, czy chodzić na łyżwach?', a: 'drunk', b: 'skates' },
];

export function computeMods(ids) {
  const m = {
    speed: 1, jump: 1, grav: 1, size: 1, airJumps: 0,
    hover: false, jet: false, ghost: false, bounce: 0, slippery: false,
    reverse: false, climb: false, quake: false, ice: false,
  };
  for (const id of ids) {
    const p = POWERS[id];
    if (p && p.mod) p.mod(m);
  }
  return m;
}

export function slotsFor(ids) {
  const out = [];
  for (const id of ids) {
    const p = POWERS[id];
    if (!p || !p.acts) continue;
    for (const act of p.acts) out.push({ power: id, act });
  }
  return out;
}

export const SLOT_KEYS = ['q', 'e', 'r', 'f', 'z', 'x', 'c', 'v'];
