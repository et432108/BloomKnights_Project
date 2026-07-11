import { useMemo, useState } from "react";
import { Link, Stack } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, monthsLabel, shortDate } from "@/lib/format";
import { buildPayoffPlan, computeMonthlyPayments } from "@/lib/debt";
import { currentMonthKey, provisionThisMonth } from "@/services/provisioning";

export default function PayoffPlanScreen() {
  const profile = useAuthStore((s) => s.profile);
  const debts = useFinanceStore((s) => s.debts);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);

  const fixedTotal = useMemo(
    () => fixedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [fixedExpenses]
  );

  const plan = useMemo(() => {
    if (!profile) return null;
    return buildPayoffPlan(
      debts,
      profile.monthlyIncome,
      profile.allocations.debtTargetPercent,
      fixedTotal
    );
  }, [debts, profile, fixedTotal]);

  // This month's cash split — what "Provision" will actually apply to balances.
  const thisMonthPayments = useMemo(
    () =>
      profile
        ? computeMonthlyPayments(
            debts,
            profile.monthlyIncome,
            profile.allocations.debtTargetPercent,
            fixedTotal
          )
        : [],
    [debts, profile, fixedTotal]
  );
  const provisionTotal = thisMonthPayments.reduce((s, p) => s + p.amount, 0);
  const alreadyProvisioned = profile?.lastProvisionedMonth === currentMonthKey();
  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  const [busy, setBusy] = useState(false);

  const runProvision = async () => {
    setBusy(true);
    try {
      const res = await provisionThisMonth();
      if (res.status === "done") {
        Alert.alert(
          "Payments provisioned",
          `Applied ${currency(res.totalApplied)} across ${res.payments.length} debt${
            res.payments.length === 1 ? "" : "s"
          } for ${monthName}.`
        );
      } else if (res.status === "already") {
        Alert.alert("Already provisioned", `You've already provisioned ${monthName}.`);
      } else {
        Alert.alert("Nothing to provision", "There are no payments to apply right now.");
      }
    } catch (err) {
      Alert.alert("Couldn't provision", (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmProvision = () => {
    Alert.alert(
      `Provision ${monthName}?`,
      `Apply ${currency(provisionTotal)} across your debts now? This records the payments against your balances.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Provision", onPress: () => void runProvision() },
      ]
    );
  };

  if (!profile || !plan) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Stack.Screen options={{ title: "Payoff plan" }} />
        <Text className="text-gray-400">Loading…</Text>
      </View>
    );
  }

  const thisMonth = plan.schedule[0];
  const hasWarning = plan.shortfall > 0 || plan.revolvingShortfall > 0;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen options={{ title: "Payoff plan" }} />

      {hasWarning && (
        <View className="mx-4 mt-4 rounded-xl bg-debt/10 p-3">
          {plan.shortfall > 0 && (
            <Text className="text-sm text-debt">
              Your debt budget ({currency(plan.debtBudget)}/mo) doesn&apos;t
              cover required payments (mortgage/car loan) by{" "}
              {currency(plan.shortfall)}. Consider raising your debt
              allocation percentage.
            </Text>
          )}
          {plan.revolvingShortfall > 0 && (
            <Text className="mt-1 text-sm text-debt">
              What&apos;s left after required payments (
              {currency(plan.revolvingBudget)}/mo) doesn&apos;t even cover
              minimums on your other debts by{" "}
              {currency(plan.revolvingShortfall)}/mo — those balances will
              grow.
            </Text>
          )}
          <Link href="/edit-allocations" asChild>
            <Pressable className="mt-2 active:opacity-60">
              <Text className="text-sm font-semibold text-brand">
                Adjust budget split →
              </Text>
            </Pressable>
          </Link>
        </View>
      )}

      <View className="p-4 pb-0">
        <Card>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Debt-free in
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {plan.debtFreeDate
              ? monthsLabel(plan.monthsToDebtFree)
              : `30+ yrs at this rate`}
          </Text>
          {plan.debtFreeDate && (
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              around {shortDate(plan.debtFreeDate)} · ≈
              {currency(plan.totalInterestPaid)} total interest
            </Text>
          )}
          <View className="mt-3 flex-row justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Income − fixed bills
            </Text>
            <Text className="text-xs font-medium text-gray-900 dark:text-white">
              {currency(plan.discretionaryIncome)}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Debt budget ({profile.allocations.debtTargetPercent}%)
            </Text>
            <Text className="text-xs font-medium text-gray-900 dark:text-white">
              {currency(plan.debtBudget)}
            </Text>
          </View>
        </Card>
      </View>

      {debts.length > 0 && provisionTotal > 0 && (
        <View className="px-4 pt-3">
          {alreadyProvisioned ? (
            <View className="rounded-full bg-savings/15 px-6 py-3">
              <Text className="text-center text-base font-semibold text-savings">
                ✓ Provisioned for {monthName}
              </Text>
            </View>
          ) : (
            <Pressable
              disabled={busy}
              onPress={confirmProvision}
              className="rounded-full bg-brand px-6 py-3 active:opacity-80"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Provision {currency(provisionTotal)} for {monthName}
                </Text>
              )}
            </Pressable>
          )}
          <Text className="mt-1.5 text-center text-xs text-gray-400">
            Applies each debt&apos;s payment below to its balance.
          </Text>
        </View>
      )}

      {debts.length === 0 ? (
        <Text className="mt-12 text-center text-gray-400">
          Add a debt to see your payoff plan.
        </Text>
      ) : (
        <FlatList
          data={plan.schedule}
          keyExtractor={(row) => String(row.month)}
          contentContainerClassName="gap-3 p-4"
          ListHeaderComponent={
            thisMonth ? (
              <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Pay this much, every month
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Card>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-semibold text-gray-900 dark:text-white">
                  {index === 0 ? "This month" : `Month ${item.month}`}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {shortDate(item.date)} · {currency(item.totalPaid)} total
                </Text>
              </View>
              <View className="gap-1.5">
                {item.lines.map((line) => (
                  <View
                    key={line.debtId}
                    className="flex-row items-center justify-between"
                  >
                    <Text className="text-sm text-gray-700 dark:text-gray-200">
                      {line.name}
                      {line.isRequired ? " (required)" : ""}
                    </Text>
                    <Text className="text-sm font-medium text-gray-900 dark:text-white">
                      {currency(line.payment)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
