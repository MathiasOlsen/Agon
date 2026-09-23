import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EXERCISES } from '@/core/content';
import type { TemplateExercise } from '@/core/types';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Field, Stepper } from '@/ui/controls';
import { PixelIcon } from '@/ui/pixel-sprite';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

/**
 * Writing your own session.
 *
 * The starter bundles are a default, not a cage: anyone can put together their
 * own movements, sets and reps, save it, and start it from a planned day. It then
 * completes that day's plan entry exactly like a prescribed bundle.
 */

type Chosen = { exerciseId: string; sets: number; reps: number };

export default function NewSession() {
  const { store, theme, t } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [picking, setPicking] = useState(true);

  const add = (exerciseId: string) => {
    setChosen((current) =>
      current.some((item) => item.exerciseId === exerciseId)
        ? current
        : [...current, { exerciseId, sets: 3, reps: 10 }],
    );
    setPicking(false);
  };

  const update = (exerciseId: string, patch: Partial<Chosen>) => {
    setChosen((current) =>
      current.map((item) => (item.exerciseId === exerciseId ? { ...item, ...patch } : item)),
    );
  };

  const save = () => {
    const exercises: TemplateExercise[] = [
      {
        exerciseId: 'warmup',
        sets: 1,
        reps: null,
        durationSec: 300,
        loadKg: null,
        tool: 'none',
        alternativeExerciseId: null,
      },
      ...chosen.map((item) => ({
        exerciseId: item.exerciseId,
        sets: item.sets,
        reps: item.reps,
        durationSec: null,
        loadKg: null,
        tool: EXERCISES.find((exercise) => exercise.id === item.exerciseId)?.tool ?? 'none',
        alternativeExerciseId: null,
      })),
    ];
    store.saveWorkoutTemplate({
      name: name.trim() === '' ? t('session.mySession') : name.trim(),
      modality: 'strength',
      exercises,
    });
    router.back();
  };

  return (
    <Screen>
      <Text variant="body" tone="muted">
        {t('session.buildOwnHint')}
      </Text>

      <Field label={t('session.sessionName')} value={name} onChangeText={setName} />

      {chosen.length > 0 ? (
        <Card>
          <CardHeader title={t('session.components')} />
          {chosen.map((item) => (
            <View key={item.exerciseId} style={{ gap: 8, paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="label" style={{ flex: 1 }}>
                  {t(
                    (EXERCISES.find((exercise) => exercise.id === item.exerciseId)?.nameKey ??
                      'exercise.unknown') as 'exercise.unknown',
                  )}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('session.remove')}
                  onPress={() =>
                    setChosen((current) =>
                      current.filter((candidate) => candidate.exerciseId !== item.exerciseId),
                    )
                  }
                  hitSlop={8}
                >
                  <PixelIcon name="trash" size={16} color={theme.tokens.danger} />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Stepper
                  label={t('session.sets')}
                  value={item.sets}
                  min={1}
                  max={10}
                  onChange={(sets) => update(item.exerciseId, { sets })}
                />
                <Stepper
                  label={t('session.reps')}
                  value={item.reps}
                  min={1}
                  max={50}
                  onChange={(reps) => update(item.exerciseId, { reps })}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {picking || chosen.length === 0 ? (
        <Card>
          <CardHeader title={t('session.addMovement')} />
          {EXERCISES.filter(
            (exercise) => exercise.pattern !== 'warmup' && exercise.pattern !== 'cardio',
          ).map((exercise) => (
            <Pressable
              key={exercise.id}
              onPress={() => add(exercise.id)}
              accessibilityRole="button"
              accessibilityLabel={t(exercise.nameKey as 'exercise.push_up')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
            >
              <PixelIcon name="plus" size={14} color={theme.tokens.primary} />
              <Text variant="label" style={{ flex: 1 }}>
                {t(exercise.nameKey as 'exercise.push_up')}
              </Text>
              {exercise.tool !== 'none' ? (
                <Text variant="caption" tone="muted">
                  {t(`tool.${exercise.tool}` as 'tool.dumbbell')}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </Card>
      ) : (
        <Button
          label={t('session.addMovement')}
          variant="secondary"
          onPress={() => setPicking(true)}
        />
      )}

      <Button label={t('common.save')} disabled={chosen.length === 0} onPress={save} />
    </Screen>
  );
}
