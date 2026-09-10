# Intro/name checkpoint — completed 2026-09-10

UPDATE: The previously paused work below has been completed. 35 domain regressions and UI journeys pass, including name migration, invalid/Unicode names, reload persistence, keyboard submit and combat pause/resume. No browser or physical-phone visual testing was performed. dist is refreshed from the release source before publication.

This release also adds 20 compact inventory slots with equipped items above and a separate forge dialog. Legacy inventories above capacity retain all items. Gear changes preserve missing HP: full stays full, repeated swaps do not heal, and changes that would kill the hero are refused. Attribute tiles show rounded totals; breakdown remains on click. Inventory filler was removed. The existing save key, artwork, repository and owner-private site are retained.

## Historical checkpoint (superseded)

Base live commit: b592580d41d0be543f510a010713a06302bd4341, Sites version 15. DO NOT publish this checkpoint before finishing regression checks. dist is intentionally still the stable release.

Implemented: first-time welcome/name screen reusing existing art, editable Vendel suggestion; heroName persisted in engine, validated 2–24 Unicode letters/marks plus spaces/apostrophe/hyphen; old saves preserve all progress and request a name. Combat waits while unnamed. Enter submits, invalid input gives feedback. User-visible fixed Sir/Šmik references replaced with chosen name or neutral copy; historical log text replaced at rendering. Existing asset filename sir-smik.webp retained as internal path.

Only node --check game.js and engine.js were run and passed. Remaining work:
- Review exact replacements, ensure all dynamic names are escaped, title/header/scene alt/log/journal/name persistence are consistent.
- Update tests/ui.test.mjs title expectation to Quest Happens · Fantasy výpravy. Existing UI fixture characters lack heroName and will now meet the welcome screen; explicitly name the fixtures, and add separate intro tests for new/old save, invalid names, accented/apostrophe names, reload and no loss of run/items/points.
- Test keyboard submit, unconfirmed input on visibility changes, combat pause and resume, reset behavior. Check nameDraft is sensible after reset (can retain previous name as editable suggestion).
- Run domain/UI tests, production build, package, commit exact source/dist; publish to existing owner-private Sites URL after verifying access. Respect user no-Codex-browser preference.

The current welcome appears only until a name is confirmed, not on every reload. No optional renaming menu implemented. No new art generation needed.
