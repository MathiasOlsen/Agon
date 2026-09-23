# Scope

This is the MVP described in the developer handoff. It is a private fitness and
habit app built around quests and a pixel companion: real activity earns XP,
XP develops the companion through thirty permanent levels, and recent quest
completion feeds a temporary mood.

## In

- Onboarding: local-data explanation, avatar and theme choice, activity
  preferences, a weekly plan, optional reminders.
- Four quest periods — daily, weekly, monthly, yearly — generated from the
  person's own plan.
- Workout logging: strength sets, reps and load with a rest timer; aerobic
  activity by duration, optional distance and effort; interrupted sessions
  resume from stored timestamps.
- Avatar: six appearance tiers across thirty levels, five moods, and cosmetic
  choices that are never tied to theme, goal or difficulty.
- Four themes, English and Danish, history corrections, encrypted backup and
  restore, local deletion, reduced motion.
- A local-first architecture: the app works without a connection once loaded.

## Out

- Accounts, sign-in, server profiles, social feeds.
- Analytics, advertising identifiers, crash uploads, tracking of any kind.
- Subscriptions, in-app purchases, paid cosmetics, advertising.
- GPS, automatic health-data imports, medical or diagnostic claims.
- Browser release (deferred), multi-device sync, and any company-held copy of
  personal records.

## Boundaries of the promise

Agon is for adults doing general fitness or following their own programme. It
does not provide rehabilitation, pediatric or clinical guidance, and nothing in
the app assesses health. Starter strength content is a starting point, not a
prescription, and `docs/RELEASE.md` records that it needs qualified review
before publication.
