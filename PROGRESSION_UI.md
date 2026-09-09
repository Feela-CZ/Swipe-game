# Progression and readable consequences — 2026-09-09

Base: 8e366812e959755f12aba791907cf048e2d5a280 (mobile scenes release).

- Future-effect rule spoilers removed from authored outcomes. Immediate costs/rewards remain explicit. Some old persisted notices/journal entries are scrubbed on migration as well.
- Combat badges use live state and neutral labels; compounded HP bonuses display 21%, not 20%. One-shot buffs disappear when consumed. Intrinsic enemy tells and actual attack results remain readable.
- Each level grants 5 maximum HP, heals those 5 HP and grants one training point. Existing characters gain the new level-based maximum without retroactive healing. Historical saves with unspent points open training, without inventing an unseen level-up history.
- Persisted levelNotice aggregates new levels, HP and granted points. Dismissal acknowledges the report but never loses unspent points. Training stays locked in combat.
- Character pages: attributes (3 columns), equipped gear, six combat stats per page. Stat details still show full breakdowns. Training plus buttons exist in the level-up/training dialog only.
- Integer item damage contributions are rounded identically in engine and item detail. Percentage attributes retain precision.
- New title: Dobrodruh na zkušební dobu. Four functional SVG navigation icons replace text glyphs.

Checks: 32 domain regressions, expanded UI simulations, procedural route/difficulty suite. Prepared starter 171/300 wins; tired 98/300; reckless 0/300; geared 300/300. No browser/physical-device geometry testing. Character/training layout is sized for normal portrait phones; overflow remains a safety fallback for extreme viewport/font sizes.

Preserve localStorage key and current URL. No new generated images or audio in this release. Existing image assets are reused.
