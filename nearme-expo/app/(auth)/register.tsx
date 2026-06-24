import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { authApi, usersApi } from '@/api';
import { useAuthStore } from '@/store';
import { Button, Input } from '@/components/ui';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { useToast, extractApiError, useDebounce } from '@/hooks';
import { MapPin, Mail, Lock, User, AtSign, Check, X } from 'lucide-react-native';

interface FormData {
  display_name: string;
  handle: string;
  email: string;
  password: string;
  confirm_password: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const toast = useToast();
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      display_name: '',
      handle: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  });
  const handle = watch('handle');
  const debouncedHandle = useDebounce(handle, 500);

  useEffect(() => {
    if (debouncedHandle && /^[a-z0-9_]{3,30}$/.test(debouncedHandle)) {
      usersApi.checkHandle(debouncedHandle)
        .then(res => setHandleAvailable(res.data.data.available))
        .catch(() => setHandleAvailable(null));
    } else {
      setHandleAvailable(null);
    }
  }, [debouncedHandle]);

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirm_password) {
      toast.error('Passwords do not match'); return;
    }
    try {
      const res = await authApi.register({
        uid: `mobile_${Platform.OS}_${Date.now()}`,
        display_name: data.display_name,
        handle: data.handle.toLowerCase(),
        email: data.email,
        password: data.password,
        auth_provider: 'email',
        device_info: { platform: Platform.OS },
      });
      const { user, accessToken, refreshToken } = res.data.data;
      await setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome 🎉');
      router.replace('/(app)/(tabs)/feed');
    } catch (e) {
      toast.error(extractApiError(e));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface[0] }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoIcon}><MapPin size={24} color="#fff" /></View>
            <Text style={styles.logoText}>NearMe</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text style={styles.heading}>Create account</Text>
            <Text style={styles.subheading}>Start discovering amazing places around you</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
            {/* Display Name */}
            <Controller
              control={control}
              name="display_name"
              rules={{ required: 'Name is required', maxLength: { value: 50, message: 'Max 50 chars' } }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Display Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Alex Johnson"
                  error={errors.display_name?.message}
                  icon={<User size={17} color={Colors.surface[500]} />}
                />
              )}
            />

            {/* Handle */}
            <View style={{ marginTop: Spacing[4] }}>
              <Controller
                control={control}
                name="handle"
                rules={{
                  required: 'Handle is required',
                  pattern: { value: /^[a-z0-9_]{3,30}$/, message: '3-30 chars, lowercase, numbers, underscores' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Handle"
                    value={value}
                    onChangeText={t => onChange(t.toLowerCase())}
                    placeholder="alexj"
                    autoCapitalize="none"
                    error={errors.handle?.message}
                    icon={<AtSign size={17} color={Colors.surface[500]} />}
                    rightIcon={
                      handleAvailable !== null
                        ? handleAvailable
                          ? <Check size={17} color={Colors.success} />
                          : <X size={17} color={Colors.error} />
                        : null
                    }
                  />
                )}
              />
              {handleAvailable === false && (
                <Text style={styles.handleErr}>Handle is taken</Text>
              )}
              {handleAvailable === true && (
                <Text style={styles.handleOk}>Handle is available ✓</Text>
              )}
            </View>

            {/* Email */}
            <View style={{ marginTop: Spacing[4] }}>
              <Controller
                control={control}
                name="email"
                rules={{ required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email"
                    value={value}
                    onChangeText={onChange}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email?.message}
                    icon={<Mail size={17} color={Colors.surface[500]} />}
                  />
                )}
              />
            </View>

            {/* Password */}
            <View style={{ marginTop: Spacing[4] }}>
              <Controller
                control={control}
                name="password"
                rules={{ required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="••••••••"
                    secureTextEntry
                    error={errors.password?.message}
                    icon={<Lock size={17} color={Colors.surface[500]} />}
                  />
                )}
              />
            </View>

            {/* Confirm Password */}
            <View style={{ marginTop: Spacing[4] }}>
              <Controller
                control={control}
                name="confirm_password"
                rules={{ required: 'Please confirm password' }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Confirm Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="••••••••"
                    secureTextEntry
                    error={errors.confirm_password?.message}
                    icon={<Lock size={17} color={Colors.surface[500]} />}
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
              Create account
            </Button>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable><Text style={styles.footerLink}>Sign in</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: Spacing[6], paddingTop: Spacing[6], paddingBottom: Spacing[8] },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing[6] },
  logoIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.brand[500],
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontFamily: Typography.families.display, fontSize: Typography.sizes.xl, color: Colors.surface[900] },
  heading: { fontFamily: Typography.families.display, fontSize: Typography.sizes['2xl'], color: Colors.surface[900], marginBottom: 6 },
  subheading: { fontFamily: Typography.families.body, fontSize: Typography.sizes.base, color: Colors.surface[600], marginBottom: Spacing[6] },
  form: {
    backgroundColor: Colors.surface[100], borderRadius: Radius['2xl'],
    borderWidth: 1, borderColor: Colors.surface[200],
    padding: Spacing[6], marginBottom: Spacing[6],
  },
  handleErr: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.error, marginTop: 4 },
  handleOk: { fontFamily: Typography.families.body, fontSize: 12, color: Colors.success, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: Typography.families.body, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  footerLink: { fontFamily: Typography.families.bodySemiBold, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
});
