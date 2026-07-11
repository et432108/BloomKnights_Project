import { Link, Stack } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, monthsLabel, percent, ratio } from "@/lib/format";
import {
  effectiveApr,
  isHighInterest,
  payoffForDebt,
  remainingBalance,
} from "@/lib/debt";

export default function DebtsList() {
  const debts = useFinanceStore((s) => s.debts);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/debts/new" asChild>
              <Pressable className="px-2 active:opacity-60">
                <Text className="text-base font-semibold text-brand">+ Add</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={debts}
        keyExtractor={(d) => d.id}
        contentContainerClassName="gap-3 p-4"
        ListEmptyComponent={
          <Text className="mt-12 text-center text-gray-400">
            No debts tracked yet.
          </Text>
        }
        renderItem={({ item }) => {
          const apr = effectiveApr(item);
          const payoff = payoffForDebt(item);
          return (
            <Link
              href={{ pathname: "/debts/[id]", params: { id: item.id } }}
              asChild
            >
              <Pressable className="active:opacity-80">
                <Card>
                  <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {isHighInterest(apr) && (
                        <View className="rounded-full bg-debt px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-white">
                            HIGH APR
                          </Text>
                        </View>
                      )}
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {percent(apr)} APR
                      </Text>
                    </View>
                  </View>
                  <ProgressBar
                    value={ratio(item.currentProgress, item.totalBalance)}
                    color="bg-debt"
                  />
                  <View className="mt-2 flex-row justify-between">
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {currency(remainingBalance(item))} left of{" "}
                      {currency(item.totalBalance)}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {payoff.paidOff
                        ? `~${monthsLabel(payoff.months)} to payoff`
                        : "min < interest"}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}
