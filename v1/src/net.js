// Wolisz?! - networking. Firebase RTDB (shared gzowos-games project, root wolisz/rooms/<CODE>)
// and a local loopback with the same interface for solo play.

import { FIREBASE_CONFIG, FIREBASE_CDN, ROOT, MAX_PLAYERS } from './config.js';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return s;
}

function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error(label + ' timed out')), ms); }),
  ]).finally(() => clearTimeout(t));
}

function fail(code) {
  const e = new Error(code);
  e.code = code;
  return e;
}

export async function createOnlineNet() {
  const [appMod, authMod, db] = await withTimeout(Promise.all([
    import(`${FIREBASE_CDN}/firebase-app.js`),
    import(`${FIREBASE_CDN}/firebase-auth.js`),
    import(`${FIREBASE_CDN}/firebase-database.js`),
  ]), 12000, 'Firebase SDK');
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
  const auth = authMod.getAuth(app);
  await withTimeout(auth.authStateReady(), 8000, 'Auth');
  const user = auth.currentUser || (await withTimeout(authMod.signInAnonymously(auth), 10000, 'Sign-in')).user;
  const database = db.getDatabase(app);
  const uid = user.uid;

  let offset = 0;
  db.onValue(db.ref(database, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });

  let code = null;
  let unsubs = [];
  const seenEv = new Map();
  const seenOb = new Map();
  const net = { kind: 'online', uid, handlers: {} };

  const ref = (p) => db.ref(database, `${ROOT}/${code}/${p}`);
  const serverNow = () => Date.now() + offset;
  net.serverNow = serverNow;
  net.code = () => code;

  function attach() {
    const h = () => net.handlers;
    const watchChildren = (path, key, track) => {
      const r = ref(path);
      unsubs.push(db.onChildAdded(r, (s) => { if (track) track.set(s.key, s.val().t || 0); h()[key]?.(s.key, s.val()); }));
      unsubs.push(db.onChildChanged(r, (s) => h()[key]?.(s.key, s.val())));
      unsubs.push(db.onChildRemoved(r, (s) => { if (track) track.delete(s.key); h()[key]?.(s.key, null); }));
    };
    watchChildren('pl', 'pl');
    watchChildren('st', 'st');
    watchChildren('ob', 'ob', seenOb);
    const evr = db.query(ref('ev'), db.limitToLast(60));
    unsubs.push(db.onChildAdded(evr, (s) => { seenEv.set(s.key, s.val().t || 0); h().ev?.(s.key, s.val()); }));
    unsubs.push(db.onValue(ref('meta'), (s) => h().meta?.(s.val())));
    unsubs.push(db.onValue(ref('pk'), (s) => h().pk?.(s.val() || {})));
  }

  async function enter(profile) {
    attach();
    const plRef = ref(`pl/${uid}`);
    db.onDisconnect(plRef).remove();
    db.onDisconnect(ref(`st/${uid}`)).remove();
    await db.set(plRef, { ...profile, j: serverNow() });
  }

  net.create = async (profile) => {
    for (let i = 0; i < 12; i++) {
      const c = randomCode();
      const snap = await db.get(db.ref(database, `${ROOT}/${c}/pl`));
      if (snap.exists()) continue;
      code = c;
      await db.remove(db.ref(database, `${ROOT}/${c}`));
      await db.set(ref('meta'), { phase: 'lobby', round: 0, end: 0, qi: -1, era: 0, used: '' });
      await enter(profile);
      return code;
    }
    throw fail('NOCODE');
  };

  net.join = async (c, profile) => {
    c = c.toUpperCase();
    const meta = await db.get(db.ref(database, `${ROOT}/${c}/meta`));
    const pl = await db.get(db.ref(database, `${ROOT}/${c}/pl`));
    if (!meta.exists() || !pl.exists()) throw fail('NOROOM');
    if (Object.keys(pl.val()).length >= MAX_PLAYERS) throw fail('FULL');
    code = c;
    await enter(profile);
    return code;
  };

  net.leave = async () => {
    unsubs.forEach((u) => u());
    unsubs = [];
    if (code) {
      await db.remove(ref(`pl/${uid}`)).catch(() => {});
      await db.remove(ref(`st/${uid}`)).catch(() => {});
    }
    code = null;
    seenEv.clear();
    seenOb.clear();
  };

  net.patchProfile = (p) => db.update(ref(`pl/${uid}`), p);
  net.sendState = (s) => db.set(ref(`st/${uid}`), s);
  net.sendEvent = (ev) => db.push(ref('ev'), { ...ev, o: uid, t: db.serverTimestamp() });
  net.addObj = (o) => {
    const r = db.push(ref('ob'));
    db.set(r, { ...o, o: uid, t: db.serverTimestamp() });
    db.onDisconnect(r).remove();
    return r.key;
  };
  net.removeObj = (id) => db.remove(ref(`ob/${id}`)).catch(() => {});
  net.setMeta = (m) => db.set(ref('meta'), m);
  net.setPick = (round, v) => db.set(ref(`pk/${round}/${uid}`), v);
  net.clearPicks = () => db.remove(ref('pk')).catch(() => {});
  net.sweep = () => {
    const now = serverNow();
    for (const [id, t] of seenEv) if (t && now - t > 15000) { seenEv.delete(id); db.remove(ref(`ev/${id}`)).catch(() => {}); }
  };
  return net;
}

export function createLocalNet() {
  const uid = 'solo';
  const net = { kind: 'solo', uid, handlers: {} };
  let meta = null;
  let picks = {};
  let counter = 0;
  const later = (fn) => queueMicrotask(fn);

  net.serverNow = () => Date.now();
  net.code = () => 'SOLO';
  net.create = async (profile) => {
    net.profile = { ...profile, j: Date.now() };
    meta = { phase: 'lobby', round: 0, end: 0, qi: -1, era: 0, used: '' };
    later(() => {
      net.handlers.meta?.(meta);
      net.handlers.pl?.(uid, net.profile);
    });
    return 'SOLO';
  };
  net.join = net.create;
  net.leave = async () => {};
  net.patchProfile = (p) => { later(() => net.handlers.pl?.(uid, { ...net.profile, ...p })); net.profile = { ...net.profile, ...p }; };
  net.sendState = () => {};
  net.sendEvent = (ev) => {
    const id = 'e' + (counter++);
    later(() => net.handlers.ev?.(id, { ...ev, o: uid, t: Date.now() }));
  };
  net.addObj = (o) => {
    const id = 'o' + (counter++);
    later(() => net.handlers.ob?.(id, { ...o, o: uid, t: Date.now() }));
    return id;
  };
  net.removeObj = (id) => { later(() => net.handlers.ob?.(id, null)); };
  net.setMeta = (m) => { meta = m; later(() => net.handlers.meta?.(meta)); };
  net.setPick = (round, v) => {
    picks = { ...picks, [round]: { ...(picks[round] || {}), [uid]: v } };
    later(() => net.handlers.pk?.(picks));
  };
  net.clearPicks = () => { picks = {}; later(() => net.handlers.pk?.(picks)); };
  net.sweep = () => {};
  return net;
}
