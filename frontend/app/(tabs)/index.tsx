import { useEffect } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, percent } from "@/lib/format";
import { knightRank, payoffSummary } from "@/lib/debt";

/** Home hub navigation tile linking to one of the main areas. */
function QuickTile({
  href,
  emoji,
  label,
}: {
  href: "/debts" | "/savings" | "/coaching";
  emoji: string;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable className="flex-1 active:opacity-80">
        <View className="items-center rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="text-2xl">{emoji}</Text>
          <Text className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-200">
            {label}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function Bucket({
  title,
  percentLabel,
  color,
  children,
}: {
  title: string;
  percentLabel: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold text-gray-900 dark:text-white">
          {title}
        </Text>
        <Text className={color}>{percentLabel}</Text>
      </View>
      {children}
    </Card>
  );
}

export default function Home() {
  const profile = useAuthStore((s) => s.profile);
  const { debts, savingsGoals, transactions, payments, loadAll } =
    useFinanceStore();

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

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalSavingsTarget = savingsGoals.reduce(
    (s, g) => s + g.targetAmount,
    0
  );

  const journey = payoffSummary(debts);
  const rank = knightRank(journey.ratio);

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

        {/* Gamified debt-free quest — the hub's centerpiece */}
        <View className="rounded-2xl bg-brand p-5 shadow-sm">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
              Debt-free quest
            </Text>
            <View className="rounded-full bg-white/20 px-2 py-0.5">
              <Text className="text-[11px] font-bold text-white">🛡️ {rank}</Text>
            </View>
          </View>
          <Text className="mb-3 text-3xl font-extrabold text-white">
            {debts.length === 0
              ? "No debts — you're free!"
              : journey.remaining === 0
                ? "Debt-free! 🎉"
                : `${currency(journey.remaining)} to go`}
          </Text>
          <ProgressBar value={journey.ratio} color="bg-white" />
          <Text className="mt-2 text-xs text-indigo-100">
            {percent(journey.ratio * 100)} paid ·{" "}
            {currency(journey.totalPaid)} of {currency(journey.totalOriginal)} ·{" "}
            {payments.length} payment{payments.length === 1 ? "" : "s"} logged
          </Text>
        </View>

        {/* Quick navigation to the main areas */}
        <View className="flex-row gap-3">
          <QuickTile href="/debts" emoji="🗡️" label="Debts" />
          <QuickTile href="/savings" emoji="🌱" label="Savings" />
          <QuickTile href="/coaching" emoji="🤖" label="Coach" />
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
        <Bucket
          title="🗡️ Debt Repayment"
          percentLabel={percent(debtTargetPercent)}
          color="text-debt"
        >
          <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {currency(journey.remaining)} <Text className="text-sm">remaining</Text>
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {currency((income * debtTargetPercent) / 100)}/mo allocated across{" "}
            {debts.length} balance{debts.length === 1 ? "" : "s"}
          </Text>
        </Bucket>

        {/* Bucket 2 — Savings */}
        <Bucket
          title="🌱 Savings Goals"
          percentLabel={percent(savingsTargetPercent)}
          color="text-savings"
        >
          <ProgressBar
            value={totalSavingsTarget ? totalSaved / totalSavingsTarget : 0}
            color="bg-savings"
          />
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {currency(totalSaved)} of {currency(totalSavingsTarget)} saved
          </Text>
        </Bucket>

        {/* Bucket 3 — Fun Money */}
        <Bucket
          title="🎉 Fun Money"
          percentLabel={percent(funMoneyPercent)}
          color="text-fun"
        >
          <ProgressBar value={funRatio} color={overFun ? "bg-debt" : "bg-fun"} />
          <Text
            className={`mt-2 text-xs ${
              overFun ? "text-debt" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {currency(funSpent)} of {currency(funBudget)} spent
            {overFun ? " — over budget!" : ""}
          </Text>
        </Bucket>
      </View>
    </ScrollView>
  );
}
