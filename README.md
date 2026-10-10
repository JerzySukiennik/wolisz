# Wolisz?!

2D online sandbox in a 1998 GeoCities style. Each round asks a "would you rather" question, every player picks
a power for their own avatar, and the powers stack from round to round. No winner, just chaos.

- Side-view 2D canvas, one file per concern in `src/`, ES modules from CDN, zero build.
- Multiplayer: Firebase Realtime Database (shared `gzowos-games` project, root `wolisz/rooms/<CODE>`), anonymous auth.
  Every client simulates its own avatar; the host (earliest joined player) advances the rounds.
- Solo training mode runs on a local loopback with the same interface.
- Database rules block: `Niepotrzebne/wolisz.rules.json`. Merge it only with `Projects/tools/rtdb-rules.sh`.

Run locally: `python3 -m http.server 8743` and open http://localhost:8743.
