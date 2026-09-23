import type { Modality, TemplateExercise } from './types';

/**
 * Starter content.
 *
 * These are ordinary, widely used movements offered as a starting point for a
 * strength session. They are not a training prescription, and the handoff is
 * explicit that published starter content needs qualified review — see
 * `docs/RELEASE.md`. Anything the person writes themselves is kept as their own.
 */

export type Equipment = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine';
export type MovementPattern = 'squat' | 'hinge' | 'push' | 'pull' | 'core';

export type ExerciseDefinition = {
  id: string;
  nameKey: string;
  equipment: Equipment;
  pattern: MovementPattern;
};

export const EXERCISES: ExerciseDefinition[] = [
  { id: 'goblet_squat', nameKey: 'exercise.goblet_squat', equipment: 'dumbbell', pattern: 'squat' },
  { id: 'split_squat', nameKey: 'exercise.split_squat', equipment: 'bodyweight', pattern: 'squat' },
  { id: 'romanian_deadlift', nameKey: 'exercise.romanian_deadlift', equipment: 'dumbbell', pattern: 'hinge' },
  { id: 'hip_bridge', nameKey: 'exercise.hip_bridge', equipment: 'bodyweight', pattern: 'hinge' },
  { id: 'push_up', nameKey: 'exercise.push_up', equipment: 'bodyweight', pattern: 'push' },
  { id: 'shoulder_press', nameKey: 'exercise.shoulder_press', equipment: 'dumbbell', pattern: 'push' },
  { id: 'dumbbell_row', nameKey: 'exercise.dumbbell_row', equipment: 'dumbbell', pattern: 'pull' },
  { id: 'band_row', nameKey: 'exercise.band_row', equipment: 'bodyweight', pattern: 'pull' },
  { id: 'dead_bug', nameKey: 'exercise.dead_bug', equipment: 'bodyweight', pattern: 'core' },
  { id: 'side_plank', nameKey: 'exercise.side_plank', equipment: 'bodyweight', pattern: 'core' },
];

export function exerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

/** A balanced default session: one squat, one hinge, one push, one pull. */
export function starterStrengthSession(): TemplateExercise[] {
  return [
    { exerciseId: 'goblet_squat', sets: 3, reps: 10, loadKg: 16 },
    { exerciseId: 'dumbbell_row', sets: 3, reps: 10, loadKg: 12 },
    { exerciseId: 'push_up', sets: 3, reps: 8, loadKg: null },
    { exerciseId: 'dead_bug', sets: 3, reps: 10, loadKg: null },
  ];
}

export function starterMobilitySession(): TemplateExercise[] {
  return [{ exerciseId: 'dead_bug', sets: 2, reps: 8, loadKg: null }];
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
  const sets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  // Roughly two minutes per set once rest is included.
  return Math.max(10, sets * 2 + 8);
}
