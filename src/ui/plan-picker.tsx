import { View } from 'react-native';

import { WEEKDAYS, type PlanDraft } from '@/core/plan';
import { useApp } from '@/state/app-provider';
import { PixelIcon } from '@/ui/pixel-sprite';
import { Card } from '@/ui/card';
import { Text } from '@/ui/text';
import { Pressable } from 'react-native';

/**
 * The weekly plan, as seven day columns with one toggle per activity type. A
 * rest day is simply a day with nothing switched on, and recovery is explicit
 * because it is part of the plan rather than an absence of one.
 */

export type PlanRow = {
  key: keyof Omit<PlanDraft, never> & ('strengthDays' | 'cardioDays' | 'mobilityDays' | 'recoveryDays');
  labelKey: string;
  tone: 'primary' | 'accent';
};

export const PLAN_ROWS: PlanRow[] = [
  { key: 'strengthDays', labelKey: 'plan.strength', tone: 'primary' },
  { key: 'cardioDays', labelKey: 'plan.aerobic', tone: 'primary' },
  { key: 'mobilityDays', labelKey: 'plan.mobility', tone: 'accent' },
  { key: 'recoveryDays', labelKey: 'plan.recovery', tone: 'accent' },
];

export function PlanPicker({
  draft,
  onChange,
}: {
  draft: PlanDraft;
  onChange: (draft: PlanDraft) => void;
}) {
  const { theme, t } = useApp();
  const { tokens } = theme;

  const toggle = (key: PlanRow['key'], weekday: number) => {
    const current = draft[key];
    const next = current.includes(weekday)
      ? current.filter((day) => day !== weekday)
      : [...current, weekday].sort((a, b) => a - b);
    onChange({ ...draft, [key]: next });
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 84 }} />
        {WEEKDAYS.map((weekday) => (
          <View key={weekday} style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t(`weekday.${weekday}` as 'weekday.1')}
            </Text>
          </View>
        ))}
      </View>

      {PLAN_ROWS.map((row) => (
        <View key={row.key} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <View style={{ width: 84 }}>
            <Text variant="label" numberOfLines={1}>
              {t(row.labelKey as 'plan.strength')}
            </Text>
          </View>
          {WEEKDAYS.map((weekday) => {
            const selected = draft[row.key].includes(weekday);
            return (
              <Pressable
                key={weekday}
                onPress={() => toggle(row.key, weekday)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${t(row.labelKey as 'plan.strength')}, ${t(`weekday.full.${weekday}` as 'weekday.full.1')}`}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? tokens.primary : tokens.progressTrack,
                  backgroundColor: selected
                    ? row.tone === 'accent'
                      ? tokens.successSurface
                      : tokens.progressTrack
                    : 'transparent',
                  borderRadius: theme.treatment === 'stepped' ? 2 : 8,
                }}
              >
                {selected ? (
                  <PixelIcon
                    name={row.key === 'recoveryDays' ? 'flame' : 'check'}
                    size={12}
                    color={row.tone === 'accent' ? tokens.successText : tokens.primary}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}
