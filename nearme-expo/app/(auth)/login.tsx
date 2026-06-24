import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi, TokenStorage } from '@/api';
import { useAuthStore } from '@/store';
import { Button, Input } from '@/components/ui';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { useToast, extractApiError } from '@/hooks';
import { MapPin, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';

interface FormData { email: string; password: string; }

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const toast = useToast();
  const [showPass, setShowPass] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login({ ...data, device_info: { platform: Platform.OS } });
      const { user, accessToken, refreshToken } = res.data.data;
      await setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.display_name}!`);
      router.replace('/(app)/(tabs)/feed');
    } catch (e) {
      toast.error(extractApiError(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[0] }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Glow */}
          <View style={styles.glow} pointerEvents="none">
            <LinearGradient
              colors={[`${Colors.brand[500]}25`, 'transparent']}
              style={{ flex: 1 }}
            />
          </View>

          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <MapPin size={28} color="#fff" />
            </View>
            <Text style={styles.logoText}>NearMe</Text>
          </Animated.View>

          {/* Heading */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.headingWrap}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in to discover places near you</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.form}>
            <Controller
              control={control}
              name="email"
              rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                  icon={<Mail size={17} color={Colors.surface[500]} />}
                />
              )}
            />

            <View style={{ marginTop: Spacing[4] }}>
              <Controller
                control={control}
                name="password"
                rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="••••••••"
                    secureTextEntry={!showPass}
                    error={errors.password?.message}
                    icon={<Lock size={17} color={Colors.surface[500]} />}
                    rightIcon={
                      <Pressable onPress={() => setShowPass(s => !s)} hitSlop={10}>
                        {showPass
                          ? <EyeOff size={17} color={Colors.surface[500]} />
                          : <Eye size={17} color={Colors.surface[500]} />
                        }
                      </Pressable>
                    }
                  />
                )}
              />
            </View>

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              style={{ marginTop: Spacing[6] }}
              size="lg"
            >
              Sign in
            </Button>
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Create one</Text>
              </Pressable>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: Spacing[6], paddingTop: Spacing[8] },
  glow: {
    position: 'absolute', top: -100, left: -100, right: -100, height: 400,
    borderRadius: 300,
  },
  logoWrap: { alignItems: 'center', marginBottom: Spacing[10] },
  logoIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing[3],
    shadowColor: Colors.brand[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  logoText: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes['3xl'],
    color: Colors.surface[900],
  },
  headingWrap: { marginBottom: Spacing[8] },
  heading: {
    fontFamily: Typography.families.display,
    fontSize: Typography.sizes['2xl'],
    color: Colors.surface[900],
    marginBottom: 6,
  },
  subheading: { fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[600] },
  form: {
    backgroundColor: Colors.surface[100], borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.surface[200],
    padding: Spacing[6], marginBottom: Spacing[6],
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing[8] },
  footerText: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  footerLink: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
});
