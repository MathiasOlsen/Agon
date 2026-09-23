/**
 * Domain types shared by the pure rules, the data layer and the interface.
 *
 * Nothing in `src/core` may import React Native: these modules are the rules of
 * the app and are exercised in Node by the test suite.
 */

/** Local calendar date, `YYYY-MM-DD`, interpreted in the user's time zone. */
export type IsoDate = string;

/** Absolute instant, ISO 8601 in UTC. */
export type IsoInstant = string;

/** IANA time zone identifier, for example `Europe/Copenhagen`. */
export type TimeZone = string;

export type PeriodKind = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ThemeId = 'moss' | 'teal' | 'ink' | 'clay';

export type Locale = 'en' | 'da';

/** 1 = Monday, 7 = Sunday. Matches the calendar's own numbering. */
export type WeekStart = 1 | 7;

export type LoadUnit = 'kg' | 'lb';

export type DistanceUnit = 'km' | 'mi';

export type Mood = 'sleepy' | 'warming' | 'ready' | 'energetic' | 'radiant';

export type SkinTone = 'sand' | 'honey' | 'umber' | 'espresso';

export type HairStyle = 'coils' | 'waves' | 'crop' | 'braids' | 'puff';

export type Outfit = 'tee' | 'tank' | 'hoodie' | 'jacket';

export type QuestKind = 'main' | 'supporting';

export type QuestStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'archived_incomplete';

/**
 * How a quest measures progress. Every value is derived from canonical records:
 * the plan, the activity events, or an explicit check-off.
 */
export type Measurement =
  | 'planned_sessions'
  | 'sessions'
  | 'reps'
  | 'seconds'
  | 'minutes'
  | 'steps'
  | 'distance_km'
  | 'checkoff';

/** What kind of real-world activity an event records. */
export type ActivityKind =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'movement'
  | 'recovery';

export type Modality =
  | 'strength'
  | 'walk'
  | 'run'
  | 'ride'
  | 'swim'
  | 'class'
  | 'mobility'
  | 'sport'
  | 'other';

export type SessionStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'shortened'
  | 'rescheduled'
  | 'missed'
  | 'recovery';

export type RewardKind = 'quest_completion' | 'daily_bonus';

export type Appearance = {
  skin: SkinTone;
  hair: HairStyle;
  outfit: Outfit;
};

export type Reminders = {
  enabled: boolean;
  /** Local hour of day, 0–23. */
  hour: number;
  /** Local minute of hour, 0–59. */
  minute: number;
  /** Only notify on days that carry a planned session. */
  plannedDaysOnly: boolean;
};

export type Preferences = {
  onboarded: boolean;
  locale: Locale;
  theme: ThemeId;
  nickname: string;
  appearance: Appearance;
  weekStart: WeekStart;
  loadUnit: LoadUnit;
  distanceUnit: DistanceUnit;
  timeZone: TimeZone;
  reduceMotion: boolean;
  reminders: Reminders;
  /** Inclusive local date range in which mood and streaks are frozen. */
  pausedFrom: IsoDate | null;
  pausedTo: IsoDate | null;
  /** Local date the plan should start generating quests from. */
  planStartDate: IsoDate;
};

export type QuestTemplate = {
  id: string;
  catalogueKey: string;
  periodKind: PeriodKind;
  kind: QuestKind;
  measure: Measurement;
  /** Canonical target in `measure` units. */
  target: number;
  xp: number;
  /** Only count activities of these kinds, when the measurement is activity. */
  activityKinds: ActivityKind[];
  /** Acceptable alternatives to a distance or step target, e.g. minutes. */
  accessibleAlternative: Measurement | null;
  revision: number;
  active: boolean;
};

export type QuestInstance = {
  id: string;
  templateId: string;
  templateRevision: number;
  catalogueKey: string;
  periodKind: PeriodKind;
  /** Local start date of the period, or its month/year key. See `periods.ts`. */
  periodKey: string;
  startDate: IsoDate;
  endDate: IsoDate;
  kind: QuestKind;
  measure: Measurement;
  target: number;
  xp: number;
  activityKinds: ActivityKind[];
  accessibleAlternative: Measurement | null;
  status: QuestStatus;
  /** Clamped progress in `measure` units, derived from canonical records. */
  progress: number;
  completedAt: IsoInstant | null;
  celebrationAcknowledged: boolean;
  createdAt: IsoInstant;
};

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  /** Quantity in the unit implied by `kind` and `measure`. */
  measure: Measurement;
  quantity: number;
  occurredAt: IsoInstant;
  localDate: IsoDate;
  timeZone: TimeZone;
  /** Manual entry is the only MVP source. */
  source: 'manual';
  /**
   * Set when the event was produced by finishing a workout, so a session can be
   * removed or corrected without hunting through unrelated events.
   */
  sourceId: string | null;
  /** Incremented on every correction so imports cannot overwrite newer edits. */
  revision: number;
  deletedAt: IsoInstant | null;
  note: string;
};

export type RewardEvent = {
  /** Stable unique key, which is what makes rewards idempotent. */
  id: string;
  kind: RewardKind;
  instanceId: string | null;
  localDate: IsoDate;
  deltaXp: number;
  grantedAt: IsoInstant;
  /** Set when a correction invalidates the reward; the ledger keeps history. */
  reversedAt: IsoInstant | null;
  reversalReason: string | null;
};

export type ScheduledSession = {
  id: string;
  /** Null when the user added an ad-hoc session. */
  templateId: string | null;
  titleKey: string;
  modality: Modality;
  localDate: IsoDate;
  status: SessionStatus;
  revision: number;
  /** Session that satisfied this plan entry, once it exists. */
  workoutSessionId: string | null;
  /** Set when the entry is moved, keeping its identity. */
  rescheduledFrom: IsoDate | null;
  createdAt: IsoInstant;
};

export type TemplateExercise = {
  exerciseId: string;
  sets: number;
  /** Repetitions per set, or null when the component is timed. */
  reps: number | null;
  /** Seconds per set, for holds and warm-ups. */
  durationSec: number | null;
  loadKg: number | null;
  /** What the component needs: nothing, or a tool the person must have. */
  tool: Tool;
  /** What to do instead when the tool or the movement is not available. */
  alternativeExerciseId: string | null;
};

export type Tool = 'none' | 'dumbbell' | 'barbell' | 'band' | 'machine';

export type WorkoutTemplate = {
  id: string;
  titleKey: string;
  /** Set for a session the person named themselves; null for starter bundles. */
  title: string | null;
  modality: Modality;
  exercises: TemplateExercise[];
  /** Which starter bundle this is, or null for a session the person wrote. */
  bundleKey: string | null;
  /** False once the person has edited it into their own session. */
  isStarter: boolean;
  /** Estimated duration in minutes, used for the day's plan summary. */
  estimatedMinutes: number;
  revision: number;
};

export type WorkoutSessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type WorkoutSession = {
  id: string;
  scheduledSessionId: string | null;
  modality: Modality;
  status: WorkoutSessionStatus;
  startedAt: IsoInstant;
  endedAt: IsoInstant | null;
  /** Reps and loads are frozen at start so later template edits cannot rewrite history. */
  exercises: TemplateExercise[];
};

export type SetLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  /** Zero-based position within the exercise. */
  setIndex: number;
  reps: number;
  loadKg: number | null;
  completed: boolean;
  recordedAt: IsoInstant;
};

export type CardioLog = {
  id: string;
  sessionId: string;
  modality: Modality;
  durationSec: number;
  distanceKm: number | null;
  /** Perceived effort, 1–10, optional. */
  effort: number | null;
};

export type BackupMetadata = {
  lastExportedAt: IsoInstant | null;
  formatVersion: number;
  lastRestoredAt: IsoInstant | null;
};

/**
 * One entry in the user's weekly plan. The plan is the source of the quest
 * targets: Agon never asks for more exercise than the person scheduled.
 */
export type PlanSlot = {
  id: string;
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  modality: Modality;
  kind: ActivityKind;
  titleKey: string;
  templateId: string | null;
  /** A recovery entry is part of the plan and needs no exercise. */
  isRecovery: boolean;
};

/** Everything the rules need, loaded from storage in one snapshot. */
export type AgonState = {
  preferences: Preferences;
  planSlots: PlanSlot[];
  questTemplates: QuestTemplate[];
  questInstances: QuestInstance[];
  activityEvents: ActivityEvent[];
  rewardEvents: RewardEvent[];
  scheduledSessions: ScheduledSession[];
  workoutTemplates: WorkoutTemplate[];
  workoutSessions: WorkoutSession[];
  setLogs: SetLog[];
  cardioLogs: CardioLog[];
  backup: BackupMetadata;
};

export type TableName =
  | 'preferences'
  | 'plan_slots'
  | 'quest_templates'
  | 'quest_instances'
  | 'activity_events'
  | 'reward_events'
  | 'scheduled_sessions'
  | 'workout_templates'
  | 'workout_sessions'
  | 'set_logs'
  | 'cardio_logs'
  | 'backup_metadata';

/** A single durable write. Applied inside one transaction, all or nothing. */
export type Op =
  | { kind: 'put'; table: TableName; record: Record<string, unknown> }
  | { kind: 'delete'; table: TableName; id: string };

export type Mutation = {
  state: AgonState;
  ops: Op[];
  /** Rewards granted by this mutation, for the completion feedback. */
  granted: RewardEvent[];
};
