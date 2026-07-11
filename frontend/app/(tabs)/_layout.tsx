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
        tabBarActiveTintColor: "#4F46E5",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="debts" options={{ title: "Debts" }} />
      <Tabs.Screen name="savings" options={{ title: "Savings" }} />
      <Tabs.Screen name="coaching" options={{ title: "Coach" }} />
    </Tabs>
  );
}
