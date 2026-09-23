import type { Modality, TemplateExercise, Tool, WorkoutTemplate } from './types';

/**
 * Starter content.
 *
 * Four bundles ship at launch: three strength sessions and one aerobic session,
 * each doable at home with minimal equipment. Every tool-assisted component
 * names a bodyweight alternative, because a missing dumbbell should change the
 * movement rather than delete the work.
 *
 * This is draft content under review, not a prescription. The handoff records
 * what was checked, what was deliberately excluded, and the limits of that
 * review; the app must keep describing it as general information and keep
 * telling people to stop if something hurts.
 */

export type MovementPattern = 'warmup' | 'squat' | 'hinge' | 'push' | 'pull' | 'core' | 'cardio';

export type ExerciseDefinition = {
  id: string;
  nameKey: string;
  tool: Tool;
  pattern: MovementPattern;
  /** How the movement is described to the person, in one short line. */
  hintKey: string;
};

export const EXERCISES: ExerciseDefinition[] = [
  { id: 'warmup', nameKey: 'exercise.warmup', hintKey: 'exercise.warmup.hint', tool: 'none', pattern: 'warmup' },
  { id: 'goblet_squat', nameKey: 'exercise.goblet_squat', hintKey: 'exercise.goblet_squat.hint', tool: 'dumbbell', pattern: 'squat' },
  { id: 'chair_squat', nameKey: 'exercise.chair_squat', hintKey: 'exercise.chair_squat.hint', tool: 'none', pattern: 'squat' },
  { id: 'bodyweight_squat', nameKey: 'exercise.bodyweight_squat', hintKey: 'exercise.bodyweight_squat.hint', tool: 'none', pattern: 'squat' },
  { id: 'split_squat', nameKey: 'exercise.split_squat', hintKey: 'exercise.split_squat.hint', tool: 'none', pattern: 'squat' },
  { id: 'reverse_lunge', nameKey: 'exercise.reverse_lunge', hintKey: 'exercise.reverse_lunge.hint', tool: 'none', pattern: 'squat' },
  { id: 'romanian_deadlift', nameKey: 'exercise.romanian_deadlift', hintKey: 'exercise.romanian_deadlift.hint', tool: 'dumbbell', pattern: 'hinge' },
  { id: 'hip_bridge', nameKey: 'exercise.hip_bridge', hintKey: 'exercise.hip_bridge.hint', tool: 'none', pattern: 'hinge' },
  { id: 'push_up', nameKey: 'exercise.push_up', hintKey: 'exercise.push_up.hint', tool: 'none', pattern: 'push' },
  { id: 'knee_push_up', nameKey: 'exercise.knee_push_up', hintKey: 'exercise.knee_push_up.hint', tool: 'none', pattern: 'push' },
  { id: 'shoulder_press', nameKey: 'exercise.shoulder_press', hintKey: 'exercise.shoulder_press.hint', tool: 'dumbbell', pattern: 'push' },
  { id: 'pike_push_up', nameKey: 'exercise.pike_push_up', hintKey: 'exercise.pike_push_up.hint', tool: 'none', pattern: 'push' },
  { id: 'dumbbell_row', nameKey: 'exercise.dumbbell_row', hintKey: 'exercise.dumbbell_row.hint', tool: 'dumbbell', pattern: 'pull' },
  { id: 'band_row', nameKey: 'exercise.band_row', hintKey: 'exercise.band_row.hint', tool: 'band', pattern: 'pull' },
  { id: 'table_row', nameKey: 'exercise.table_row', hintKey: 'exercise.table_row.hint', tool: 'none', pattern: 'pull' },
  { id: 'sit_up', nameKey: 'exercise.sit_up', hintKey: 'exercise.sit_up.hint', tool: 'none', pattern: 'core' },
  { id: 'dead_bug', nameKey: 'exercise.dead_bug', hintKey: 'exercise.dead_bug.hint', tool: 'none', pattern: 'core' },
  { id: 'plank', nameKey: 'exercise.plank', hintKey: 'exercise.plank.hint', tool: 'none', pattern: 'core' },
  { id: 'knee_plank', nameKey: 'exercise.knee_plank', hintKey: 'exercise.knee_plank.hint', tool: 'none', pattern: 'core' },
  { id: 'side_plank', nameKey: 'exercise.side_plank', hintKey: 'exercise.side_plank.hint', tool: 'none', pattern: 'core' },
];

export function exerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function exerciseNameKey(id: string): string {
  return exerciseById(id)?.nameKey ?? 'exercise.unknown';
}

type ComponentSpec = {
  exerciseId: string;
  sets: number;
  reps?: number;
  /** Seconds per set, instead of reps. */
  seconds?: number;
  loadKg?: number | null;
  alternative?: string;
};

function component(spec: ComponentSpec): TemplateExercise {
  return {
    exerciseId: spec.exerciseId,
    sets: spec.sets,
    reps: spec.reps ?? null,
    durationSec: spec.seconds ?? null,
    loadKg: spec.loadKg ?? null,
    tool: exerciseById(spec.exerciseId)?.tool ?? 'none',
    alternativeExerciseId: spec.alternative ?? null,
  };
}

export type BundleDefinition = {
  key: string;
  titleKey: string;
  modality: Modality;
  estimatedMinutes: number;
  exercises: TemplateExercise[];
};

/**
 * The four starter bundles. Warm-up is part of the session, so a strictly
 * completed session includes it.
 */
export const STARTER_BUNDLES: BundleDefinition[] = [
  {
    key: 'strength_a',
    titleKey: 'bundle.strength_a',
    modality: 'strength',
    estimatedMinutes: 35,
    exercises: [
      component({ exerciseId: 'warmup', sets: 1, seconds: 300 }),
      component({ exerciseId: 'goblet_squat', sets: 3, reps: 10, loadKg: 16, alternative: 'bodyweight_squat' }),
      component({ exerciseId: 'push_up', sets: 3, reps: 10, alternative: 'knee_push_up' }),
      component({ exerciseId: 'dumbbell_row', sets: 3, reps: 10, loadKg: 12, alternative: 'band_row' }),
      component({ exerciseId: 'sit_up', sets: 3, reps: 10, alternative: 'dead_bug' }),
      component({ exerciseId: 'plank', sets: 3, seconds: 30, alternative: 'knee_plank' }),
    ],
  },
  {
    key: 'strength_b',
    titleKey: 'bundle.strength_b',
    modality: 'strength',
    estimatedMinutes: 35,
    exercises: [
      component({ exerciseId: 'warmup', sets: 1, seconds: 300 }),
      component({ exerciseId: 'romanian_deadlift', sets: 3, reps: 10, loadKg: 16, alternative: 'hip_bridge' }),
      component({ exerciseId: 'shoulder_press', sets: 3, reps: 10, loadKg: 10, alternative: 'pike_push_up' }),
      component({ exerciseId: 'split_squat', sets: 3, reps: 10 }),
      component({ exerciseId: 'band_row', sets: 3, reps: 12, alternative: 'table_row' }),
      component({ exerciseId: 'side_plank', sets: 3, seconds: 20 }),
    ],
  },
  {
    key: 'legs_core',
    titleKey: 'bundle.legs_core',
    modality: 'strength',
    estimatedMinutes: 30,
    exercises: [
      component({ exerciseId: 'warmup', sets: 1, seconds: 300 }),
      component({ exerciseId: 'reverse_lunge', sets: 3, reps: 10, alternative: 'chair_squat' }),
      component({ exerciseId: 'hip_bridge', sets: 3, reps: 12 }),
      component({ exerciseId: 'chair_squat', sets: 3, reps: 15 }),
      component({ exerciseId: 'dead_bug', sets: 3, reps: 10 }),
      component({ exerciseId: 'side_plank', sets: 3, seconds: 25 }),
    ],
  },
  {
    key: 'cardio',
    titleKey: 'bundle.cardio',
    modality: 'walk',
    estimatedMinutes: 25,
    exercises: [
      component({ exerciseId: 'warmup', sets: 1, seconds: 300 }),
    ],
  },
];

export function bundleByKey(key: string): BundleDefinition | undefined {
  return STARTER_BUNDLES.find((bundle) => bundle.key === key);
}

/** Plan slots carry their bundle as a title key, e.g. `bundle.strength_a`. */
export function bundleForTitleKey(titleKey: string): BundleDefinition | undefined {
  const match = /^bundle\.(.+)$/.exec(titleKey);
  return match?.[1] ? bundleByKey(match[1]) : undefined;
}

/** The strength bundle for a plan slot, so three days are not identical. */
export function bundleForStrengthDay(index: number): BundleDefinition {
  const rotation = ['strength_a', 'legs_core', 'strength_b'];
  const key = rotation[index % rotation.length] ?? 'strength_a';
  return bundleByKey(key) ?? STARTER_BUNDLES[0]!;
}

/** Kept for older callers: the foundation bundle as a plain session. */
export function starterStrengthSession(): TemplateExercise[] {
  return bundleByKey('strength_a')?.exercises.map((exercise) => ({ ...exercise })) ?? [];
}

export const MODALITIES: Modality[] = [
  'walk',
  'run',
  'ride',
  'swim',
  'class',
  'mobility',
  'sport',
  'other',
];

export function modalityLabelKey(modality: Modality): string {
  return `modality.${modality}`;
}

/** Estimated minutes, used for the day's plan summary. */
export function estimateMinutes(exercises: TemplateExercise[]): number {
  let seconds = 0;
  for (const exercise of exercises) {
    if (exercise.durationSec !== null) seconds += exercise.sets * exercise.durationSec;
    // A set of reps takes roughly 45 seconds once the work and the rest are counted.
    else seconds += exercise.sets * 45;
  }
  return Math.max(10, Math.round(seconds / 60) + 5);
}

export function describeComponent(exercise: TemplateExercise): {
  sets: number;
  amount: 'reps' | 'seconds' | 'cardio';
  value: number | null;
} {
  if (exercise.reps !== null) {
    return { sets: exercise.sets, amount: 'reps', value: exercise.reps };
  }
  if (exercise.durationSec !== null) {
    return { sets: exercise.sets, amount: 'seconds', value: exercise.durationSec };
  }
  return { sets: exercise.sets, amount: 'cardio', value: null };
}

/** True once every set of every component has been ticked. */
export function sessionIsComplete(
  exercises: TemplateExercise[],
  logged: Array<{ exerciseId: string; setIndex: number; completed: boolean }>,
): boolean {
  const required = exercises.flatMap((exercise) =>
    Array.from({ length: exercise.sets }, (_, setIndex) => ({ exerciseId: exercise.exerciseId, setIndex })),
  );
  if (required.length === 0) return false;
  return required.every((needed) =>
    logged.some(
      (entry) =>
        entry.exerciseId === needed.exerciseId &&
        entry.setIndex === needed.setIndex &&
        entry.completed,
    ),
  );
}

export function emptyTemplate(params: {
  id: string;
  titleKey: string;
  title?: string | null;
  modality: Modality;
  exercises: TemplateExercise[];
}): WorkoutTemplate {
  return {
    id: params.id,
    titleKey: params.titleKey,
    title: params.title ?? null,
    modality: params.modality,
    exercises: params.exercises,
    bundleKey: null,
    isStarter: false,
    estimatedMinutes: estimateMinutes(params.exercises),
    revision: 1,
  };
}
