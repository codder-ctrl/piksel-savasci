# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Piksel Savaşçı: a phone-first pixel-art idle clicker. The top ~48% of the screen is the battle canvas with a DOM HUD over it; the bottom is a tabbed panel (Kahraman, Yoldaşlar, Doğuş, Menü). `index.html`, `styles.css`, native ES modules in `js/`. No build step and no npm dependencies; the only external resource is the Pixelify Sans font from Google Fonts. Keep it that way unless asked. UI text is Turkish.

## Running and testing

- Serve over HTTP (ES modules fail on `file://`): `python -m http.server 8002`, or the `piksel-savasci` entry in the parent `.claude/launch.json`.
- `npm test` runs `node --test` on `tests/`. It imports `js/logic.js`, `js/config.js` and `js/sprite-data.js` directly, so those three must stay free of DOM access.
- When the browser pane is hidden, `requestAnimationFrame` doesn't fire and the game looks frozen. Stub it in the page (`window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`) and take one screenshot to flush the pending frame.
- To load a test save, use Menü → İçe Aktar with `btoa(JSON.stringify(save))`. Writing `localStorage` and reloading doesn't work: the `pagehide` autosave overwrites it.

## Architecture

`config` → `logic` → `store`; `sprite-data` → `sprites` → `render`, `ui`; everything → `main`. No import cycles.

- **`logic.js`** — all rules, operating on one plain state object. Mutating functions push events (`hit`, `kill`, `unlock`, `stage`, `spawn`, `bossFail`) onto an `events` array; `main.js` passes them to the renderer and sound. Randomness comes in as an `rng` parameter so tests are deterministic.
- **Stages** — `maxStage` is the highest unlocked stage; `kills` counts progress on it only. With `autoAdvance` on, each kill below `maxStage` moves up one stage. The stage changes right after a kill but the next enemy spawns from it only when `respawn` runs out.
- **`render.js`** — draws into a buffer about `TARGET_W` pixels wide, scales it up by a whole number with smoothing off, then draws text at full resolution. It keeps its own snapshot of the on-screen enemy (`current`) and only re-syncs on `spawn`, or on `stage` when the enemy is already alive. The dying enemy and the background therefore stay correct while `state.stage` has already advanced.
- **`ui.js`** — builds the shop cards once and updates their text a few times a second through `set()`, which only writes changed text. It never mutates state; every action goes through the handler object from `main.js`.
- **`main.js`** — loop (dt capped at 0.1s), input, autosave every 10s plus on hide/pagehide. On return, gaps under `OFFLINE_MIN` are simulated with `tick`; longer gaps pay `offlineGold` and show the welcome modal.

## Rules to keep

- Wrap every `localStorage` access in try/catch; the game must work without storage.
- Saved data is untrusted: anything new in the state needs a matching line in `loadState`, which validates field by field. `enemy` isn't saved.
- Sprites are text rows in `sprite-data.js`; the tests check row lengths and palette coverage. Enemies face left, the hero and companions face right. Zone and companion colors are palette overrides in `config.js`, not new sprites.
- Balance numbers live in `config.js`. When changing them, re-check pacing with a quick simulation (greedy buyer, ~5 taps/s): currently stage 20 at ~4 min and a wall around stage 80, which pushes the player to prestige.
- Put text into the DOM with `textContent`, not `innerHTML`.
- PWA: `sw.js` precaches the `SHELL` list. A new file the page loads (module, icon, stylesheet) must be added there, or `npm test` fails (`tests/pwa.test.js`). One missing entry makes the whole install fail. Game files are network-first, so deploys need no cache version bump. Don't switch them to cache-first without adding versioning: mixed old and new modules would break the game.
- Icons are generated: change `tools/make-icons.js` or the hero sprite and run `npm run icons` rather than editing the PNGs.
- While testing on localhost, the service worker serves cached files when the server is down. If a change doesn't show up, check that the server is running; the worker is network-first, so a plain reload picks up edits.
