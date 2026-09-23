import { useState, type ReactNode } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';

import { PIXEL, TOUCH } from '@/theme/tokens';

import { useThemeTokens } from '@/state/app-provider';

import { PixelIcon } from './pixel-sprite';
import { Text } from './text';

/** Small input controls shared by onboarding, preferences and logging. */

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.progressTrack,
        borderWidth: PIXEL.edge,
        borderColor: tokens.border,
        borderRadius: PIXEL.corner,
        padding: PIXEL.edgeThin,
        gap: PIXEL.edgeThin,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: PIXEL.corner,
              // The fill alone is a 1.3:1 difference, so the open period also
              // gets an edge: two cues, and neither of them is colour alone.
              borderWidth: selected ? PIXEL.edge : 0,
              borderColor: tokens.primary,
              backgroundColor: selected ? tokens.surface : 'transparent',
            }}
          >
            <Text variant="label" tone={selected ? 'primary' : 'muted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  label,
  format,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  format?: (value: number) => string;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={label}>
      <Pressable
        onPress={() => onChange(clamp(value - step))}
        accessibilityRole="button"
        accessibilityLabel={`${label} minus`}
        hitSlop={6}
        style={{
          minHeight: TOUCH.minHeight,
          minWidth: TOUCH.minHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: PIXEL.edge,
          borderColor: tokens.border,
          borderRadius: PIXEL.corner,
        }}
      >
        <PixelIcon name="minus" size={14} color={tokens.text} />
      </Pressable>
      <View style={{ minWidth: 76, alignItems: 'center' }}>
        <Text variant="section" tabular>
          {format ? format(value) : String(value)}
        </Text>
      </View>
      <Pressable
        onPress={() => onChange(clamp(value + step))}
        accessibilityRole="button"
        accessibilityLabel={`${label} plus`}
        hitSlop={6}
        style={{
          minHeight: TOUCH.minHeight,
          minWidth: TOUCH.minHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: PIXEL.edge,
          borderColor: tokens.border,
          borderRadius: PIXEL.corner,
        }}
      >
        <PixelIcon name="plus" size={14} color={tokens.text} />
      </Pressable>
    </View>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ true: tokens.primary, false: tokens.progressTrack }}
        thumbColor={tokens.surface}
      />
    </View>
  );
}

export function OptionPill({
  selected,
  label,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  children?: ReactNode;
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      style={{
        minHeight: TOUCH.minHeight,
        minWidth: TOUCH.minWidth,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        // Selection is a thicker edge as well as a different colour, so it does
        // not rest on the colour difference alone.
        borderWidth: selected ? PIXEL.edge : PIXEL.edgeThin,
        borderColor: selected ? tokens.primary : tokens.border,
        backgroundColor: tokens.surface,
        borderRadius: PIXEL.corner,
      }}
    >
      {children}
      <Text variant="caption" tone={selected ? 'primary' : 'muted'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  hint,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  secureTextEntry?: boolean;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences';
}) {
  const theme = useThemeTokens();
  const { tokens } = theme;
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={{
          minHeight: TOUCH.minHeight,
          borderWidth: focused ? PIXEL.edge : PIXEL.edgeThin,
          borderColor: focused ? tokens.focus : tokens.border,
          borderRadius: PIXEL.corner,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: tokens.text,
          backgroundColor: tokens.surface,
          fontSize: 16,
        }}
      />
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
