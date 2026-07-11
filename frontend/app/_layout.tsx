import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { subscribeToAuth } from "@/services/auth";

export default function RootLayout() {
  useEffect(() => {
    // Mirror Firebase Auth state into the Zustand store for the app's lifetime.
    const unsubscribe = subscribeToAuth();
    return unsubscribe;
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
