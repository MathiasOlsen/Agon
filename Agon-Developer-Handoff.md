# Agon — developer handoff

Version 1.3 · 22 September 2026 · Product and visual specification

This is a proposed implementation brief, not a completed application. User requirements are distinguished from suggested implementation defaults. Exact tokens and behavior below take precedence over illustrative reference images.

## 1. Product

Agon is a private fitness and habit app built around quests and a small pixel companion. Real-world activity earns XP and develops the companion through 30 permanent levels. Recent quest completion influences its temporary energy and expression. The emotional reward is seeing a little character respond to consistent effort.

The app combines bold athletic typography, clear progress counters, friendly neutral colors and original pixel art. It is welcoming to all genders. Users choose appearance independently of theme; do not map colors, goals or difficulty to gender. Offer masculine, feminine and androgynous styling through hair, skin, clothing and presentation choices without requiring gender information.

The scope is an avatar-based companion, not a playable world. No camps, buildings, exploration map, combat, affiliates, physical prizes or company-hosted social network are required. No medical assessment is implied by avatar condition.

### Confirmed requirements

- Brand: Agon, displayed as AGON in the interface.
- Dailies, Weeklies, Monthlies and Yearlies as fitness goals.
- Strong motivating feedback and pixel-art avatar progression.
- Online operation without tracking users or collecting their personal fitness records.
- Data remains under the user's control; the company must not access it.
- Manual backup in the app; Google/iOS backup support where the platform permits it.

### Agreed launch scope

- Local-first architecture: works while connected and core functions also work without a connection after installation/loading.
- No account or login. Manual progress entry for MVP. Device health integrations are optional later work requiring explicit permission and separate design.
- All four themes available to everyone; Teal & Apricot is the default.
- Thirty permanent levels plus five temporary moods. No death, coffin, medical distress or loss of earned levels from inactivity.
- iOS and Android first, sharing a codebase with native storage and tested platform backup integration. Browser release deferred.
- English and Danish at launch, with reviewed translations and localization infrastructure for further languages.
- Adults, initially beginners and intermediate users seeking general fitness or following their own program.
- Buy once, never buy more: a single purchase includes the complete Agon app, all features, all themes and cosmetics, and future Agon updates/content without additional charges. No subscriptions, in-app purchases, paid packs, ads or paid XP.

## 2. Core loop

Choose manageable quests → do the activity → record progress locally → complete a quest → receive XP → see the avatar react → preview the next transformation.

Show one clear next action. Completion feedback should be short and satisfying: a check, XP count-up, brief avatar celebration and optional haptic feedback. Users can skip animation. A completed quest stays rewarded even if they close the app before viewing its celebration.

## 3. Screens and navigation

Bottom navigation: Today, Quests, Avatar, Profile. Backup and privacy settings live inside Profile.

| Screen | Content and behavior |
| --- | --- |
| First launch | Explain local data and backup, select avatar and theme, choose activity preferences and manageable goals. Nickname optional. Do not request email, date of birth, weight or location. Notification permission is optional and requested only when enabling reminders. |
| Today | Avatar, level, XP to next level, temporary mood, daily completion count, next recommended quest, recent activity and quick logging. No unrelated health statistics unless the user has explicitly added those tracking features. |
| Quest board | Four period tabs, clear progress and XP on each card, active quests first, completed below. Create/edit goals, filter archived periods and inspect future milestones. |
| Quest details | Plain-language objective, unit, period, target, current progress, XP, manual add/edit log controls and completion feedback. Explain precisely what counts. |
| Avatar | Large character, customization, permanent level, mood explanation, six appearance tiers, next level preview and earned titles/badges. No store. |
| History | Calendar/list of locally recorded activities and earned XP; correct or delete entries. Accessible from Today/Profile. |
| Profile | Appearance, theme, reduced motion, reminders, week start, time zone, recovery mode, backup/import/export, local deletion and plain-language privacy information. |
| Your data | Create encrypted backup, restore file, optional readable export, backup explanation, last manual export timestamp and platform backup instructions. Never invent cloud backup status. |

Empty state: invite the user to add one quest. Offline state: continue local work and do not show an unnecessary blocking banner. Storage failure: keep the input visible, explain it was not saved, and offer retry/export where possible. Permission denial: manual entry remains available.

## 4. Quest model and rules

| Period | Purpose | Example | Proposed reward |
| --- | --- | --- | --- |
| Daily | Execute the plan | Complete today's planned strength OR cardio session | 200 XP, equal across modalities |
| Daily supporting | Optional habit | User-chosen movement or mobility goal | 50 XP, at most two rewarded supporting quests/day |
| Weekly | Follow a balanced routine | Complete the personally scheduled sessions | 600 XP for the main weekly goal |
| Monthly | Review a block | Complete the planned block review, regardless of performance improvement | 2,000 XP for the main monthly milestone |
| Yearly | Sustain a meaningful goal | Reach a user-selected annual milestone | 10,000 XP for the main yearly goal |

Reward quantities remain tuning defaults. Targets come from the user's plan, not universal workout counts or a required three-quest day. Show one main daily action and up to two optional supporting quests. Planned recovery preserves mood/streak without requiring exercise; it is not an extra workout quest. Freeze each instance's plan revision, target and reward, while supporting explicit current-plan revisions as described below. Do not give unlimited XP for more exercise, heavier weights, calorie burn or creating duplicate quests. Other milestone achievements can award recognition without further XP. No universal 180-workout annual target.

- Units: steps, minutes, workout count, distinct active days and simple check-off.
- Store activity events once. Related daily/weekly/monthly/yearly goals may intentionally count the same event, each awarding its own quest reward once. Never count one event twice within a goal.
- States: not started, in progress, completed, archived incomplete. Completed progress bars are 100%; active bars equal clamped progress/target. Label status with text/icons, not color alone.
- Persist XP automatically when completion is committed. A visible “Claim XP” control acknowledges the already-earned reward and plays feedback; it must not be a second XP grant. An acknowledgement flag prevents repeated celebration after reopening.
- Daily bonus: +50 XP once for completing the planned main action on a training day. Optional supporting quests are not required. No empty-plan bonus or additional reward from repeated plan edits. A recovery day preserves continuity without requiring a check-in or exercise.
- An expired incomplete quest earns no completion bonus. Keep recorded activity; never erase it at reset. Carry incomplete reward acknowledgements into history.
- New periods create new instances, not destructive resets. Use durable local IDs for activities, instances and reward events. Repeated taps, app restarts, import retries and clock rollback must not duplicate rewards.
- Store UTC timestamps plus the event's local date and IANA time zone. Calendar boundaries respect daylight saving time. Week/time-zone changes take effect for future instances; completed history is not silently moved.
- Goal edits apply to future periods by default. Current-period changes require a preview. Backdated corrections update affected totals transactionally; if they invalidate completion, reverse the specific earned event rather than silently retaining incorrect XP. Explain any resulting level change. This is correction, not inactivity punishment.
- Do not add GPS, server anti-cheat or identity verification. This is personal progress, not a competition.

## 5. Avatar progression

Permanent level represents earned XP, not body size or medical health. Stage art should communicate confidence, posture, clothing detail, motion and eventually fantasy energy. Keep all bodies friendly and neutral; avoid equating thinness with success.

Proposed level curve: reaching level n requires cumulative XP = 100 × (n − 1) × (n + 2), for n from 1 through 30. Level 1 starts at 0; level 30 at 92,800. Display XP earned within the current interval and the XP needed for the next level. All screenshot XP values are illustrative and must be replaced by computed values. After level 30, continue recording lifetime XP without an empty next-level meter.

| Levels | Main appearance tier |
| --- | --- |
| 1–5 | Beginner: simple clothes, small confident idle movements |
| 6–10 | Finding rhythm: upright posture, brighter expression |
| 11–15 | Athletic: more energetic stance and outfit details |
| 16–20 | Heroic: bolder pose and small spark effects |
| 21–25 | Radiant: rising hair and restrained aura |
| 26–30 | Ascendant: original golden spiky hair, levitation and dramatic pixel aura |

Create original artwork rather than copying a named anime character, costume or logo. Thirty levels do not require thirty completely separate animated bodies: six base tiers, small level overlays and five shared mood/pose families are a proposed production shortcut. Animation and customization still require asset work.

### Temporary condition — proposed local calculation

Use the last seven eligible completed training days within the last 14 calendar days. Here “completed day” means the day has ended, not that its workout succeeded. Daily score = completed main planned actions / main planned actions, capped at 1; optional habits do not affect it. Today can improve the score when its main action is completed, but must not lower it before the day ends. Ignore future days, pre-onboarding days, unplanned days, scheduled recovery and paused days. Recovery/pause preserves the last mood rather than aging successful days out; with no prior eligible history, display Ready. This calculation is a proposed tuning default; test it with sparse schedules.

| Mean completion | Mood | Pose |
| --- | --- | --- |
| Below 20% | Sleepy | Yawn or rest on a cushion |
| 20–39% | Warming up | Gentle stretch |
| 40–59% | Ready | Upright idle |
| 60–79% | Energetic | Bounce or fist pump |
| 80–100% | Radiant | Bright expression and small sparkles |

This is a game response to recorded quests, not inferred health. Unlogged exercise is unknown. Include “Based on your logged quests” in the mood explanation. All tiers remain recognizable in all moods. Pause mode freezes mood/streak evaluation; recovery activities can count toward the plan. A missed day does not reduce permanent XP or destroy the character.

### Pixel art production

Suggested base frame: 64×64 pixels with consistent feet anchor and transparent background. Display at integer multiples with nearest-neighbor scaling. Keep silhouette readable on every theme. Use modular hair, clothing and skin palettes where feasible. Suggested loops: idle, sleepy, stretch, celebrate, radiant; 4–8 frames per loop at roughly 6–10 fps. Reduced motion uses still frames. Concept images are not validated production sprite sheets.

## 6. Motivation

Use visible near-completion progress, next-form previews, small deterministic daily bonuses, local streaks, milestone badges and optional reminder windows. Message examples: “1,500 steps to finish”, “Your next form is getting closer”, “Welcome back. Start small.”

No guilt messages, loss of cosmetics, random paid rewards or escalating exercise requests. Show completion/rest as a valid endpoint. Schedule reminders on-device where supported; use generic lock-screen wording by default. No remote engagement campaigns or server-side personalization.

## 7. Exact theme tokens

These are proposed implementation values, not sampled pixels from the generated references. Accent colors are decorative unless the text pairing is explicitly specified. Themes never imply gender.

| Token | Moss & Oat | Teal & Apricot | Ink & Lilac | Clay & Sky |
| --- | --- | --- | --- | --- |
| background | #F5F1E7 | #F7F7F2 | #20232D | #F7F2EC |
| surface | #FFFCF5 | #FFFFFF | #303541 | #FFFCF8 |
| text | #252B27 | #202B2B | #F5F2EA | #292B30 |
| textMuted | #566052 | #526361 | #C0C5D0 | #62616A |
| primary | #546D50 | #185B59 | #C7BBEE | #AC503C |
| onPrimary | #FFFFFF | #FFFFFF | #20232D | #FFFFFF |
| accent | #D9B65B | #F1AC80 | #A9DCC8 | #B7D3E5 |
| onAccent | #252B27 | #202B2B | #20232D | #292B30 |
| successSurface | #E3EBDD | #E1F0E9 | #283F3B | #E5EFF6 |
| successText | #334E32 | #185B59 | #A9DCC8 | #234D63 |
| border | #778270 | #718984 | #939CAF | #8C7D76 |
| progressTrack | #DBDDD2 | #DCE5E1 | #4B5363 | #E7DDD6 |
| danger | #A33232 | #A33232 | #FFB4AB | #A33232 |
| focus | #252B27 | #202B2B | #F5F2EA | #292B30 |

Use primary for active tabs, progress and primary buttons; onPrimary for their text. Use accent with onAccent for XP chips. A success surface must carry a check and explicit Completed label. Danger is reserved for errors/deletion, not missed quests.

### Quest treatments

- Moss & Oat: fine outlined cards, square stamped markers, segmented bars and sage completed surfaces.
- Teal & Apricot: softly rounded cards, colored left rails, smooth bars, peach XP chips and teal buttons.
- Ink & Lilac: stepped pixel corners, flat slate surfaces, lilac actions and mint completion. No neon bloom.
- Clay & Sky: ticket-like cards with shallow side notches, numbered markers, strong dividers and sky-blue completed surfaces.

Keep information order and interactions identical across themes. Styling must not change what a quest means. Period labels should always be readable words, not inferred from rarity colors.

### Layout and accessibility

Use a 4-point spacing scale: 4, 8, 12, 16, 24, 32. Mobile side padding 16–20; card padding 16; gaps 12–16. Main headings 32–40, section titles 20–24, body 16, secondary labels 14. Use a licensed condensed display font and a clean sans-serif, bundled with the app; reserve pixel fonts for short optional display labels. Avoid all-caps paragraphs.

Minimum touch targets 48×48 logical pixels; support text enlargement without truncating objectives, keyboard navigation and screen readers. Verify rendered text contrast at 4.5:1 for normal text and 3:1 for large text; verify controls/focus at 3:1. Tokens are starting values, not proof of accessibility. Provide text equivalents for bars and sprites. Use reduced motion and do not flash aura effects. On wide screens use a constrained content column or two-column dashboard, not a stretched phone UI.

## 8. Data ownership, online behavior and architecture

The privacy requirement is architectural: personal records are processed on the user's device, not merely hidden in a company database. No Agon account, personal-data API, analytics SDK, advertising identifier, tracking pixel, session replay, fingerprinting or automatic crash-report upload. No sale, model training or profiling of personal data.

Bundle assets and fonts. If updates require hosting, request only public app assets over HTTPS. Do not put activity, identifiers, personal settings or history in URLs, headers, error reports or telemetry. Lock dependencies and review every release for unexpected network calls. Do not ship remote third-party scripts. Local IDs must never become network identifiers.

Online hosting necessarily exposes connection metadata such as an IP address to infrastructure while serving requests. Do not promise that no service ever sees any data. Disable access logs where feasible, avoid persistent identifiers and behavioral correlation, minimize necessary security-log retention, and document the hosting provider's handling. The company must not receive personal fitness records. Cloud backups selected by the user involve Apple/Google or another chosen provider, not Agon.

| Deployment | Local storage | Backup consequence |
| --- | --- | --- |
| Browser/PWA | IndexedDB with persistence request and storage-error handling; cache static shell | Manual encrypted export is mandatory. Do not promise automatic iCloud/Google device backup for browser storage. Browser deletion/eviction can remove records. |
| Native iOS/Android | Local transactional database in app-private storage; platform protection | Configure and test native system backup rules. Manual export remains available. |

The agreed launch is iOS and Android with native/mobile packaging and tested storage integration. The browser row above documents deferred scope only. A wrapper alone does not prove correct backup or restore behavior. No multi-device sync in MVP: importing a backup is not continuous synchronization.

Native at-rest encryption and its key strategy must be tested together with restore. A hardware-bound key may not be available on a replacement device; do not back up unusable ciphertext. Browser-local storage must not be marketed as equivalent to OS-encrypted storage. Protect the web runtime through dependency control, strict content policy and no third-party code. Local-only design is not a claim of immunity to a compromised device.

## 9. Backup, export and deletion

### Manual encrypted backup — required everywhere

Create a versioned .agon backup containing settings, avatar configuration, quest templates/instances, activity events, reward ledger, history, custom content and relevant timestamps. Do not include bundled sprites/fonts or device permission tokens.

Encrypt before writing/sharing using a vetted authenticated-encryption implementation. Store format version, KDF parameters, random salt and nonce in the envelope, never the password or encryption key. Use a reviewed password-based key derivation implementation; do not invent cryptography. Ask the user to confirm the backup passphrase and explain that Agon cannot recover it. Offer an explicit separate unencrypted readable JSON export for portability with a clear confirmation.

Save through the system file/share UI; the user chooses local storage or their own cloud location. Show the time a backup file was successfully created, not a claim that the destination cloud finished uploading it. No backup passes through an Agon server.

Restore: select file → enter passphrase → validate authentication, schema/version and bounds → preview snapshot date and counts → offer backup of current data → explicitly confirm replacement → replace transactionally. MVP restore replaces rather than merges. Wrong password, corrupt archive, unknown newer schema or insufficient space leaves existing data untouched. Never execute imported content. Rebuild derived counters and migrate supported older formats. Test fresh-device restoration.

### OS backup

Android Auto Backup is platform-managed, conditional and subject to quota/rules; it is not an immediate in-app sync action. Include only intended small state files, exclude caches/assets, and test restore on supported OS versions. iCloud Backup can include eligible native app data depending on system/user settings. It is distinct from an app-level iCloud Drive or CloudKit integration. Do not display “backed up just now” without an authoritative API signal. Where direct settings navigation is unavailable, display instructions instead.

For especially sensitive backup requirements, developer must resolve system-backup encryption and portable key handling before release. Do not assume cloud-provider backups are equivalent to Agon's passphrase-encrypted manual export.

### Delete

“Delete local data” clears the local database, personal caches, reminders and local secrets after confirmation, offering export first. Explain that copies previously exported or retained by a platform backup remain under the user's/provider's control. Agon cannot delete arbitrary files in their Drive/iCloud. No company recovery copy exists.

## 10. Local data model

Use schema versions and transactional migrations. Suggested entities:

- Preferences: theme, appearance IDs, optional nickname, time zone, week start, reminders, accessibility, pause windows.
- QuestTemplate: local ID, period, unit, target, XP and revision.
- QuestInstance: template revision snapshot, period start/end, local period key, progress, status, completion time, celebrationAcknowledged.
- ActivityEvent: local UUID, unit, quantity, occurrence timestamp/local date/time zone, source=manual, edit revision, deletion status.
- RewardEvent: unique quest/bonus key, delta XP, timestamp, reversal reference where applicable.
- AvatarState: cosmetic selections and earned unlock IDs; derive level from reward ledger.
- BackupMetadata: last successful local export time and format version; never store passphrase.

Do not store duplicate raw activity merely to support different goal periods. Keep actions atomic: event write, affected quest updates and reward events either all succeed or all roll back. Derive totals from canonical records so restore/recompute yields the same result.

## 11. MVP delivery and verification

MVP: onboarding, four themes, four quest periods, manual logs, local quest engine, avatar tiers/moods, history corrections, optional local reminders, encrypted export/import, local deletion and online/offline operation appropriate to chosen platform. Native OS backup is a launch requirement on both selected platforms and must be verified, not assumed. English/Danish localization, workout logging, interrupted-session recovery, accessible interaction and backup migration compatibility are also launch requirements. Optional future scope: on-device health-data imports, more cosmetics. No social feed or server profiles.

Acceptance checks:

1. Create/log/complete quests with network disconnected after initial load; restart without data loss.
2. Inspect network traffic during onboarding, logging, export, completion and reminders. No personal data, telemetry or identifiers leave the device.
3. Double tap, restart and re-import without duplicate XP. Completed card fills exactly 100%; daily bonus uses the actual frozen plan count.
4. Exercise calendar boundaries, DST, time-zone changes, clock rollback, leap years and historical edits.
5. Restore into a clean installation, including avatar, history and XP. Wrong password/corrupt file does not mutate state.
6. Test storage-full cases and interrupted writes. Test native cloud/device restore and key recoverability on real supported platforms.
7. Reduced motion, screen reader labels, text scaling, contrast and touch targets work in all four themes.
8. Deletion removes local personal data and schedules; exported copies are accurately explained.
9. Pauses/rest do not destroy permanent progress; the mood explanation does not claim a real health diagnosis.
10. Dependency/hosting review verifies the no-tracking promise beyond application code.

## 12. Reference images and precedence

Two AGON concept boards accompany this handoff: “AGON / 01 — Fitness Flows” and “AGON / 02 — Avatar & Personal Settings”. Both were produced with the built-in image-generation tool. They are illustrative: mood, composition and general direction only. They are not screenshots of agreed behaviour, not sampled pixel or token values, and not validated sprite or layout assets. This document governs. Where a board and this text disagree, the text wins, and every number printed on a board is a placeholder to be replaced by a computed value.

What the boards show, for orientation. Board 01 covers Today with level, XP and the day's plan, an in-progress strength session with set, rep and load rows plus a rest timer, the quest board with its four period tabs and XP chips, and a completion screen with earned XP and updated quest counters. Board 02 covers the avatar hub with level, mood and next-form previews, customization by skin tone, hair and outfit, preferences for language, units, week start and theme, and the data screen with encrypted export, restore, device-backup instructions and local deletion.

Known illustration discrepancies to ignore:

- Placeholder XP. The boards read “LEVEL 08 · 720 / 1,000 XP”. The curve in section 5 is authoritative: level 8 begins at 7,000 cumulative XP and level 9 at 8,800, so the meter at level 8 shows 7,000 earned with 1,800 remaining. Compute every value; never implement a number printed on a board.
- Two rewarded weeklies. Both weekly cards carry “+600 XP”. Only the main weekly goal awards XP; supporting weekly views provide recognition, not a second grant (section 4).
- Bonus and recovery wording. An optional supporting quest such as a mobility reset at about +50 XP is correct, but the daily bonus follows the frozen plan count, supporting rewards are capped, and a scheduled recovery day preserves continuity without a check-in or exercise.
- Unrelated statistics. Sleep, water and similar tiles on the boards are not MVP scope. The mood shown is the local calculation in section 5 and must always be described as based on logged quests.
- Navigation detail. The gear drawn on Today is illustrative; appearance, backup and privacy settings live inside Profile (section 3).
- Tier previews. Showing three of the six appearance tiers under “Your next forms” is a composition choice; the tier table in section 5 defines the set.
- Themes. The four palettes shown are direction; the tokens in section 7 are the implementation values, not pixels sampled from the images.

Prompt briefs used for the boards: (1) Four equal AGON fitness screens in Teal & Apricot — Today with level and XP, an in-progress strength session with set, rep and load rows plus a rest timer, the quest board with four period tabs and XP chips, and a completion screen with its XP banner. (2) Four equal AGON personal screens — an avatar hub with level, mood and next-form previews, customization by skin tone, hair and outfit, preferences for language, units, week start and theme, and a data screen with encrypted backup, restore, device-backup instructions and local deletion. Athletic condensed typography, neutral and friendly pixel avatars, no world-building, no company data collection, and no borrowed characters, costumes or logos.

## 13. Platform references

Checked 22 September 2026. Re-check implementation details for the selected deployment targets before release.

- Android Auto Backup: https://developer.android.com/identity/data/autobackup — system-managed app backup, rules and limits.
- Apple iCloud Backup contents: https://support.apple.com/en-us/108770 — eligible app data and distinction from data already synced to iCloud.
- MDN storage quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria — browser-local persistence limits.

Resolved platform decision: iOS and Android first, shared codebase and tested native integrations; defer browser release. Specific framework and minimum supported OS versions remain implementation choices to validate before development.


## 14. Fitness system and workout experience

Agon is a useful fitness planner and workout log with a pixel companion. Quests are generated from the user's schedule; they do not assign extra exercise merely to earn XP. Launch tracks: General fitness and Follow my own program. A general-fitness plan may balance strength, aerobic activity and recovery. Specialized strength/endurance coaching and automatic health-data imports are deferred.

Onboarding collects experience, goals, available days, equipment, preferred activities and appropriate user-selected targets locally. Explain the adult/general-fitness scope. Avoid mandatory sensitive measurements. A user following their own program can create sessions and exercise templates without accepting an app-generated routine. Starter workout content requires qualified fitness review before publication; this brief does not specify a clinical or individualized training prescription.

### Quest catalogue

| Period | Quest | Actual objective | How it fits |
| --- | --- | --- | --- |
| Daily | Build Your Strength | Complete today's saved strength session | Scheduled strength day |
| Daily | Find Your Pace | Complete the planned walk, run, ride, swim or other aerobic session | Scheduled cardio day |
| Daily optional | Keep Moving | Reach the user's chosen movement target | Optional habit, with accessible alternatives to steps |
| Daily optional | A Little Reset | Complete a chosen mobility routine | Supporting activity, never forced on a rest day |
| Daily | Make It Happen | Complete an explicitly shortened version of the planned session | Time-limited alternative, replaces the original instance |
| Recovery | Respect the Rest | Follow today's recovery schedule | No exercise/check-in required for avatar protection |
| Weekly | Show Up | Complete this week's personally planned sessions | Primary consistency quest |
| Weekly | Strength Foundation | Complete scheduled strength sessions | Focus-specific progress, not extra sessions |
| Weekly | Build Your Engine | Accumulate chosen aerobic minutes | Aggregates eligible activity |
| Weekly | Set Up Next Week | Review availability and schedule | Optional planning, no required exercise |
| Monthly | Find Your Rhythm | Reach a chosen planned-session completion target | Example: 10 of 12 sessions, not a universal rule |
| Monthly | Finish the Chapter | Finish/review a training block | Programs keep their own dates |
| Monthly | Notice Your Progress | Review comparable performance or effort records | Reward reviewing, not mandatory improvement |
| Monthly | Make It Fit | Adjust the next block to real availability | User confirms changes |
| Yearly | Keep Showing Up | Reach a chosen session count | Accounts for start date and planned breaks |
| Yearly | Your First Finish Line | Complete a chosen event goal | Optional user-selected goal, no race requirement |
| Yearly | Build Your Foundation | Complete chosen training blocks | Long-term consistency |
| Yearly | A Year of Movement | Reach a chosen activity-specific distance | Keep disciplines/units distinct |

Choose one main weekly goal and up to two supporting views; avoid presenting the entire catalogue as obligations. One activity can advance linked period goals, but is logged only once. Supporting goals beyond the reward caps provide recognition rather than XP multiplication.

Daily actions answer “What today?”; weeklies answer “Did I follow my routine?”; monthlies answer “Is the plan working?”; yearlies answer “What am I building toward?”. Playful names always include a plain-language objective and clear completion criteria.

### Example schedule and aggregation

| Day | Plan |
| --- | --- |
| Monday | Strength A |
| Tuesday | Optional enjoyable movement |
| Wednesday | Planned aerobic session |
| Thursday | Recovery |
| Friday | Strength B |
| Saturday | Optional activity |
| Sunday | Rest; optional planning |

Monday's session advances its daily quest, weekly scheduled-session count, monthly block progress and chosen annual session count. It remains one canonical WorkoutSession. Optional Saturday activity can appear in history without becoming an unlimited bonus source. The schedule is an illustration, not a universal exercise prescription.

### Workout logging requirements

- Strength: saved exercises, sets, reps, load, load unit, completion flags, previous comparable values, optional effort/notes and rest timer. Support bodyweight movements without inventing a load.
- Cardio: modality, duration, optional distance and perceived effort. Do not require GPS, device sensors, calories or heart-rate data.
- Save completed sets and draft edits promptly and transactionally. Resume interrupted workouts after process termination, reboot or network loss. Derive elapsed timers from persisted timestamps; do not rely solely on a background ticking counter.
- Offer Start, Shorten, Reschedule and Recovery actions. Preview how changes affect the current instance and linked goals. Keep revision history locally; do not leave misleading overdue tasks after a valid reschedule.
- A shortened session replaces its original, not a second reward opportunity. Rescheduling carries the session identity; recalculates affected period membership; already-earned reward IDs remain unique.
- Store missed, completed, shortened, rescheduled and recovery states distinctly. Display skipped/missed without shame or medical interpretations. Backdated data corrections can reverse incorrect rewards; missed days alone cannot.
- Stable exercise IDs distinguish equipment variants and substitutions. Preserve the original session exercise snapshot. Do not combine incomparable lifts into one personal-record chart.
- Calendar months do not reset a four-/six-week program. Maintain separate program start/end dates, block/week indices and calendar quest instances.
- History includes sessions, exercise trends and plan completion. Personal records are optional celebrations, never obligations to lift more.
- Accessible activities must not require conversion into artificial steps. Let users choose time, sessions or activity-specific distance.

### Additional local entities

Program (revision, start/end, blocks); WorkoutTemplate (exercise sequence and targets); ScheduledSession (stable identity, scheduled local date, template snapshot, revisions); WorkoutSession (status, timestamps, modality); ExerciseDefinition (stable ID, translation key, equipment variant); SetLog (exercise snapshot, reps, canonical load, completion); CardioLog (duration, canonical distance, effort); PlanRevision (reason and affected instance IDs).

Backups include all these records. Quest calculations use canonical sessions/events; no duplicate raw logging per goal. Performance values are descriptive, not automatic coaching instructions.

## 15. Localization and regional settings — launch requirement

English and Danish ship at launch. Detect device language, allow an in-app override, fall back to English for unsupported/missing strings, and persist the chosen locale locally. Both languages require fluent human review, including fitness terminology, safety instructions and backup wording.

- Externalize every user-visible string: navigation, quests, exercise instructions, avatar messages, errors, notifications, accessibility, dates in export previews and initial purchase/onboarding explanations.
- Stable translation keys and content IDs must be separate from display text. Switching languages never changes identity, XP, records or quest completion. Preserve user-written names and notes verbatim.
- Use complete messages with named arguments and plural forms. Do not concatenate sentence fragments. Do not derive storage keys from translated labels.
- No baked-in image text. Pixel art stays language-independent. Bundle fonts supporting Danish characters and future locale requirements, with appropriate licenses.
- Format dates, decimal numbers and times for locale. Language, time zone, first day of week and metric/imperial settings are independent preferences.
- Store canonical units (for example kilograms, meters, seconds) and convert at display/input boundaries with explicit rounding rules. Retain sufficient precision; changing display units repeatedly must not alter stored performance.
- Flexible cards and buttons must accommodate longer text and system text enlargement. Build layouts with logical start/end alignment and direction support for future right-to-left languages. English/Danish launch does not imply full RTL-language translation coverage.
- Notifications should regenerate in the newly selected language without creating duplicate schedules.
- Store templates by content ID and version, not copied translated titles alone. Include custom content in exports and migrate older IDs with explicit mappings.
- Test expanded pseudolocalization, missing-key fallback, Danish characters, decimal-comma input, plural counts, locale switching mid-workout and restore into a device with a different locale. In developer builds missing keys should be discoverable without transmitting user data.

## 16. Launch boundaries, support and commercial model

Initial audience: adults, beginners/intermediate, general fitness or their own program. Do not imply specialist rehabilitation, pediatric programming or universal suitability. Goal suggestions are configurable and reviewed fitness content, not diagnoses. After the initial purchase, ongoing access to logs, backups and export must not require additional payment or a recurring online entitlement check.

Business model: one paid purchase of the complete app. No subscriptions, recurring fees, in-app purchases, premium tiers, cosmetic packs, consumable currency, paid boosts, paid expansions or later upgrade charges. All four themes, avatar options, fitness features and future Agon content/updates are covered by the original purchase. This is a pricing commitment, not a promise of a specific update schedule or indefinite OS support.

Cosmetics can still unlock through earned progress, but never through extra payment. No shop, upsell banners, paywall for new features or purchase requirement to restore avatar condition. Reinstallation and access to existing data must not require a second Agon purchase for an already entitled user. Use platform-supported purchase handling without exposing personal fitness records or requiring an Agon tracking account.

Cross-platform purchase portability is an implementation requirement to resolve before distribution: do not assume Apple and Google automatically share entitlements. Document a privacy-preserving way to honor the single-purchase commitment when changing platforms; any entitlement proof must remain separate from fitness data. Do not silently reinterpret this as requiring another purchase on the second platform. Exact price and portability mechanism remain to be selected; no additional purchase model is authorized.


Content production: original pixel artwork and properly licensed fonts, exercise illustrations and translations. Record attribution/license obligations. Validate all modular avatar combinations and translation layouts. Six tiers times five moods is an asset strategy, not a claim that there is no animation workload.

Private support: users may explicitly create and preview a redacted diagnostic report containing app/schema/OS versions and non-personal error categories. Do not attach their workout database, logs, nickname or identifiers automatically. Let the user choose whether and how to send a report; no automated crash uploads.

App updates must migrate all local entities transactionally and preserve exports from supported older versions. Show a non-destructive unsupported-version message for newer backup formats. Test failed migrations and retain a recoverable local pre-migration state where feasible.

### Additional release acceptance gates

11. English/Danish coverage and human review complete; locale switching leaves all progress unchanged.
12. Metric/imperial round trips preserve canonical records; numeric input respects locale and validates ambiguous separators.
13. Saved workout templates, quick set logging, substitutions, timers and interrupted-session recovery work on both platforms.
14. Rescheduling/shortening across weekly/monthly boundaries neither duplicates XP nor silently changes historical exercise identities.
15. Planned rest, pause and optional habits do not lower mood or break continuity; empty plans do not create unlimited bonuses.
16. A block spanning two calendar months remains intact and aggregates into the correct period views.
17. Restore on a replacement iOS/Android device preserves workouts, avatar, language settings and reward ledger with valid keys.
18. No app account, behavioral analytics or personal workout traffic exists. User-initiated diagnostic reports are previewable and redacted.
19. One purchase unlocks the complete app; no subscription, in-app purchase, paid cosmetic or upgrade path exists. Progression rewards never require money. Offline access and export remain functional after purchase.
20. Verify reinstallation and the chosen cross-platform entitlement approach honor the single-purchase commitment without collecting fitness data.

### Version 1.1 change record

Integrated accepted native-first launch scope, English/Danish localization, adult general-fitness audience, practical workout logging, plan-derived quest catalogue, modality-neutral main rewards, recovery-aware progression, interrupted-session recovery, additional data models, content/support requirements and the then-proposed cosmetic monetization (superseded by version 1.2 below). Replaced obsolete platform-open, three-mandatory-dailies and universal-yearly-target assumptions. Existing concept images remain style references; this specification governs implementation.


### Version 1.2 change record

Replaced the free-core/paid-cosmetics proposal with the user-confirmed “buy once, never buy more” model. All features, cosmetics, themes and future Agon content are included without further charges. Removed future in-app sales scope and added entitlement portability as a distribution design requirement, without assuming cross-store support already exists.

### Version 1.3 change record

Aligned section 12 with the two AGON concept boards supplied with this revision, “AGON / 01 — Fitness Flows” and “AGON / 02 — Avatar & Personal Settings”, replacing the earlier board descriptions and their discrepancy notes. Stated that the boards are illustrative and that this document governs, and recorded the specific board values that must not be implemented: the placeholder level-8 XP figures, the duplicated weekly XP chip, and the non-MVP statistics tiles.
