import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ALLOCATION_TOTAL,
  allocationAmount,
  clampPercent,
  isValidAllocations,
} from "@/lib/allocations";
import { currency } from "@/lib/format";

type BucketKey = "debtTargetPercent" | "savingsTargetPercent" | "funMoneyPercent";

const BUCKETS: { key: BucketKey; label: string; color: string }[] = [
  { key: "debtTargetPercent", label: "🗡️ Debt repayment", color: "text-debt" },
  { key: "savingsTargetPercent", label: "🌱 Savings", color: "text-savings" },
  { key: "funMoneyPercent", label: "🎉 Fun money", color: "text-fun" },
];

export default function EditAllocations() {
  const profile = useAuthStore((s) => s.profile);
  const setAllocations = useAuthStore((s) => s.setAllocations);

  // Edit as raw strings so the inputs can be cleared/typed freely.
  const [values, setValues] = useState<Record<BucketKey, string>>(() => ({
    debtTargetPercent: String(profile?.allocations.debtTargetPercent ?? 0),
    savingsTargetPercent: String(profile?.allocations.savingsTargetPercent ?? 0),
    funMoneyPercent: String(profile?.allocations.funMoneyPercent ?? 0),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const income = profile?.monthlyIncome ?? 0;

  const parsed = useMemo(
    () => ({
      debtTargetPercent: clampPercent(Number(values.debtTargetPercent)),
      savingsTargetPercent: clampPercent(Number(values.savingsTargetPercent)),
      funMoneyPercent: clampPercent(Number(values.funMoneyPercent)),
    }),
    [values]
  );
  const total =
    parsed.debtTargetPercent +
    parsed.savingsTargetPercent +
    parsed.funMoneyPercent;
  const valid = isValidAllocations(parsed);

  const submit = async () => {
    if (!valid) {
      setError(`Percentages must add up to ${ALLOCATION_TOTAL}% (currently ${total}%).`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await setAllocations(parsed);
      router.back();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (!profile) return null;

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="gap-4 p-4">
        <Card>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Split your {currency(income)} monthly income across the three
            buckets. These percentages drive how much of your income goes toward
            paying down debt each month.
          </Text>
        </Card>

        <Card>
          <View className="gap-4">
            {BUCKETS.map(({ key, label, color }) => (
              <View key={key}>
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                  </Text>
                  <Text className={`text-sm font-semibold ${color}`}>
                    {currency(allocationAmount(income, parsed[key]))}/mo
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={values[key]}
                    onChangeText={(text) =>
                      setValues((v) => ({ ...v, [key]: text.replace(/[^0-9]/g, "") }))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
                  />
                  <Text className="text-base text-gray-500 dark:text-gray-400">%</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
            <Text className="text-sm text-gray-500 dark:text-gray-400">Total</Text>
            <Text
              className={`text-sm font-bold ${
                valid ? "text-savings" : "text-debt"
              }`}
            >
              {total}% {valid ? "✓" : `(needs ${ALLOCATION_TOTAL}%)`}
            </Text>
          </View>
        </Card>

        {error && <Text className="text-sm text-debt">{error}</Text>}

        <Pressable
          disabled={submitting || !valid}
          onPress={() => void submit()}
          className={`rounded-full px-6 py-3 active:opacity-80 ${
            valid ? "bg-brand" : "bg-gray-300 dark:bg-gray-700"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Save split
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
