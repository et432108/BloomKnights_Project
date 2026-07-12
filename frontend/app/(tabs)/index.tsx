import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { ProgressBar } from "@/components/ProgressBar";
import { DonutChart } from "@/components/DonutChart";
import { DebtFacts } from "@/components/DebtFacts";
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, percent } from "@/lib/format";
import {
  payoffForDebt,
  projectedPayoffSummary,
  remainingBalance,
} from "@/lib/debt";
import { computeDashboardAllocation } from "@/lib/dashboard";

type Range = "annual" | "month";

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const debts = useFinanceStore((s) => s.debts);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const transactions = useFinanceStore((s) => s.transactions);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const recordBalanceSnapshot = useFinanceStore((s) => s.recordBalanceSnapshot);

  const [range, setRange] = useState<Range>("month");

  const income = profile?.monthlyIncome ?? 0;
  const fixedTotal = useMemo(
    () => fixedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [fixedExpenses]
  );

  const allocation = useMemo(
    () =>
      profile
        ? computeDashboardAllocation(
            income,
            fixedTotal,
            profile.allocations,
            savingsGoals,
            debts
          )
        : null,
    [profile, income, fixedTotal, savingsGoals, debts]
  );

  // Project debt progress to the end of the selected period — one month for the
  // Monthly tab, twelve for Annual — so the indicator shows the % paid off by
  // month-end / year-end rather than today's progress.
  const journeyMonths = range === "annual" ? 12 : 1;
  const journey = useMemo(
    () =>
      projectedPayoffSummary(
        debts,
        income,
        profile?.allocations.debtTargetPercent ?? 0,
        fixedTotal,
        journeyMonths
      ),
    [debts, income, profile, fixedTotal, journeyMonths]
  );

  // Record this month's balance once we know the income, so history accrues.
  useEffect(() => {
    if (income > 0) void recordBalanceSnapshot(income);
  }, [income, recordBalanceSnapshot]);

  // Notification alerts derived from current data.
  const alerts = useMemo(() => {
    const out: string[] = [];
    const funBudget = allocation?.slices.find((s) => s.key === "fun")?.amount ?? 0;
    const funSpent = transactions
      .filter((t) => t.bucket === "fun_money" && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    if (funBudget > 0 && funSpent > funBudget) {
      out.push(
        `Fun money over budget: ${currency(funSpent)} spent of ${currency(funBudget)}.`
      );
    }
    for (const d of debts) {
      if (remainingBalance(d) > 0 && !payoffForDebt(d).paidOff) {
        out.push(`${d.name}: the minimum payment doesn't cover its interest.`);
      }
    }
    return out;
  }, [allocation, transactions, debts]);

  if (!profile || !allocation) return null;

  const factor = range === "annual" ? 12 : 1;

  // Split the budget legend into required (must-pay) vs discretionary groups.
  const requiredSlices = allocation.slices.filter(
    (s) => s.group === "required" && s.amount > 0
  );
  const discretionarySlices = allocation.slices.filter(
    (s) => s.group === "discretionary" && s.amount > 0
  );
  const discretionaryAllocated = Math.max(
    0,
    allocation.total - allocation.requiredObligations
  );
  const overBudget = allocation.total > allocation.income;

  const openNotifications = () =>
    Alert.alert(
      alerts.length ? "Alerts" : "All clear",
      alerts.length ? alerts.join("\n\n") : "No alerts right now."
    );

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-gray-900">
      <ScrollView contentContainerClassName="mx-auto w-full max-w-6xl gap-6 p-4 pb-10">
        {/* Top bar */}
        <View className="flex-row items-center justify-between">
          <Text className="font-headline text-3xl font-bold text-on-surface dark:text-white">
            Dashboard
          </Text>
          <View className="flex-row items-center gap-2">
            <Link href="/(tabs)/debts/plan" asChild>
              <Pressable className="flex-row items-center gap-1 rounded-full border border-primary px-3 py-1.5 active:opacity-70">
                <MaterialIcons name="insights" size={18} color="#0d631b" />
                <Text className="text-sm font-bold text-primary">Payoff plan</Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={openNotifications}
              className="relative rounded-full p-2 active:bg-surface-container"
            >
              <MaterialIcons name="notifications-none" size={24} color="#40493d" />
              {alerts.length > 0 && (
                <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-error" />
              )}
            </Pressable>
            <Pressable onPress={() => void signOut()} className="px-2 active:opacity-60">
              <Text className="text-sm font-bold text-primary">Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Filters + debt progress */}
        <View className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <View className="flex-row items-center gap-2 self-start rounded-full border border-outline-variant bg-surface-container p-1">
            {(["annual", "month"] as Range[]).map((r) => {
              const active = range === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  className={`rounded-full px-6 py-1.5 ${active ? "bg-primary" : ""}`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      active ? "text-on-primary" : "text-on-surface-variant"
                    }`}
                  >
                    {r === "annual" ? "Annual" : "Monthly"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="min-w-[260px] rounded-xl border border-outline-variant bg-white p-4 dark:bg-gray-800">
            <View className="mb-2 flex-row items-end justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant dark:text-gray-400">
                Debt · {percent(journey.ratio * 100)} paid by{" "}
                {range === "annual" ? "year-end" : "month-end"}
              </Text>
              <Text className="text-sm font-bold text-primary">
                {currency(journey.remaining)} left
              </Text>
            </View>
            <ProgressBar value={journey.ratio} color="bg-primary" />
          </View>
        </View>

        {/* Fund allocation */}
        <View className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm dark:bg-gray-800">
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-gray-400">
                Overview
              </Text>
              <Text className="font-headline text-2xl font-bold text-on-surface dark:text-white">
                Fund Allocation
              </Text>
            </View>
          </View>

          <View className="items-center gap-8 lg:flex-row lg:items-center lg:justify-center">
            <DonutChart
              segments={allocation.slices.map((s) => ({
                value: s.amount,
                color: s.color,
              }))}
              size={260}
              strokeWidth={28}
            >
              <Text className="font-display text-4xl font-bold text-on-surface dark:text-white">
                {currency(allocation.total * factor)}
              </Text>
              <Text className="text-on-surface-variant dark:text-gray-400">
                {range === "annual" ? "Total / yr" : "Total Budget"}
              </Text>
            </DonutChart>

            <View className="w-full gap-5 lg:max-w-md lg:flex-1">
              {(
                [
                  {
                    name: "Required",
                    caption: "Must-pay — set aside first",
                    slices: requiredSlices,
                    subtotal: allocation.requiredObligations,
                  },
                  {
                    name: "Discretionary",
                    caption: "What's left to allocate",
                    slices: discretionarySlices,
                    subtotal: discretionaryAllocated,
                  },
                ] as const
              ).map((group) =>
                group.slices.length === 0 ? null : (
                  <View key={group.name} className="gap-2">
                    <View className="flex-row items-baseline justify-between">
                      <View>
                        <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-gray-400">
                          {group.name}
                        </Text>
                        <Text className="text-[11px] text-on-surface-variant/70 dark:text-gray-500">
                          {group.caption}
                        </Text>
                      </View>
                      <Text className="font-display text-base font-bold text-on-surface dark:text-white">
                        {currency(group.subtotal * factor)}
                      </Text>
                    </View>
                    {group.slices.map((s) => (
                      <View
                        key={s.key}
                        className="flex-row items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <View className="flex-1 flex-row items-center gap-3">
                          <View
                            style={{ backgroundColor: s.color }}
                            className="h-4 w-4 rounded-full"
                          />
                          <Text className="text-base font-medium text-on-surface dark:text-white">
                            {s.label}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-bold text-on-surface dark:text-white">
                            {currency(s.amount * factor)}
                          </Text>
                          <Text className="text-xs text-on-surface-variant dark:text-gray-400">
                            {percent(s.percent)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              )}
            </View>
          </View>

          {/* Why the total can exceed the discretionary budget */}
          {allocation.requiredDebtPayments > 0 && (
            <View className="mt-6 flex-row gap-3 rounded-2xl bg-surface-container p-4 dark:bg-gray-900">
              <MaterialIcons name="info-outline" size={20} color="#6366f1" />
              <Text className="flex-1 text-sm leading-relaxed text-on-surface-variant dark:text-gray-300">
                Required payments — fixed expenses (
                {currency(allocation.fixedBills * factor)}) plus required debt (
                {currency(allocation.requiredDebtPayments * factor)}) — come out of
                income first. The remaining{" "}
                {currency(allocation.discretionary * factor)} is your discretionary
                budget. That's why the total ({currency(allocation.total * factor)}) is
                larger than the discretionary number.
              </Text>
            </View>
          )}
          {overBudget && (
            <View className="mt-3 flex-row gap-3 rounded-2xl border border-error/30 bg-error/5 p-4">
              <MaterialIcons name="warning-amber" size={20} color="#ba1a1a" />
              <Text className="flex-1 text-sm font-medium leading-relaxed text-on-surface dark:text-gray-200">
                Your required obligations exceed your income this{" "}
                {range === "annual" ? "year" : "month"} by{" "}
                {currency((allocation.total - allocation.income) * factor)}. Consider
                trimming fixed expenses or revisiting your plan with the Coach.
              </Text>
            </View>
          )}
        </View>

        {/* Fun facts about household debt */}
        <DebtFacts />
      </ScrollView>
    </SafeAreaView>
  );
}
