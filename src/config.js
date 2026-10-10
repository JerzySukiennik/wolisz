// Wolisz?! - shared constants.

export const M = 40;

export const WORLD = { w: 4400, ground: 720, floor: 1400, top: -2800 };

export const PHYS = {
  w: 30,
  h: 60,
  gravity: 2200,
  run: 270,
  jump: 720,
  fall: 1700,
};

export const PICK_TIME = 20;
export const PLAY_TIME = 55;
export const MAX_PLAYERS = 10;
export const ROOT = 'wolisz/rooms';

export const COLORS = [
  { name: 'Czerwony', hex: '#ff2a2a' },
  { name: 'Pomarańczowy', hex: '#ff8c00' },
  { name: 'Żółty', hex: '#ffee00' },
  { name: 'Limonkowy', hex: '#3dff3d' },
  { name: 'Turkusowy', hex: '#00e5ff' },
  { name: 'Niebieski', hex: '#2f55ff' },
  { name: 'Fioletowy', hex: '#a040ff' },
  { name: 'Różowy', hex: '#ff4fd8' },
  { name: 'Biały', hex: '#ffffff' },
  { name: 'Brązowy', hex: '#b5651d' },
];

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAaTuELH_mToxH3hRJ4WPIVTECSH7Z8-FY',
  authDomain: 'gzowos-games.firebaseapp.com',
  databaseURL: 'https://gzowos-games-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'gzowos-games',
  storageBucket: 'gzowos-games.firebasestorage.app',
  messagingSenderId: '658227201482',
  appId: '1:658227201482:web:627b44e3c4c2988bc4bb33',
};

export const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/10.12.5';
