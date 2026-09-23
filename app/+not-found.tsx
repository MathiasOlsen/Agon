import { Link } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/ui/button';
import { Screen } from '@/ui/screen';
import { Text } from '@/ui/text';
import { useApp } from '@/state/app-provider';

export default function NotFound() {
  const { t } = useApp();
  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Text variant="title">{t('app.name')}</Text>
        <Text variant="body" tone="muted">
          {t('common.error')}
        </Text>
        <Link href="/" asChild>
          <Button label={t('common.continue')} onPress={() => undefined} />
        </Link>
      </View>
    </Screen>
  );
}
