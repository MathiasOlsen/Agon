import { usePathname, type Href } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { View, type ViewStyle } from 'react-native';

import type { IconName } from '@/core/pixels/icons';
import { PIXEL, TOUCH } from '@/theme/tokens';
import { useApp } from '@/state/app-provider';
import { PixelIcon } from '@/ui/pixel-sprite';
import { Text } from '@/ui/text';

/**
 * Browser navigation.
 *
 * `NativeTabs` draws its bar as a floating pill pinned to the top of the window
 * on the web, which lands on top of whatever the screen puts there — the page
 * name in particular. The web build therefore uses the headless tabs and draws
 * its own bar along the bottom edge: in normal flow, out of the content's way,
 * and in the same pixel language as the sprites, the meters and the cards.
 *
 * Native builds keep the platform bars, where they already behave.
 */

const TABS: Array<{ name: string; href: Href; labelKey: string; icon: IconName }> = [
  { name: 'today', href: '/today', labelKey: 'nav.today', icon: 'calendar' },
  { name: 'quests', href: '/quests', labelKey: 'nav.quests', icon: 'star' },
  { name: 'avatar', href: '/avatar', labelKey: 'nav.avatar', icon: 'person' },
  { name: 'profile', href: '/profile', labelKey: 'nav.profile', icon: 'sliders' },
];

export default function TabsLayoutWeb() {
  const { theme } = useApp();
  const pathname = usePathname();
  const { tokens } = theme;

  const bar: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: tokens.surface,
    borderTopWidth: PIXEL.edge,
    borderTopColor: tokens.border,
    paddingHorizontal: PIXEL.edgeThin,
  };

  return (
    <Tabs style={{ flex: 1, backgroundColor: tokens.background }}>
      <TabSlot />
      <TabList accessibilityRole="tablist" style={bar}>
        {TABS.map((tab) => {
          const href = String(tab.href);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <TabTrigger
              key={tab.name}
              name={tab.name}
              href={tab.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{ flex: 1, minHeight: TOUCH.minHeight }}
            >
              <TabButton icon={tab.icon} labelKey={tab.labelKey} active={active} />
            </TabTrigger>
          );
        })}
      </TabList>
    </Tabs>
  );
}

/**
 * One tab. The open tab is marked three ways — a filled cell, a border and a
 * block underneath — so the state never rests on colour alone.
 */
function TabButton({
  icon,
  labelKey,
  active,
}: {
  icon: IconName;
  labelKey: string;
  active: boolean;
}) {
  const { theme, t } = useApp();
  const { tokens } = theme;
  const label = t(labelKey as 'nav.today');

  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 180,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        margin: PIXEL.edgeThin,
        backgroundColor: active ? tokens.progressTrack : 'transparent',
        borderWidth: active ? PIXEL.edge : 0,
        borderColor: tokens.primary,
      }}
    >
      <PixelIcon name={icon} size={16} color={active ? tokens.primary : tokens.textMuted} />
      <Text variant="caption" tone={active ? 'primary' : 'muted'} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={{
          width: 18,
          height: 4,
          backgroundColor: active ? tokens.primary : 'transparent',
        }}
      />
    </View>
  );
}
