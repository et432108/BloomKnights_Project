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

export default function NewFixedExpense() {
  const profile = useAuthStore((s) => s.profile);
  const addFixedExpense = useFinanceStore((s) => s.addFixedExpense);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!profile) return;
    if (name.trim() === "") return setError("Give the expense a name.");
    const value = Number(amount);
    if (!(value > 0)) return setError("Enter an amount greater than 0.");

    setError(null);
    setSubmitting(true);
    try {
      await addFixedExpense({
        userId: profile.uid,
        name: name.trim(),
        amount: value,
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
              placeholder="Name (e.g. Rent)"
              placeholderTextColor="#9CA3AF"
              className="rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white"
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Monthly amount (e.g. 1200)"
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
                  Add expense
                </Text>
              )}
            </Pressable>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
