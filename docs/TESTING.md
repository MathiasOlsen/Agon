# Testing

## Running the checks

```bash
pnpm run verify     # type check plus the logic tests
pnpm test           # logic tests only
pnpm run preview    # render the pixel artwork to artifacts/ and look at it
```

The rules in `src/core` are plain TypeScript with no React Native imports, so
they run directly under Node. No test framework is involved: `scripts/run-tests.mjs`
collects every `*.test.ts` and hands it to Node's own runner through the
TypeScript hooks in `scripts/ts-hooks.mjs`.

## What the tests cover

| Area | Covered |
| --- | --- |
| Level curve | Cumulative thresholds, interval sizes, level boundaries, tier mapping, level 30 behaviour |
| Calendar | Local dates from instants, spring and autumn daylight saving, a 45-minute offset zone, leap years, week starts, month and year ends |
| Periods | Key formats, inclusive ranges, rollover across month, year and week boundaries, gap-free enumeration |
| Mood | Thresholds, seven-of-fourteen sampling, recovery and pause freezing the window, today lifting but not lowering the score, pre-onboarding days |
| Quest engine | Instance creation from the plan, derived progress, completion, the daily bonus, reward idempotency, clock rollback, correction and reversal, the supporting cap, plan-derived targets, check-offs, expiry without loss |
| Workouts | Session identity, finishing once, shortening replacing the original, rescheduling, one activity advancing several goals from one record |
| Backup | Round trip, wrong passphrase, damaged file, newer format and schema refusal, readable export, restore preview, recompute after restore |
| Artwork | Rectangle decomposition correctness and compactness, sprite frame size, tier and mood differences, glyph integrity |
| Language | Key parity between English and Danish, placeholder parity, plural selection, locale fallback |

## What still needs a device

These acceptance checks from the handoff cannot be settled by unit tests, and
are listed here so they are not forgotten:

1. Run onboarding, logging, export, completion and reminders with the network
   disconnected, and confirm a restart loses nothing.
2. Inspect network traffic during those flows and confirm no personal data,
   telemetry or identifiers leave the device.
3. Restore a backup into a clean installation on a replacement device and
   confirm avatar, history, language and XP arrive intact.
4. Test storage-full and interrupted-write cases, including a write that fails
   midway, and confirm the previous state is intact.
5. Verify native system backup and restore on both platforms.
6. Check reduced motion, screen-reader labels, text scaling, contrast and touch
   targets in all four themes.
7. Confirm reminders appear in the selected language and never duplicate when
   the language or time changes.
8. Have the Danish strings reviewed by a fluent speaker, including the backup
   and privacy wording.
