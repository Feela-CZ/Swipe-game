# Original sound design

All 24 effects are synthesized from original code in audio.js: filtered deterministic noise, pitched transients, inharmonic metal resonances, plucked tones, glissandi and short harmonic stingers. No external recordings, libraries, Suno material, borrowed melodies or third-party samples are included. There are no third-party attribution requirements for this sound bank.

Blade, blunt, arrow and magic attacks use distinct layers. Damage, block, dodge, critical hit, shield, thorns and potion effects follow domain events, not the final line of the combat log. A killing blow still sounds even after the battle state is removed. Escaping rats do not play victory. Revealed rare+ loot has a separate cue, played once on reveal rather than on every render. Forge, salvage, coins, equipment, chest, UI/page, victory, defeat, warning and level effects complete the bank.

Mono PCM at 22,050 Hz is synthesized once per used cue and cached in Web Audio. No network downloads are needed. Master volume defaults to 55%, sound remains opt-in and old saves retain their on/off preference. Six simultaneous voices maximum, slight non-musical pitch variation, soft saturation, edge fades and a master compressor limit harsh peaks. Disabled, hidden or zero-volume audio stops outstanding voices and invalidates pending playback. Web Audio is first unlocked from a user interaction. Gameplay never awaits audio.

Automated tests check signal properties and mocked transport; listening on phone speakers and headphones remains a human acceptance check. No soundtrack is included.
