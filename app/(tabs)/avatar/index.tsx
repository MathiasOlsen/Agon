import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { levelRangeForTier, tierForLevel, type AppearanceTier } from '@/core/level';
import { useApp } from '@/state/app-provider';
import { useLevelProgress, useMood, usePeriodCounters } from '@/state/hooks';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { CompanionSprite } from '@/ui/pixel-sprite';
import { ProgressBar } from '@/ui/progress-bar';
import { Headline, Screen } from '@/ui/screen';
import { Text } from '@/ui/text';

const TIERS: AppearanceTier[] = [
  'beginner',
  'rhythm',
  'athletic',
  'heroic',
  'radiant',
  'ascendant',
];

/**
 * The avatar hub. Level is permanent and comes from earned XP; mood is temporary
 * and comes from recent quests. Neither is a judgement about a body, and a quiet
 * stretch never destroys what was earned.
 */

export default function AvatarScreen() {
  const { state, theme, t } = useApp();
  const now = new Date().toISOString();
  const progress = useLevelProgress();
  const mood = useMood(now);
  const counters = usePeriodCounters(now);
  const tier = tierForLevel(progress.level);
  const moodLabel = t(`mood.${mood.mood}` as 'mood.ready');

  const nextForms = [progress.level + 5, progress.level + 10]
    .filter((level) => level <= 30)
    .slice(0, 3);

  const badges = state.questInstances.filter(
    (instance) =>
      instance.status === 'completed' &&
      (instance.periodKind === 'monthly' || instance.periodKind === 'yearly'),
  );

  return (
    <Screen>
      <Headline subtitle={t('avatar.levelsStay')}>{t('avatar.headline')}</Headline>

      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <CompanionSprite
          level={progress.level}
          mood={mood.mood}
          appearance={state.preferences.appearance}
          theme={theme}
          scale={7}
          label={t('a11y.avatar', { level: progress.level, mood: moodLabel })}
        />
      </View>

      <Card>
        <CardHeader
          title={t('avatar.permanentTitle')}
          subtitle={t(`tier.${tier}` as 'tier.beginner')}
          trailing={
            <Text variant="title" tabular>
              {String(progress.level).padStart(2, '0')}
            </Text>
          }
        />
        <ProgressBar
          value={progress.xpIntoLevel}
          max={progress.isMaxLevel ? 1 : progress.xpForNextLevel}
          complete={progress.isMaxLevel}
          label={t('a11y.levelBar')}
        />
        <Text variant="caption" tone="muted" tabular>
          {progress.isMaxLevel
            ? t('level.maxReached')
            : t('level.toNext', {
                count: progress.xpForNextLevel - progress.xpIntoLevel,
                level: progress.level + 1,
              })}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t('xp.lifetime', { count: progress.totalXp })}
        </Text>
      </Card>

      <Card>
        <CardHeader
          title={t('avatar.moodTitle')}
          subtitle={t('mood.explanation')}
          trailing={
            <Text variant="label" tone="primary">
              {moodLabel}
            </Text>
          }
        />
        <Text variant="caption" tone="muted">
          {mood.includesToday ? t('complete.subtitle') : t('mood.recoveryNote')}
        </Text>
      </Card>

      <Card>
        <CardHeader title={t('avatar.yourNextForms')} subtitle={t('avatar.everyLookIncluded')} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {nextForms.map((level) => (
            <View key={level} style={{ alignItems: 'center', gap: 4 }}>
              <CompanionSprite
                level={level}
                mood={mood.mood}
                appearance={state.preferences.appearance}
                theme={theme}
                scale={3}
                label={t('a11y.avatar', { level, mood: moodLabel })}
              />
              <Text variant="caption" tone="muted" tabular>
                {t('level.label', { level })}
              </Text>
              <Text variant="caption" tone="muted">
                {t(`tier.${tierForLevel(level)}` as 'tier.beginner')}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <CardHeader title={t('quests.yourQuests')} />
        <Text variant="caption" tone="muted" tabular>
          {t('quests.weeklySessions')}:{' '}
          {t('unit.of', { done: counters.weekly.done, target: counters.weekly.target })}
        </Text>
        <Text variant="caption" tone="muted" tabular>
          {t('quests.monthlySessions')}:{' '}
          {t('unit.of', { done: counters.monthly.done, target: counters.monthly.target })}
        </Text>
      </Card>

      <Card>
        <CardHeader title={t('avatar.badges')} />
        {badges.length === 0 ? (
          <Text variant="caption" tone="muted">
            {t('avatar.noBadges')}
          </Text>
        ) : (
          badges.slice(0, 6).map((instance) => (
            <Text key={instance.id} variant="label">
              {t(`quest.${instance.catalogueKey}.title` as 'quest.show_up.title')}
            </Text>
          ))
        )}
      </Card>

      <Card>
        <CardHeader title={t('avatar.tierIn', {
          tier: t(`tier.${tier}` as 'tier.beginner'),
          from: levelRangeForTier(tier).from,
          to: levelRangeForTier(tier).to,
        })} />
        <View style={{ gap: 4 }}>
          {TIERS.map((candidate) => {
            const range = levelRangeForTier(candidate);
            const unlocked = progress.level >= range.from;
            return (
              <View key={candidate} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="label" tone={unlocked ? 'default' : 'muted'}>
                  {t(`tier.${candidate}` as 'tier.beginner')}
                </Text>
                <Text variant="caption" tone="muted" tabular>
                  {range.from}–{range.to}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Link href="/(tabs)/avatar/customize" asChild>
        <Pressable accessibilityRole="button" accessibilityLabel={t('avatar.customize')}>
          <Button label={t('avatar.customize')} onPress={() => undefined} />
        </Pressable>
      </Link>
    </Screen>
  );
}
