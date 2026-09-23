import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { addDays, formatLocalDate, localDateOf } from '@/core/dates';
import { useApp } from '@/state/app-provider';
import { Button } from '@/ui/button';
import { Card, CardHeader } from '@/ui/card';
import { Field, Stepper, ToggleRow } from '@/ui/controls';
import { Row } from '@/ui/row';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { ThemePicker } from '@/ui/theme-picker';

/** Profile holds appearance, preferences, data control and privacy. */

export default function ProfileScreen() {
  const { store, state, t } = useApp();
  const router = useRouter();
  const now = new Date().toISOString();
  const today = localDateOf(now, state.preferences.timeZone);
  const { preferences } = state;
  const [pauseDays, setPauseDays] = useState(7);
  const paused = preferences.pausedFrom !== null && preferences.pausedTo !== null;

  return (
    <Screen>
      <Card>
        <Field
          label={t('profile.nickname')}
          value={preferences.nickname}
          onChangeText={(nickname) => store.setPreferences({ nickname }, now)}
          placeholder={t('common.optional')}
          hint={t('profile.nicknameHint')}
        />
      </Card>

      <Card>
        <CardHeader title={t('profile.appearance')} subtitle={t('avatar.levelsStay')} />
        <Link href="/(tabs)/avatar/customize" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={t('avatar.customize')}>
            <Text variant="label" tone="primary">
              {t('avatar.customize')}
            </Text>
          </Pressable>
        </Link>
      </Card>

      <Card>
        <ThemePicker
          value={preferences.theme}
          onChange={(theme) => store.setPreferences({ theme }, now)}
        />
      </Card>

      <Card>
        <Row
          icon="sliders"
          title={t('profile.preferences')}
          subtitle={t('prefs.languageHint')}
          onPress={() => router.push('/(tabs)/profile/preferences')}
        />
        <Row
          icon="bell"
          title={t('profile.reminders')}
          subtitle={
            preferences.reminders.enabled ? t('reminders.enable') : t('reminders.body')
          }
          onPress={() => router.push('/(tabs)/profile/reminders')}
        />
        <Row
          icon="upload"
          title={t('profile.data')}
          subtitle={t('data.subtitle')}
          onPress={() => router.push('/(tabs)/profile/data')}
        />
        <Row
          icon="lock"
          title={t('profile.privacy')}
          subtitle={t('privacy.localOnly')}
          onPress={() => router.push('/(tabs)/profile/privacy')}
        />
      </Card>

      <Card>
        <CardHeader title={t('profile.accessibility')} />
        <ToggleRow
          title={t('profile.reduceMotion')}
          subtitle={t('profile.reduceMotionHint')}
          value={preferences.reduceMotion}
          onChange={(reduceMotion) => store.setPreferences({ reduceMotion }, now)}
        />
      </Card>

      <Card>
        <CardHeader
          title={t('profile.recovery')}
          subtitle={t('profile.pauseHint')}
          trailing={
            paused ? (
              <Text variant="caption" tone="success">
                {t('profile.pauseActive', {
                  date: formatLocalDate(preferences.pausedTo ?? today, preferences.locale),
                })}
              </Text>
            ) : null
          }
        />
        <View style={{ gap: 8 }}>
          <Text variant="label">{t('profile.pauseTo')}</Text>
          <Stepper
            label={t('profile.pauseTo')}
            value={pauseDays}
            step={1}
            min={1}
            max={60}
            onChange={setPauseDays}
            format={(value) => `${value} d`}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button
              label={t('profile.pause')}
              variant="secondary"
              onPress={() =>
                store.setPreferences(
                  { pausedFrom: today, pausedTo: addDays(today, pauseDays) },
                  now,
                )
              }
            />
            {paused ? (
              <Button
                label={t('profile.resume')}
                onPress={() => store.setPreferences({ pausedFrom: null, pausedTo: null }, now)}
              />
            ) : null}
          </View>
        </View>
      </Card>

      <Text variant="caption" tone="muted">
        {t('today.savedLocally')}
      </Text>
    </Screen>
  );
}
