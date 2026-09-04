# NE, ALE ZABÍJÍM — playable prototype

Open `index.html` in a modern browser. No install, build step, server, account, analytics, or external service is required.

The subtle **Resetovat lokální playtest** action starts a fresh local run. It asks for confirmation before clearing only this prototype's browser save.

## How to play

- Swipe **left** (or press **NE**) for the safer encounter.
- Swipe **right** (or press **ANO**) for a more dangerous, more rewarding encounter.
- Combat resolves automatically.
- Click two identical pieces of equipment with the same `+` value to merge them.
- Inventory contains weapons, armour, and relics; a visible elixir counter holds consumable recovery items.
- Browser storage preserves local progress; clearing site data resets it.

The raven-reward button is a visibly labeled prototype simulation, not an advertisement integration.

## Prototype equipment pool

- 48 named items: 16 weapons, 16 armour pieces, and 16 relics.
- Rarity ladder: Common, Uncommon, Rare, Epic, Legendary, Mythic.
- Two identical items of the same rank and rarity merge. At rank +3, a merge advances to the next rarity at +1 (until Mythic).
- The collection counter tracks discovered item types; the selected-item panel shows rarity, category, and contribution to damage.

Gold buys a random item in the travelling shop; essence crafts an item one rank below the current best rank. The two currencies therefore support different acquisition decisions.

## Attributes and affixes

Every item can carry afixes. Their number follows rarity: Common 0, Uncommon 1, Rare 2, Epic 3, Legendary 4, Mythic 5. The active attributes are shown below the hero:

- **DMG:** random damage range; weapons contribute most.
- **CRIT:** chance to deal 175% damage.
- **ARMOR:** reduces incoming damage, capped at 65% reduction.
- **EVADE:** chance to ignore an enemy hit, capped at 45%.
- **LEECH:** restores a share of damage dealt, capped at 25%.
- **VIT:** adds to maximum endurance.
- **THORNS:** reflects a percentage of damage actually received back to the attacker.
- **ABSORB:** subtracts a flat amount from an incoming hit before armour reduction.
- **HASTE:** speeds up the auto-attack interval, capped at 120%.
- **LUCK:** improves the loot rarity roll, capped at 50%.

Available affixes also include a gold-find bonus. Armour emphasizes armour and vitality; relics add smaller damage plus crit/evasion/luck; weapons emphasize damage.
