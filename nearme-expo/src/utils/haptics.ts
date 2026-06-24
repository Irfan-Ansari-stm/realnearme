import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function runOnNative(fn: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await fn();
  } catch {
    // Haptics are optional feedback; never let them break UI actions.
  }
}

export const safeHaptics = {
  selection: () => runOnNative(() => Haptics.selectionAsync()),
  impactLight: () => runOnNative(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  impactMedium: () => runOnNative(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => runOnNative(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => runOnNative(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
