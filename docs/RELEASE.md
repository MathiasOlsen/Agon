# Release notes and open items

## Building

```bash
pnpm install
pnpm run icons        # regenerate icons from the pixel mark
pnpm run verify       # types and rules
pnpm start            # Expo Go or a development build
```

Agon targets iOS and Android from one codebase, with local storage, local
notifications and the manual encrypted backup. Verify on real devices before
release: a toolchain that builds is not proof that restore, backup or reminders
behave.

## Platform configuration

- Android: `allowBackup` is on, and the app's private database is the only thing
  worth backing up. Caches and generated artwork are excluded.
- iOS: iCloud Backup can include the app's own data depending on system and user
  settings. The app never claims a backup completed without a signal from the
  system, and shows instructions instead of a status it cannot verify.
- Notifications: reminders are scheduled locally, use generic lock-screen
  wording, and are never sourced from a server.

## Checklist before a store submission

1. Have the starter strength content reviewed by a qualified fitness
   professional, or remove those movements and leave sessions to the person.
2. Have the Danish strings reviewed by a fluent speaker.
3. Decide the display and body fonts and bundle them with their licences. The
   app currently uses platform fonts with a condensed display treatment, which
   is a deliberate placeholder rather than the final typographic decision.
4. Confirm the privacy statements against the actual hosting arrangements.
5. Re-check the platform backup documentation in the handoff's reference list.

## Known gaps

- **Sprite frame size.** The handoff suggests a 64×64 production frame. The
  shipped character is a 32×32 grid drawn from parameters, always displayed at
  an integer scale. A production sprite sheet can replace the renderer without
  touching the rules: the interface asks `buildCharacter` for a grid and does
  not care where the pixels come from.
- **Animation.** Moods are static poses. The handoff's suggested loops (idle,
  sleepy, stretch, celebrate, radiant) are not implemented.
- **Cross-platform purchase.** The single-purchase commitment is a product
  requirement, but the entitlement mechanism that honours it across App Store
  and Play is not implemented. It must not require a second purchase, and it
  must stay separate from fitness data.
- **Accessible alternative for step goals.** The person chooses steps or minutes
  when the goal is created, rather than the app converting between them.
- **Titles and badges.** Monthly and yearly completions are listed on the avatar
  screen, but there is no separate catalogue of named titles yet.
