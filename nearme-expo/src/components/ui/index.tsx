import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Pressable, ViewStyle, TextStyle, TextInputProps,
  ScrollView, Modal as RNModal, FlatList,
} from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
  interpolate, FadeIn, FadeOut, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Duration } from '@/theme';
import { safeHaptics } from '@/utils/haptics';

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  children, onPress, variant = 'primary', size = 'md',
  loading, disabled, icon, style, textStyle, fullWidth,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });
    safeHaptics.impactLight();
    onPress?.();
  };

  const sizes = {
    sm: { h: 36, px: 14, fontSize: Typography.sizes.sm },
    md: { h: 48, px: 20, fontSize: Typography.sizes.base },
    lg: { h: 56, px: 24, fontSize: Typography.sizes.md },
  };

  const vars = {
    primary: { bg: Colors.brand[500], text: '#fff', border: 'transparent' },
    ghost:   { bg: Colors.surface[150], text: Colors.surface[800], border: Colors.surface[300] },
    danger:  { bg: 'rgba(239,68,68,0.12)', text: Colors.error, border: 'rgba(239,68,68,0.25)' },
    outline: { bg: 'transparent', text: Colors.brand[400], border: Colors.brand[500] },
    icon:    { bg: Colors.surface[150], text: Colors.surface[800], border: Colors.surface[300] },
  };

  const v = vars[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[animStyle, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={handlePress}
        style={[
          bStyles.base,
          { height: s.h, paddingHorizontal: s.px, backgroundColor: v.bg, borderColor: v.border },
          variant !== 'primary' && { borderWidth: 1 },
          isDisabled && { opacity: 0.45 },
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading
          ? <ActivityIndicator size="small" color={v.text} />
          : <>
              {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
              {typeof children === 'string'
                ? <Text style={[bStyles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>{children}</Text>
                : children}
            </>
        }
      </Pressable>
    </Animated.View>
  );
}

const bStyles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, overflow: 'hidden' },
  text: { fontFamily: Typography.families.displayMedium, letterSpacing: 0.1 },
});

// ── Input ──────────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, icon, rightIcon, style, ...props }: InputProps) {
  const focused = useSharedValue(0);
  const inputProps = {
    ...props,
    value: props.value == null ? '' : String(props.value),
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(focused.value, [0, 1], [0, 1]) > 0.5
      ? Colors.brand[500]
      : error ? Colors.error : Colors.surface[300],
  }));

  return (
    <View style={{ marginBottom: error ? 4 : 0 }}>
      {label && <Text style={iStyles.label}>{label}</Text>}
      <Animated.View style={[iStyles.container, borderStyle, Boolean(error) && iStyles.errorBorder]}>
        {icon && <View style={iStyles.iconLeft}>{icon}</View>}
        <TextInput
          style={[
            iStyles.input,
            icon ? { paddingLeft: 40 } : {},
            rightIcon ? { paddingRight: 40 } : {},
            style as TextStyle,
          ]}
          placeholderTextColor={Colors.surface[500]}
          onFocus={() => { focused.value = withTiming(1, { duration: Duration.fast }); }}
          onBlur={() => { focused.value = withTiming(0, { duration: Duration.fast }); }}
          {...inputProps}
        />
        {rightIcon && <View style={iStyles.iconRight}>{rightIcon}</View>}
      </Animated.View>
      {error && <Text style={iStyles.error}>{error}</Text>}
    </View>
  );
}

const iStyles = StyleSheet.create({
  label: {
    fontFamily: Typography.families.displayMedium,
    fontSize: Typography.sizes.xs,
    color: Colors.surface[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  container: {
    backgroundColor: Colors.surface[100],
    borderWidth: 1,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing[4],
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.base,
    color: Colors.surface[900],
  },
  iconLeft: { position: 'absolute', left: 14, zIndex: 1 },
  iconRight: { position: 'absolute', right: 14, zIndex: 1 },
  error: {
    fontFamily: Typography.families.body,
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  errorBorder: { borderColor: Colors.error },
});

// ── Card ───────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  shadow?: boolean;
  noPad?: boolean;
}

export function Card({ children, style, onPress, shadow = true, noPad }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={() => { safeHaptics.selection(); onPress(); }}
        style={({ pressed }) => [
          cStyles.card,
          shadow && Shadows.md,
          !noPad && { padding: Spacing[5] },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[cStyles.card, shadow && Shadows.md, !noPad && { padding: Spacing[5] }, style]}>
      {children}
    </View>
  );
}

const cStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface[100],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surface[200],
  },
});

// ── Badge ──────────────────────────────────────────────────────────────────────
export function Badge({
  children, color = Colors.brand[500], size = 'sm',
}: {
  children: React.ReactNode; color?: string; size?: 'xs' | 'sm' | 'md';
}) {
  const sizes = { xs: { px: 6, py: 2, fs: 10 }, sm: { px: 10, py: 4, fs: 11 }, md: { px: 12, py: 5, fs: 12 } };
  const s = sizes[size];
  return (
    <View style={[baStyles.badge, {
      paddingHorizontal: s.px, paddingVertical: s.py,
      backgroundColor: color + '20', borderColor: color + '40',
    }]}>
      <Text style={[baStyles.text, { color, fontSize: s.fs }]}>{children}</Text>
    </View>
  );
}

const baStyles = StyleSheet.create({
  badge: { borderWidth: 1, borderRadius: Radius.full, alignSelf: 'flex-start' },
  text: { fontFamily: Typography.families.displayMedium, letterSpacing: 0.2 },
});

// ── Avatar ─────────────────────────────────────────────────────────────────────
import { Image } from 'react-native';

export function Avatar({
  uri, name, size = 40,
}: { uri?: string | null; name?: string; size?: number }) {
  const bg = Colors.brand[500];
  const initial = name?.[0]?.toUpperCase() ?? '?';
  return (
    <View style={[avStyles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      {uri
        ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />
        : <Text style={[avStyles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
      }
    </View>
  );
}

const avStyles = StyleSheet.create({
  container: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.brand[500] + '40' },
  initial: { color: '#fff', fontFamily: Typography.families.display },
});

// ── Skeleton ───────────────────────────────────────────────────────────────────
export function Skeleton({ width, height, borderRadius = Radius.md, style }: {
  width?: number | string; height: number; borderRadius?: number; style?: ViewStyle;
}) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    const loop = () => {
      opacity.value = withTiming(0.4, { duration: 700 }, () => {
        opacity.value = withTiming(1, { duration: 700 }, loop);
      });
    };
    loop();
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[animStyle, {
        width: width as number | undefined, height, borderRadius,
        backgroundColor: Colors.surface[200],
      }, style]}
    />
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode; title: string; description?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={emStyles.container}>
      <View style={emStyles.iconWrap}>{icon}</View>
      <Text style={emStyles.title}>{title}</Text>
      {description && <Text style={emStyles.desc}>{description}</Text>}
      {action && (
        <Button onPress={action.onPress} style={{ marginTop: Spacing[4] }}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const emStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[8], paddingVertical: Spacing[12] },
  iconWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[200], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4] },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes.lg, color: Colors.surface[900], marginBottom: 6, textAlign: 'center' },
  desc: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600], textAlign: 'center', lineHeight: 20 },
});

// ── Divider ────────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: Colors.surface[200], marginVertical: Spacing[4] }, style]} />;
}

// ── Section Header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.title}>{title}</Text>
      {action}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[4] },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
});

// ── Stat Row ───────────────────────────────────────────────────────────────────
export function StatRow({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <View style={stStyles.row}>
      {items.map((item, i) => (
        <View key={i} style={[stStyles.item, i < items.length - 1 && stStyles.border]}>
          <Text style={stStyles.value}>{item.value}</Text>
          <Text style={stStyles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const stStyles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: Colors.surface[150], borderRadius: Radius.lg, overflow: 'hidden' },
  item: { flex: 1, alignItems: 'center', paddingVertical: Spacing[4] },
  border: { borderRightWidth: 1, borderRightColor: Colors.surface[200] },
  value: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  label: { fontFamily: Typography.families.body, fontSize: Typography.sizes.xs, color: Colors.surface[600], marginTop: 2 },
});

// ── Sheet Modal ────────────────────────────────────────────────────────────────
export function SheetModal({
  visible, onClose, children, title,
}: {
  visible: boolean; onClose: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose} />
      <Animated.View entering={SlideInDown.springify().damping(20)} style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        {title && <Text style={sheetStyles.title}>{title}</Text>}
        {children}
      </Animated.View>
    </RNModal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface[100],
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[8],
    paddingTop: Spacing[3],
    minHeight: 200,
    borderTopWidth: 1,
    borderColor: Colors.surface[200],
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surface[400], alignSelf: 'center', marginBottom: Spacing[4] },
  title: { fontFamily: Typography.families.display, fontSize: Typography.sizes.lg, color: Colors.surface[900], marginBottom: Spacing[5] },
});

// ── Score Bar ──────────────────────────────────────────────────────────────────
export function ScoreBar({ score, maxScore = 50 }: { score: number; maxScore?: number }) {
  const pct = Math.min(100, (score / maxScore) * 100);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, height: 4, backgroundColor: Colors.surface[300], borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 4, backgroundColor: Colors.brand[500], borderRadius: 2 }} />
      </View>
      <Text style={{ fontFamily: Typography.families.mono, fontSize: 10, color: Colors.brand[400] }}>
        {score?.toFixed(1)}
      </Text>
    </View>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const offset = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    offset.value = withSpring(value ? 1 : 0, { damping: 18, stiffness: 200 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(offset.value, [0, 1], [2, 22]) }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: offset.value > 0.5 ? Colors.brand[500] : Colors.surface[300],
  }));

  return (
    <Pressable
      onPress={() => { safeHaptics.selection(); onValueChange(!value); }}
      style={{ width: 48, height: 28, borderRadius: 14, overflow: 'hidden' }}
    >
      <Animated.View style={[{ flex: 1, borderRadius: 14 }, bgStyle]}>
        <Animated.View style={[{
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: '#fff', position: 'absolute', top: 2,
          shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
        }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

// ── Chip ───────────────────────────────────────────────────────────────────────
export function Chip({
  label, selected, onPress, color = Colors.brand[500],
}: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => { safeHaptics.selection(); onPress(); }}
      style={[chipStyles.chip, selected && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[chipStyles.text, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surface[300], backgroundColor: Colors.surface[150], marginRight: 8, marginBottom: 8 },
  text: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[700] },
});

// ── Rating Stars ───────────────────────────────────────────────────────────────
export function RatingStars({ rating, size = 12 }: { rating: number | null; size?: number }) {
  if (!rating) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: size, color: Colors.brand[400] }}>★</Text>
      <Text style={{ fontFamily: Typography.families.bodyMedium, fontSize: size, color: Colors.surface[700] }}>
        {Number(rating).toFixed(1)}
      </Text>
    </View>
  );
}
