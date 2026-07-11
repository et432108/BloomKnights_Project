import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { getCoaching } from "@/services/coaching";
import { useFinanceStore } from "@/store/useFinanceStore";
import type { CoachingItem, UrgencyLevel } from "@/types";

const urgencyStyles: Record<UrgencyLevel, { badge: string; label: string }> = {
  high: { badge: "bg-debt", label: "HIGH" },
  medium: { badge: "bg-amber-500", label: "MEDIUM" },
  low: { badge: "bg-savings", label: "LOW" },
};

export default function Coaching() {
  const buildSnapshot = useFinanceStore((s) => s.buildSnapshot);
  const [items, setItems] = useState<CoachingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCoaching(snapshot);
      setItems(res.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="gap-4 p-4">
        <Text className="text-gray-600 dark:text-gray-300">
          Get AI-optimized allocation advice across your three buckets.
        </Text>

        <Pressable
          disabled={loading}
          onPress={() => void run()}
          className="rounded-full bg-brand px-6 py-4 active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Analyze my finances
            </Text>
          )}
        </Pressable>

        {error && <Text className="text-debt">{error}</Text>}

        {items.map((item, i) => {
          const u = urgencyStyles[item.urgency];
          return (
            <Card key={i}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="flex-1 pr-2 text-base font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </Text>
                <View className={`rounded-full px-2 py-0.5 ${u.badge}`}>
                  <Text className="text-[10px] font-bold text-white">
                    {u.label}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {item.recommendation}
              </Text>
              <View className="mt-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                <Text className="text-xs font-mono text-gray-600 dark:text-gray-300">
                  {item.mathBreakdown}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}
