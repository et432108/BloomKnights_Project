import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);

  // Protect the authenticated area.
  if (user === null) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#0d631b",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", headerShown: false }}
      />
      {/* Debts, savings, and expenses are now unified into the Finance tab. */}
      <Tabs.Screen name="finance" options={{ title: "Finance" }} />
      <Tabs.Screen name="coaching" options={{ title: "Coach" }} />

      {/* Legacy screens kept as dead code for rollback safety — hidden from the
          tab bar with href:null. Their routes stay navigable (e.g. the payoff
          plan at /(tabs)/debts/plan, linked from the Finance screen). */}
      <Tabs.Screen name="debts" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="savings" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
