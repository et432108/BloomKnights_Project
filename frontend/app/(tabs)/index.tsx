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
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, currentMonthKey, percent } from "@/lib/format";
import { payoffForDebt, payoffSummary, remainingBalance } from "@/lib/debt";
import { computeBalanceTrend, computeDashboardAllocation } from "@/lib/dashboard";

type Range = "annual" | "month";

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const debts = useFinanceStore((s) => s.debts);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const transactions = useFinanceStore((s) => s.transactions);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const balanceSnapshots = useFinanceStore((s) => s.balanceSnapshots);
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

  const journey = useMemo(() => payoffSummary(debts), [debts]);

  // Total balance = this month's budget total (= income). Trend compares it to
  // the most recent prior monthly snapshot.
  const trend = useMemo(
    () => computeBalanceTrend(balanceSnapshots, currentMonthKey(), income),
    [balanceSnapshots, income]
  );

  // Record this month's balance once we know the income, so trends accrue.
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
                Debt · {percent(journey.ratio * 100)} paid
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

            <View className="w-full gap-3 lg:max-w-md lg:flex-1">
              {allocation.slices.map((s) => (
                <View
                  key={s.key}
                  className="flex-row items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <View className="flex-row items-center gap-3">
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
          </View>
        </View>

        {/* Total balance + AI insight */}
        <View className="rounded-2xl border border-primary/20 bg-primary-container/20 p-6 dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 gap-4 md:flex-row md:items-start md:justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-primary">
                Total Balance
              </Text>
              <View className="flex-row items-baseline gap-2">
                <Text className="font-display text-4xl font-bold text-primary">
                  {currency(income * factor)}
                </Text>
                {trend.deltaPct != null ? (
                  <View className="flex-row items-center rounded-full bg-secondary-container px-2 py-0.5">
                    <MaterialIcons
                      name={trend.deltaPct >= 0 ? "trending-up" : "trending-down"}
                      size={16}
                      color="#2a6b2c"
                    />
                    <Text className="ml-1 text-sm font-bold text-secondary">
                      {trend.deltaPct >= 0 ? "+" : ""}
                      {trend.deltaPct.toFixed(1)}%
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-on-surface-variant dark:text-gray-400">
                    no trend yet
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="auto-awesome" size={18} color="#0d631b" />
              <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                AI Personal Insight
              </Text>
            </View>
          </View>
          <Text className="text-base leading-relaxed text-on-surface-variant dark:text-gray-300">
            Your monthly plan puts {currency(allocation.slices[1].amount)} toward
            debt and {currency(allocation.slices[3].amount + allocation.slices[4].amount)}{" "}
            into savings. Ask the Coach for tailored guidance on hitting your goals
            faster.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
