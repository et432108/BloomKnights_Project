import { Link, Stack } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency } from "@/lib/format";

export default function ExpensesList() {
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const removeFixedExpense = useFinanceStore((s) => s.removeFixedExpense);
  const total = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/expenses/new" asChild>
              <Pressable className="px-2 active:opacity-60">
                <Text className="text-base font-semibold text-brand">+ Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <View className="p-4 pb-0">
        <Card>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Total fixed expenses / mo
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {currency(total)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Rent, insurance, subscriptions — recurring bills that aren&apos;t
            debts. Subtracted from income before the Plan tab computes your
            debt budget.
          </Text>
        </Card>
      </View>
      <FlatList
        data={fixedExpenses}
        keyExtractor={(e) => e.id}
        contentContainerClassName="gap-3 p-4"
        ListEmptyComponent={
          <Text className="mt-12 text-center text-gray-400">
            No fixed expenses tracked yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {currency(item.amount)}/mo
                </Text>
              </View>
              <Pressable
                onPress={() => void removeFixedExpense(item.id)}
                className="px-2 py-1 active:opacity-60"
              >
                <Text className="text-sm font-medium text-debt">Remove</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
