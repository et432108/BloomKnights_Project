import { FlatList, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, ratio } from "@/lib/format";

export default function Savings() {
  const goals = useFinanceStore((s) => s.savingsGoals);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerClassName="gap-3 p-4"
        ListEmptyComponent={
          <Text className="mt-12 text-center text-gray-400">
            No savings goals yet.
          </Text>
        }
        renderItem={({ item }) => {
          const r = ratio(item.currentAmount, item.targetAmount);
          return (
            <Card>
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </Text>
                <Text className="text-sm text-savings">
                  {Math.round(r * 100)}%
                </Text>
              </View>
              <ProgressBar value={r} color="bg-savings" />
              <View className="mt-2 flex-row justify-between">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {currency(item.currentAmount)} of{" "}
                  {currency(item.targetAmount)}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  by {new Date(item.targetDate).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
