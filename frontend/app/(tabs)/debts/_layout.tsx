import { Stack } from "expo-router";

export default function DebtsStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: "#4F46E5" }}>
      <Stack.Screen name="index" options={{ title: "Debts" }} />
      <Stack.Screen name="[id]" options={{ title: "Debt" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Add debt", presentation: "modal" }}
      />
    </Stack>
  );
}
