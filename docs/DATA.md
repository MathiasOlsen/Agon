# Local data

## Where it lives

One SQLite database in the app's private storage (`agon.db`). Every write goes
through a single transaction, so a mutation either lands completely or not at
all, and a failed write leaves the previous state untouched.

Each logical table stores one JSON document per record. That keeps migrations
cheap and makes the stored shape match the domain model exactly, which matters
more here than relational queries: the volume is one person's own history.

## Records

| Record | Holds |
| --- | --- |
| `preferences` | Theme, locale, units, week start, time zone, appearance, reminders, pause window, plan start |
| `plan_slots` | The weekly plan: weekday, modality, activity kind, whether it is recovery |
| `quest_templates` | Catalogue key, period, measure, target, XP, revision, active |
| `quest_instances` | A frozen target, XP, period range, derived progress and status, acknowledgement |
| `activity_events` | One fact each: kind, measure, quantity, instant, local date, time zone, revision, deletion |
| `reward_events` | The XP ledger: stable key, delta, when granted, when reversed and why |
| `scheduled_sessions` | Dated sessions with a stable identity, status and revision |
| `workout_templates` | Saved exercise sequences |
| `workout_sessions` | A live or finished session with its frozen exercise snapshot |
| `set_logs`, `cardio_logs` | The detail behind a session |
| `backup_metadata` | When a backup file was last created; never the passphrase |

## Rules the storage layer relies on

- **Derived, not duplicated.** Progress, status, level and mood are computed
  from canonical records. Importing a backup and recomputing yields the same
  numbers as the original path did.
- **Keyed rewards.** A reward's identifier is derived from what it pays for
  (`quest:<instance>`, `bonus:<date>`), so repeated taps, restarts, imports and
  clock changes cannot pay twice.
- **Reversal, not erasure.** A correction marks the specific reward reversed and
  keeps the ledger, so the level can be explained rather than silently changed.
- **Canonical units.** Loads are stored in kilograms and distances in
  kilometres; `lb` and `mi` are display conversions performed at the boundary.
- **Local identifiers.** IDs are random and never derived from anything
  personal, so they cannot become network identifiers.
- **Migrations.** `PRAGMA user_version` drives forward-only migrations, and a
  backup that needs a newer schema is refused instead of guessed at.

## Time

Instants are stored in UTC; the event's local date and IANA time zone are stored
beside them. Calendar boundaries are computed from the person's own zone, so
daylight saving never moves a boundary by a day. Week start and time zone
changes apply to future instances; completed history is not silently moved.
