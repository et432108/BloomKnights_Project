import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
} from "react-native-reanimated";
import { PieChart, type PieSlice } from "@/components/PieChart";
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency } from "@/lib/format";

type ViewKey = "Dashboard" | "Finance" | "Coach";

export default function Canvas() {
  const [active, setActive] = useState<ViewKey>("Dashboard");
  const profile = useAuthStore((s) => s.profile);
  const { debts, savingsGoals, loadAll } = useFinanceStore();

  useEffect(() => {
    if (profile?.uid) void loadAll(profile.uid);
  }, [profile?.uid]);

  const income = profile?.monthlyIncome ?? 0;
  const a = profile?.allocations;
  const debtRemaining = debts.reduce(
    (s, d) => s + Math.max(0, d.totalBalance - d.currentProgress),
    0
  );
  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const funBudget = a ? (income * a.funMoneyPercent) / 100 : 0;
  const expensesBudget = a
    ? (income *
        Math.max(
          0,
          100 - a.debtTargetPercent - a.savingsTargetPercent - a.funMoneyPercent
        )) /
      100
    : 0;

  const pieData: PieSlice[] = [
    { name: "Emergency Fund", value: income, color: "#EF4444" },
    { name: "Debt", value: debtRemaining, color: "#3B82F6" },
    { name: "Savings", value: totalSaved, color: "#22C55E" },
    { name: "Expenses", value: expensesBudget, color: "#F97316" },
    { name: "Fun Money", value: funBudget, color: "#EAB308" },
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Slim top bar with a way back to the tab app */}
      <View className="flex-row items-center px-4 pb-2 pt-12">
        <Pressable onPress={() => router.back()} className="active:opacity-60">
          <Text className="text-base font-semibold text-brand">‹ Back</Text>
        </Pressable>
      </View>

      {/* Dynamic content */}
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {active === "Dashboard" && (
          <DashboardView savings={totalSaved} pieData={pieData} />
        )}
        {active === "Finance" && (
          <FinanceView
            income={income}
            debt={debtRemaining}
            savings={totalSaved}
          />
        )}
        {active === "Coach" && <CoachView />}
      </ScrollView>

      {/* Persistent bottom navigation */}
      <View className="flex-row items-center justify-around border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        {(["Dashboard", "Finance", "Coach"] as ViewKey[]).map((item) => {
          const isActive = active === item;
          return (
            <Pressable
              key={item}
              onPress={() => setActive(item)}
              className={`rounded-xl px-4 py-2 ${
                isActive ? "bg-indigo-50 dark:bg-indigo-950" : ""
              }`}
            >
              <Text
                className={`font-bold ${
                  isActive ? "text-brand" : "text-gray-400"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DashboardView({
  savings,
  pieData,
}: {
  savings: number;
  pieData: PieSlice[];
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Text className="text-xl font-bold text-gray-900 dark:text-white">
        Current Savings
      </Text>
      <Text className="mb-6 text-xl font-bold text-savings">
        {currency(savings)}
      </Text>

      {/* Coach avatar + thought bubble */}
      <View className="mb-10 flex-row items-center gap-4">
        <View className="h-16 w-16 rounded-full bg-gray-300 dark:bg-gray-600" />
        <View className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            Can I catch a break?
          </Text>
        </View>
      </View>

      {/* Animated donut + legend */}
      <View className="items-center">
        <PieChart data={pieData} />
      </View>
      <View className="mt-6 gap-2">
        {pieData.map((s) => (
          <View key={s.name} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {s.name}
              </Text>
            </View>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {currency(s.value)}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function FinanceView({
  income,
  debt,
  savings,
}: {
  income: number;
  debt: number;
  savings: number;
}) {
  const rows: { label: string; value: number; onAdd?: () => void }[] = [
    { label: "Salary", value: income },
    { label: "Debts", value: debt, onAdd: () => router.push("/debts/new") },
    { label: "Savings", value: savings },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      className="rounded-3xl border-2 border-gray-900 bg-white p-8 shadow-xl dark:border-gray-100 dark:bg-gray-800"
    >
      <View className="mb-8 flex-row items-center justify-between">
        <Text className="text-3xl font-black text-gray-900 dark:text-white">
          Finances
        </Text>
        <Pressable onPress={() => void signOut()}>
          <Text className="font-medium text-gray-500 dark:text-gray-400">
            Sign Out
          </Text>
        </Pressable>
      </View>

      {rows.map((row, i) => (
        <Animated.View
          key={row.label}
          entering={FadeInLeft.delay(i * 120).duration(300)}
          className="mb-6 flex-row items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700"
        >
          <View>
            <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {row.label}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {currency(row.value)}
            </Text>
          </View>
          <Pressable
            onPress={row.onAdd}
            className="h-8 w-8 items-center justify-center rounded-lg bg-gray-900 active:bg-gray-700 dark:bg-gray-100"
          >
            <Text className="font-bold text-white dark:text-gray-900">+</Text>
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function CoachView() {
  return (
    <Animated.View entering={FadeIn.duration(300)} className="items-center p-8">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white">
        Coach Module
      </Text>
      <Text className="mt-1 text-center text-gray-500 dark:text-gray-400">
        Your personalized financial coaching awaits.
      </Text>
      <Pressable
        onPress={() => router.push("/coaching")}
        className="mt-6 rounded-full bg-brand px-6 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-white">Open the Coach</Text>
      </Pressable>
    </Animated.View>
  );
}
