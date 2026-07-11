import { Stack } from "expo-router";

export default function ExpensesStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: "#0d631b" }}>
      <Stack.Screen name="index" options={{ title: "Expenses" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Add expense", presentation: "modal" }}
      />
    </Stack>
  );
}
