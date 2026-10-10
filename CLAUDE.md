# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Piksel Savaşçı: a phone-first pixel-art idle clicker. The top ~48% of the screen is the battle canvas (hero, one pet, enemy) with a DOM HUD and a skill bar over it. The bottom is a tabbed panel: Kahraman, Pet, Zindan, Yetenek, Doğuş, Menü. `index.html`, `styles.css`, native ES modules in `js/`. No build step and no npm dependencies; the only external resource is the Pixelify Sans font from Google Fonts. Keep it that way unless asked. UI text is Turkish.

## Release notes (every change)

Every player-visible change ships with a release note:

1. Bump the version: a new feature is a minor bump (0.4.0 → 0.5.0), a fix or tweak a patch bump (0.4.0 → 0.4.1).
2. Add an entry at the top of `CHANGELOG` in `js/changelog.js`: the version, today's date and short Turkish notes written for players.
3. Set the same version in `package.json`. `tests/pwa.test.js` fails if the two differ or the list isn't newest-first.

The version shows as the faint label in the top-right corner of the battle; tapping it opens the notes. Keep it faint: the user asked for it to be findable but never in the way.

## Running and testing

- Serve over HTTP (ES modules fail on `file://`): `python -m http.server 8002`, or the `piksel-savasci` entry in the parent `.claude/launch.json`.
- `npm test` runs `node --test` on `tests/`. It imports `js/logic.js`, `js/dungeon.js`, `js/config.js`, `js/sprite-data.js` and `js/changelog.js` directly, so those must stay free of DOM access.
- When the browser pane is hidden, `requestAnimationFrame` doesn't fire and the game looks frozen. Stub it in the page (`window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`) and take one screenshot to flush the pending frame. Screenshots of a hidden pane can lag a frame behind; check canvas pixels with `getImageData` when in doubt.
- To load a test save, use Menü → İçe Aktar with `btoa(unescape(encodeURIComponent(JSON.stringify(save))))`. Writing `localStorage` and reloading doesn't work: the `pagehide` autosave overwrites it.

## Deploying

Repo: `codder-ctrl/piksel-savasci`. GitHub Pages serves the repo root of `main` at https://codder-ctrl.github.io/piksel-savasci/, so every push to `main` is a release; run `npm test` first. `.nojekyll` keeps Pages from running Jekyll. All paths in the page, manifest and `sw.js` are relative because the site lives under `/piksel-savasci/`, so keep them relative.

## Architecture

`config` → `dungeon` → `logic` → `store`; `sprite-data` → `sprites` → `render`, `dungeon-view`, `ui` (+ `ui-pets`, `ui-dungeon`); everything → `main`. `dungeon.js` must not import `logic.js` (logic imports it), so no cycles.

- **`logic.js`** — all main-battle rules, operating on one plain state object. Mutating functions push events (`hit`, `kill`, `unlock`, `stage`, `spawn`, `bossFail`, `skill`, `elmas`, `egg`) onto an `events` array; `main.js` passes them to the renderer and sound. Randomness comes in as an `rng` parameter so tests are deterministic.
- **Stages** — `maxStage` is the highest unlocked stage; `kills` counts progress on it only. With `autoAdvance` on, each kill below `maxStage` moves up one stage. The stage changes right after a kill but the next enemy spawns from it only when `respawn` runs out.
- **Pets** — `totalDps = trainingDps(training.train) × petMultiplier(activePet) × souls × warcry`. Pet Eğitimi is shared by all pets and resets on rebirth. The collection lives in `state.pets[id] = { form, stars }` and is permanent, like `elmas`, `kristal`, `companions` and `dungeon`. Pet sprites mark evolution parts with digits ('1' recolored per form, '3' from form 2, '2' on form 3), which `config.PETS[].forms[].colors` fill in.
- **Dungeon** — `dungeon.js` runs a separate auto-battle from `tick` (in the background on every tab). `state.dungeonRun` is the live fight and isn't saved; team, levels and floors are. A wipe retreats one floor so income never stops. Changing the team or leveling a member restarts the floor.
- **Skills** — levels in `state.skills`, timers in `state.skillTimers[id] = { active, cooldown }` (seconds; the cooldown starts on use and includes the active time). Effects are applied where the numbers are computed: `tapDamage` (rage), `totalDps` (warcry; `petDps` stays unboosted for the shop), `critChance` (focus), and `tick` runs storm's auto-taps (`hit` events with `auto: true`, kept silent and left out of `stats.taps`). Timers are saved, survive prestige, and run forward offline through `elapseSkills`, so reloading or rebirth can't skip a cooldown.
- **`render.js`** — draws into a buffer about `TARGET_W` pixels wide, scales it up by a whole number with smoothing off, then draws text at full resolution. It keeps its own snapshot of the on-screen enemy (`current`) and only re-syncs on `spawn`, or on `stage` when the enemy is already alive. The dying enemy and the background therefore stay correct while `state.stage` has already advanced. `dungeon-view.js` uses the same approach for the Zindan stage; `main.js` only feeds it frames and `dg-*` events while that tab is open.
- **`ui.js`** — builds the cards once and updates their text a few times a second through `set()`, which only writes changed text. It never mutates state; every action goes through the handler object from `main.js`. The Pet and Zindan pages live in `ui-pets.js` and `ui-dungeon.js` and get the shared helpers (`makeCard`, `icon`, `set`).
- **`main.js`** — loop (dt capped at 0.1s), input, autosave every 10s plus on hide/pagehide. On return, gaps under `OFFLINE_MIN` are simulated with `tick`; longer gaps pay `offlineGold` and show the welcome modal.

## Rules to keep

- Wrap every `localStorage` access in try/catch; the game must work without storage.
- Saved data is untrusted: anything new in the state needs a matching line in `loadState`, which validates field by field. `enemy` and `dungeonRun` aren't saved. When the state shape changes incompatibly, bump `SAVE_VERSION` and migrate in `loadState` (v1 → v2 refunds the old gold-bought helpers).
- Sprites are text rows in `sprite-data.js`; the tests check row lengths and palette coverage. Enemies face left, the hero and companions face right, pets face the viewer. Zone, companion and pet-form colors are palette overrides in `config.js`, not new sprites.
- Balance numbers live in `config.js`. When changing them, re-check pacing with a quick simulation (greedy buyer, ~5 taps/s): with the starter dog, stage 20 at ~4 min and a wall around stage 80; a fully evolved legendary pet gets ~40 stages further. Dungeon: the starter team reaches ~floor 18 quickly, then ~floor 29 after 2 hours of greedy upgrades.
- Put text into the DOM with `textContent`, not `innerHTML`.
- PWA: `sw.js` precaches the `SHELL` list. A new file the page loads (module, icon, stylesheet) must be added there, or `npm test` fails (`tests/pwa.test.js`). One missing entry makes the whole install fail. Game files are network-first, so deploys need no cache version bump. Don't switch them to cache-first without adding versioning: mixed old and new modules would break the game.
- Icons are generated: change `tools/make-icons.js` or the hero sprite and run `npm run icons` rather than editing the PNGs.
- While testing on localhost, the service worker serves cached files when the server is down. If a change doesn't show up, check that the server is running; the worker is network-first, so a plain reload picks up edits.
