import { useState } from "react";
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
import { useFinanceStore } from "@/store/useFinanceStore";

export default function NewDebt() {
  const profile = useAuthStore((s) => s.profile);
  const addDebt = useFinanceStore((s) => s.addDebt);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!profile) return;
    if (name.trim() === "") return setError("Give the debt a name.");
    const totalBalance = Number(balance);
    const rate = Number(apr);
    const minimumPayment = Number(minPayment);
    if (!(totalBalance > 0)) return setError("Enter a balance greater than 0.");
    if (!(rate >= 0)) return setError("Enter a valid APR.");
    if (!(minimumPayment >= 0)) return setError("Enter a valid minimum payment.");

    setError(null);
    setSubmitting(true);
    try {
      await addDebt({
        userId: profile.uid,
        name: name.trim(),
        totalBalance,
        interestRate: rate,
        aprPercent: rate,
        minimumPayment,
        currentProgress: 0,
      });
      router.back();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="gap-4 p-4">
        <Card>
          <View className="gap-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name (e.g. Visa)"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={balance}
              onChangeText={setBalance}
              placeholder="Total balance (e.g. 4000)"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={apr}
              onChangeText={setApr}
              placeholder="APR % (e.g. 22.99)"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={minPayment}
              onChangeText={setMinPayment}
              placeholder="Minimum payment (e.g. 120)"
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            {error && <Text className="text-sm text-debt">{error}</Text>}
            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              className="rounded-full bg-brand px-6 py-3 active:opacity-80"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Add debt
                </Text>
              )}
            </Pressable>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
