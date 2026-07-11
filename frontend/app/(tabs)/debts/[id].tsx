import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, monthsLabel, percent, ratio, shortDate } from "@/lib/format";
import {
  effectiveApr,
  isHighInterest,
  payoffDateFromMonths,
  payoffForDebt,
  remainingBalance,
} from "@/lib/debt";

export default function DebtDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useFinanceStore((s) => s.debts.find((d) => d.id === id));

  if (!debt) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Stack.Screen options={{ title: "Debt" }} />
        <Text className="text-gray-400">Debt not found.</Text>
      </View>
    );
  }

  const apr = effectiveApr(debt);
  const remaining = remainingBalance(debt);
  const payoff = payoffForDebt(debt);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen options={{ title: debt.name }} />
      <View className="gap-4 p-4">
        {/* Balance + progress */}
        <Card>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Remaining balance
            </Text>
            <View className="flex-row items-center gap-2">
              {debt.isRequired && (
                <View className="rounded-full bg-gray-200 px-2 py-0.5 dark:bg-gray-700">
                  <Text className="text-[10px] font-bold text-gray-700 dark:text-gray-200">
                    REQUIRED
                  </Text>
                </View>
              )}
              {isHighInterest(apr) && (
                <View className="rounded-full bg-debt px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-white">
                    HIGH APR
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            {currency(remaining)}
          </Text>
          <ProgressBar
            value={ratio(debt.currentProgress, debt.totalBalance)}
            color="bg-debt"
          />
          <View className="mt-2 flex-row justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {currency(debt.currentProgress)} paid of{" "}
              {currency(debt.totalBalance)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {percent(apr)} APR · min {currency(debt.minimumPayment)}
            </Text>
          </View>
        </Card>

        {/* Interest-aware payoff guidance */}
        <Card>
          <Text className="mb-2 font-semibold text-gray-900 dark:text-white">
            Payoff outlook
          </Text>
          {payoff.paidOff ? (
            <>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                At the {currency(debt.minimumPayment)}/mo minimum, this is paid
                off in about{" "}
                <Text className="font-semibold">
                  {monthsLabel(payoff.months)}
                </Text>{" "}
                ({shortDate(payoffDateFromMonths(payoff.months))}).
              </Text>
              <View className="mt-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                <Text className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  {currency(remaining)} @ {percent(apr)} APR ≈{" "}
                  {currency(payoff.totalInterest)} total interest
                </Text>
              </View>
            </>
          ) : (
            <Text className="text-sm text-debt">
              The {currency(debt.minimumPayment)}/mo minimum doesn&apos;t cover
              the monthly interest at {percent(apr)} APR — the balance will grow.
              Increase the payment to make progress.
            </Text>
          )}
        </Card>

        <Text className="px-1 text-xs text-gray-400">
          See the Plan tab for how much to actually put toward this debt each
          month, based on your income and other obligations.
        </Text>
      </View>
    </View>
  );
}
