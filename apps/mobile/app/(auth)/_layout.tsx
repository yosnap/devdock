// Auth stack layout — wraps login/register screens in a Stack navigator

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
