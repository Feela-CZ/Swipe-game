# Title and save system — 2026-09-11

The opening title lasts 1.6 seconds, is skippable, then shows New Game / Load Game / Settings. Gameplay only starts after selecting a position or confirming New Game and naming the hero. Existing art is reused. No browser preview or physical-phone QA was performed.

Saves are private per Sites-authenticated user, keyed by the dispatch user header, in D1 game_saves. Automatic slot, three manual slots and a one-time legacy import are separate. Writes use optimistic revision checks; a stale device cannot silently replace a newer save. Manual overwrite and New Game require confirmation. Missing authentication, unavailable storage and conflicts are surfaced without replacing the running state. Returning to main menu waits for saving; combat remains paused there.

The former localStorage key is preserved as a recovery cache, not the authoritative save service. Load Game exposes this device's pre-launch cache under a recovery disclosure. Preferences remain device-local. API requests are same-origin JSON and private responses use no-store. No public access was added. Source remains vanilla JS; a minimal Worker serves the existing client assets and save API. The generated Drizzle migration is schema-only and must not be edited after deployment.

Validation covers existing 35 gameplay regressions, UI journeys, timed title/menu, new/name flow, manual overwrite cancellation, save/restore of an active battle, private ownership and stale-write rejection. Publication must retain the existing project ID and URL.
