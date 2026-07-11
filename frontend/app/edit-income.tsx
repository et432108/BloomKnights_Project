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
import { upsertUserProfile } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function EditIncome() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [income, setIncome] = useState(
    profile ? String(profile.monthlyIncome || "") : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!profile) return;
    const value = Number(income);
    if (!(value >= 0)) return setError("Enter an income of 0 or more.");

    setError(null);
    setSubmitting(true);
    try {
      const updated = { ...profile, monthlyIncome: value };
      await upsertUserProfile(updated);
      setProfile(updated);
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
          <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            This is what your debt, savings, and fun-money budgets are
            calculated from.
          </Text>
          <View className="gap-3">
            <TextInput
              value={income}
              onChangeText={setIncome}
              placeholder="Monthly income (e.g. 4500)"
              keyboardType="decimal-pad"
              autoFocus
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
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
