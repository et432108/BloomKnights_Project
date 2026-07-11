import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, percent } from "@/lib/format";

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const { debts, savingsGoals, transactions, loadAll } = useFinanceStore();

  useEffect(() => {
    if (profile?.uid) void loadAll(profile.uid);
  }, [profile?.uid]);

  if (!profile) return null;

  const income = profile.monthlyIncome;
  const { debtTargetPercent, savingsTargetPercent, funMoneyPercent } =
    profile.allocations;

  const funSpent = transactions
    .filter((t) => t.bucket === "fun_money" && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const funBudget = (income * funMoneyPercent) / 100;
  const funRatio = funBudget ? funSpent / funBudget : 0;
  const overFun = funSpent > funBudget;

  const totalDebt = debts.reduce((s, d) => s + d.totalBalance, 0);
  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalSavingsTarget = savingsGoals.reduce(
    (s, g) => s + g.targetAmount,
    0
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="gap-4 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Hi, {profile.displayName.split(" ")[0]}
          </Text>
          <Pressable onPress={() => void signOut()}>
            <Text className="text-sm font-medium text-brand">Sign out</Text>
          </Pressable>
        </View>

        <Card>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Monthly income
          </Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            {currency(income)}
          </Text>
        </Card>

        {/* Bucket 1 — Debt */}
        <Card>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-gray-900 dark:text-white">
              🗡️ Debt Repayment
            </Text>
            <Text className="text-debt">{percent(debtTargetPercent)}</Text>
          </View>
          <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {currency(totalDebt)} <Text className="text-sm">remaining</Text>
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {currency((income * debtTargetPercent) / 100)}/mo allocated across{" "}
            {debts.length} balance{debts.length === 1 ? "" : "s"}
          </Text>
        </Card>

        {/* Bucket 2 — Savings */}
        <Card>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-gray-900 dark:text-white">
              🌱 Savings Goals
            </Text>
            <Text className="text-savings">{percent(savingsTargetPercent)}</Text>
          </View>
          <ProgressBar
            value={totalSavingsTarget ? totalSaved / totalSavingsTarget : 0}
            color="bg-savings"
          />
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {currency(totalSaved)} of {currency(totalSavingsTarget)} saved
          </Text>
        </Card>

        {/* Bucket 3 — Fun Money */}
        <Card>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-gray-900 dark:text-white">
              🎉 Fun Money
            </Text>
            <Text className="text-fun">{percent(funMoneyPercent)}</Text>
          </View>
          <ProgressBar
            value={funRatio}
            color={overFun ? "bg-debt" : "bg-fun"}
          />
          <Text
            className={`mt-2 text-xs ${
              overFun ? "text-debt" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {currency(funSpent)} of {currency(funBudget)} spent
            {overFun ? " — over budget!" : ""}
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}
