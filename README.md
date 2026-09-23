# Agon

A private fitness and habit app built around quests and a small pixel companion.
Real-world activity earns XP and develops the companion through thirty permanent
levels; recent quest completion feeds its temporary energy and expression.

Agon keeps everything on the device. There is no account, no analytics and no
company copy of your fitness records.

## Status

Version 1.0 implementation of the developer handoff in
[`Agon-Developer-Handoff.md`](./Agon-Developer-Handoff.md) (v1.3). The handoff is
the specification of record: where the code and the document disagree, the
document wins, and where the concept boards and the document disagree, the
document wins again.

## What is implemented

- Onboarding: local-data explanation, avatar and theme choice, activity
  preferences, a weekly plan, and optional reminders.
- Four quest periods (daily, weekly, monthly, yearly) generated from the user's
  own plan, with a main goal and up to two optional supporting habits.
- A local quest engine: activity events are stored once, quest progress is
  derived from them, and rewards are granted exactly once per quest instance.
- Workout logging: strength sets and reps with a rest timer, cardio by duration
  and effort, resuming an interrupted session from persisted timestamps.
- Avatar: thirty permanent levels, six appearance tiers, five temporary moods
  computed from the last seven eligible training days.
- Four themes, English and Danish, history corrections, encrypted manual backup
  and restore, and local deletion.

## Working on it

```bash
pnpm install          # or npm install
pnpm run icons        # regenerate the app icons from the pixel mark
pnpm run typecheck    # types across app, core and data layers
pnpm test             # logic tests for the rules in the handoff
pnpm start            # run in Expo Go or a development build
pnpm web              # desktop browser preview
```

`pnpm run verify` runs the type check and the tests together.

## Layout

| Path | Contents |
| --- | --- |
| `app/` | Expo Router routes only. No components or utilities live here. |
| `src/core/` | Pure rules: levels, mood, quest periods, the quest engine, backup crypto. No React Native imports, so it runs in Node under test. |
| `src/data/` | SQLite schema, migrations and repositories. |
| `src/state/` | React bindings: the app store, providers and hooks. |
| `src/ui/` | Shared components, including the pixel sprite renderer. |
| `src/i18n/` | English and Danish strings with a typed lookup. |
| `scripts/` | Icon generation, optional art pipeline, test runner. |
| `docs/` | [Scope](docs/SCOPE.md), [data](docs/DATA.md), [privacy](docs/PRIVACY.md), [testing](docs/TESTING.md) and [release](docs/RELEASE.md) notes. |

## Artwork

The avatar, the interface glyphs and the app icon are drawn from pixel data in
`src/core/pixels/` and rendered with nearest-neighbour scaling, so every look is
original and language-independent. `scripts/generate-art.ts` documents the
optional fal.ai pipeline used for concept artwork; it is not needed to run the
app, and it reads its key from `secrets/fal.env` (git-ignored) rather than from
`.env.local`, which Expo would load and echo into its dev logs.
