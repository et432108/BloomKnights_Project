import { useMemo, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
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

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function DebtDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const debt = useFinanceStore((s) => s.debts.find((d) => d.id === id));
  const addPayment = useFinanceStore((s) => s.addPayment);
  // Select the stable `payments` array and derive the per-debt slice with
  // useMemo. Filtering *inside* the selector returns a new array each render,
  // which Zustand's useSyncExternalStore reads as a changed snapshot → an
  // infinite render loop.
  const allPayments = useFinanceStore((s) => s.payments);
  const payments = useMemo(
    () => allPayments.filter((p) => p.debtId === id),
    [allPayments, id]
  );

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const submit = async () => {
    const value = Number(amount);
    if (!(value > 0)) {
      setFormError("Enter a payment amount greater than 0.");
      return;
    }
    if (Number.isNaN(Date.parse(date))) {
      setFormError("Enter a valid date (YYYY-MM-DD).");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await addPayment({
        userId: debt.userId,
        debtId: debt.id,
        amount: value,
        paymentDate: new Date(date).toISOString(),
        note: note.trim() || undefined,
      });
      setAmount("");
      setNote("");
      setDate(todayIso());
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <Stack.Screen options={{ title: debt.name }} />
      <View className="gap-4 p-4">
        {/* Balance + progress */}
        <Card>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Remaining balance
            </Text>
            {isHighInterest(apr) && (
              <View className="rounded-full bg-debt px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">
                  HIGH APR
                </Text>
              </View>
            )}
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

        {/* Add a payment */}
        <Card>
          <Text className="mb-3 font-semibold text-gray-900 dark:text-white">
            Record a payment
          </Text>
          <View className="gap-3">
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Amount (e.g. 150)"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="Date (YYYY-MM-DD)"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            {formError && <Text className="text-sm text-debt">{formError}</Text>}
            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              className="rounded-full bg-brand px-6 py-3 active:opacity-80"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Add payment
                </Text>
              )}
            </Pressable>
          </View>
        </Card>

        {/* Payment history */}
        <Card>
          <Text className="mb-3 font-semibold text-gray-900 dark:text-white">
            Payment history
          </Text>
          {payments.length === 0 ? (
            <Text className="text-sm text-gray-400">No payments yet.</Text>
          ) : (
            <View className="gap-2">
              {payments.map((p) => (
                <View
                  key={p.id}
                  className="flex-row items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-medium text-gray-900 dark:text-white">
                      {currency(p.amount)}
                    </Text>
                    {p.note ? (
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {p.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {shortDate(p.paymentDate)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
