# Mobile scenes — 2026-09-09

Implemented on top of e860917: proportional environment atlas, 13 distinct generic encounter archetypes and story encounter mappings, transparent actor/prop atlases, hero/enemy lunges, contextual currencies, menu with audio settings and expedition retirement. Outcomes retain the preceding encounter and actual defeated foe. Saved game key and balance formulas are unchanged.

Generated with built-in ImageGen, exactly two calls. Original PNGs with alpha are checked into assets/encounter-characters.png and assets/encounter-props.png; exact prompts are in assets/encounter-art-prompts.txt. Atlas cells are referenced by scenes.js, no runtime image generation. The 105 authored event variants reuse their corresponding archetype art, not 105 unique illustrations. Original hero portrait is retained in the character sheet.

Validation: domain (29 tests), UI journey + scene regressions, audio (25 cues), procedural expedition suite (300 route structures and 1200 simulated runs), production static build. Tests cover menu pause/resume, wallet navigation, actor-specific movement markup, stable outcomes and all generic encounter mappings. No browser geometry/physical phone QA was performed. CSS honors reduced motion and retains internal text scrolling for long content and enlarged fonts; action controls stay outside that scroll region.

The existing URL and browser save origin are intentionally retained. All source, assets, tests and dist output belong in the same release commit. Do not regenerate these assets when resuming.
