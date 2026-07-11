import { Stack } from "expo-router";

export default function DebtsStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: "#0d631b" }}>
      <Stack.Screen name="index" options={{ title: "Debts" }} />
      <Stack.Screen name="[id]" options={{ title: "Debt" }} />
      <Stack.Screen name="plan" options={{ title: "Payoff plan" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Add debt", presentation: "modal" }}
      />
    </Stack>
  );
}
