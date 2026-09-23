import { emptyTemplate } from '@/core/content';
import { localDateOf } from '@/core/dates';
import {
  acknowledge,
  checkoff,
  completeWorkout as applyCompleteWorkout,
  correctActivity,
  deleteActivity,
  enableCatalogueEntry,
  logActivity,
  logCardio as applyLogCardio,
  logSet as applyLogSet,
  moodFor,
  recompute,
  rescheduleSession as applyReschedule,
  setPlan as applyPlan,
  setPreferences as applyPreferences,
  shortenSession as applyShorten,
  startWorkout as applyStartWorkout,
  totalXp,
  type RecomputeResult,
} from '@/core/engine';
import type { MoodResult } from '@/core/mood';
import type {
  ActivityEvent,
  AgonState,
  CardioLog,
  Measurement,
  Modality,
  Mood,
  Mutation,
    PlanSlot,
    Preferences,
    TemplateExercise,
  } from '@/core/types';
  import { applyOps, deleteEverything, loadStoredState, replaceEverything } from '@/data/repository';

  import { defaultPreferences, emptyState, newId } from './defaults';

/**
 * The one place the app reads and writes.
 *
 * A mutation is a pure engine function plus a list of writes; the store applies
 * the writes in a single transaction and only then swaps in the new snapshot. If
 * the write fails, the previous snapshot stays exactly as it was, so the screen
 * can honestly say that something was not saved.
 */

export type MutationOutcome = {
  granted: Mutation['granted'];
  completedNow: RecomputeResult['completedNow'];
  reversedNow: RecomputeResult['reversedNow'];
};

export class AgonStore {
  private state: AgonState;
  private readonly listeners = new Set<() => void>();
  /** Remembered so a quiet stretch can carry the last mood instead of guessing. */
  private lastMood: Mood | null = null;

  private constructor(state: AgonState) {
    this.state = state;
  }

  static open(now: string = new Date().toISOString()): AgonStore {
    const stored = loadStoredState();
    const preferences = stored.preferences ?? defaultPreferences(now);
    const base: AgonState = { ...emptyState(preferences), ...stored.collections };
    if (stored.backup) base.backup = stored.backup;
    // Bring the snapshot up to date: new periods, missed sessions, mood window.
    const caughtUp = recompute({ ...base, preferences }, now);
    if (caughtUp.ops.length > 0) applyOps(caughtUp.ops);
    const store = new AgonStore(caughtUp.state);
    if (!stored.preferences) store.persistPreferences(preferences);
    return store;
  }

  getState = (): AgonState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Applies a mutation atomically; a failed write leaves the snapshot alone. */
  mutate(work: (state: AgonState) => Mutation | RecomputeResult): MutationOutcome {
    const result = work(this.state);
    if (result.ops.length > 0) {
      try {
        applyOps(result.ops);
      } catch (error) {
        this.emit();
        throw error;
      }
    }
    this.state = result.state;
    this.emit();
    const recomputed = result as Partial<RecomputeResult>;
    return {
      granted: result.granted ?? [],
      completedNow: recomputed.completedNow ?? [],
      reversedNow: recomputed.reversedNow ?? [],
    };
  }

  /** Catch-up after the app has been closed, or after the clock moved. */
  refresh(now: string = new Date().toISOString()): void {
    this.mutate((state) => recompute(state, now));
  }

  today(now: string = new Date().toISOString()): string {
    return localDateOf(now, this.state.preferences.timeZone);
  }

  xp(): number {
    return totalXp(this.state);
  }

  mood(now: string = new Date().toISOString()): MoodResult {
    const result = moodFor(this.state, now, this.lastMood);
    this.lastMood = result.mood;
    return result;
  }

  logActivity(event: ActivityEvent, now: string): MutationOutcome {
    return this.mutate((state) => logActivity(state, event, now));
  }

  correctActivity(
    eventId: string,
    patch: Partial<Pick<ActivityEvent, 'quantity' | 'measure' | 'kind' | 'localDate' | 'note'>>,
    now: string,
  ): MutationOutcome {
    return this.mutate((state) => correctActivity(state, eventId, patch, now));
  }

  deleteActivity(eventId: string, now: string): MutationOutcome {
    return this.mutate((state) => deleteActivity(state, eventId, now));
  }

  checkoff(instanceId: string, now: string): MutationOutcome {
    return this.mutate((state) => checkoff(state, instanceId, now));
  }

  acknowledge(instanceId: string): void {
    this.mutate((state) => acknowledge(state, instanceId));
  }

  setPlan(draft: Parameters<typeof applyPlan>[1], now: string): MutationOutcome {
    return this.mutate((state) =>
      applyPlan(state, draft, now, (seed) => newId(`slot-${seed}`)),
    );
  }

  setPreferences(patch: Partial<Preferences>, now: string): MutationOutcome {
    return this.mutate((state) => applyPreferences(state, patch, now));
  }

  enableCatalogue(
    catalogueKey: string,
    enabled: boolean,
    target: number | null,
    now: string,
    measure?: Measurement,
  ): MutationOutcome {
    return this.mutate((state) =>
      enableCatalogueEntry(state, catalogueKey, enabled, target, now, measure),
    );
  }

  setPlanSlotsDirect(slots: PlanSlot[], now: string): void {
    this.mutate((state) => recompute({ ...state, planSlots: slots }, now));
  }

  startWorkout(
    params: {
      scheduledSessionId: string | null;
      modality: Modality;
      exercises: TemplateExercise[];
    },
    now: string,
  ): string {
    let sessionId = '';
    this.mutate((state) => {
      const result = applyStartWorkout(state, { ...params, startedAt: now });
      sessionId = result.state.workoutSessions[result.state.workoutSessions.length - 1]?.id ?? '';
      return result;
    });
    return sessionId;
  }

  logSet(
    params: {
      sessionId: string;
      exerciseId: string;
      setIndex: number;
      reps: number;
      loadKg: number | null;
      completed: boolean;
    },
    now: string,
  ): void {
    this.mutate((state) => applyLogSet(state, { ...params, recordedAt: now }));
  }

  logCardio(log: Omit<CardioLog, 'id'> & { id?: string }): void {
    this.mutate((state) => applyLogCardio(state, log));
  }

  /** Saves a session the person wrote, so they can start it again later. */
  saveWorkoutTemplate(params: {
    name: string;
    modality: Modality;
    exercises: TemplateExercise[];
  }): string {
    const template = emptyTemplate({
      id: newId('wt'),
      titleKey: '',
      title: params.name,
      modality: params.modality,
      exercises: params.exercises,
    });
    this.mutate((state) => ({
      state: { ...state, workoutTemplates: [...state.workoutTemplates, template] },
      ops: [
        { kind: 'put', table: 'workout_templates', record: { ...template } },
      ],
      granted: [],
    }));
    return template.id;
  }

  completeWorkout(sessionId: string, now: string): MutationOutcome {
    return this.mutate((state) => applyCompleteWorkout(state, sessionId, now));
  }

  shortenSession(scheduledSessionId: string, minutes: number, now: string): MutationOutcome {
    return this.mutate((state) => applyShorten(state, scheduledSessionId, minutes, now));
  }

  rescheduleSession(scheduledSessionId: string, newDate: string, now: string): MutationOutcome {
    return this.mutate((state) => applyReschedule(state, scheduledSessionId, newDate, now));
  }

  markExported(exportedAt: string): void {
    this.mutate((state) => ({
      state: { ...state, backup: { ...state.backup, lastExportedAt: exportedAt } },
      ops: [
        {
          kind: 'put',
          table: 'backup_metadata',
          record: { ...state.backup, lastExportedAt: exportedAt },
        },
      ],
      granted: [],
    }));
  }

  /** Replaces everything with a restored snapshot, in one transaction. */
  restore(state: AgonState, now: string): void {
    const rebuilt = recompute(state, now);
    replaceEverything(rebuilt.state);
    this.state = rebuilt.state;
    this.emit();
  }

  /** Deletes local personal data. Nothing is kept on the side. */
  wipe(): void {
    deleteEverything();
    const preferences = { ...defaultPreferences(), onboarded: false };
    this.state = emptyState(preferences);
    this.emit();
  }

  private persistPreferences(preferences: Preferences): void {
    applyOps([
      { kind: 'put', table: 'preferences', record: { ...preferences } },
      {
        kind: 'put',
        table: 'backup_metadata',
        record: { lastExportedAt: null, formatVersion: 1, lastRestoredAt: null },
      },
    ]);
  }
}
