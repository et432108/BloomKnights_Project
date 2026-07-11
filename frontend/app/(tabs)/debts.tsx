import { FlatList, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, percent, ratio } from "@/lib/format";

export default function Debts() {
  const debts = useFinanceStore((s) => s.debts);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={debts}
        keyExtractor={(d) => d.id}
        contentContainerClassName="gap-3 p-4"
        ListEmptyComponent={
          <Text className="mt-12 text-center text-gray-400">
            No debts tracked yet.
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {item.name}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {percent(item.interestRate)} APR
              </Text>
            </View>
            <ProgressBar
              value={ratio(item.currentProgress, item.totalBalance)}
              color="bg-debt"
            />
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {currency(item.currentProgress)} paid of{" "}
                {currency(item.totalBalance)}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                min {currency(item.minimumPayment)}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
