import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Fun facts about household debt in America — a friendly, scannable dashboard
 * card. Uses only the supported source figures (2025 totals); qualitative where
 * no number is available, so nothing here is fabricated.
 */

const STATS: { value: string; label: string }[] = [
  { value: "90%", label: "have some debt" },
  { value: "~70%", label: "is mortgages" },
  { value: "$1.18T", label: "on credit cards" },
];

const QUICK_FACTS: string[] = [
  "About 9 in 10 Americans carry some form of debt — you're in good company.",
  "Mortgages make up roughly 70% of all household debt.",
  "Everything that isn't a mortgage adds up to only about 30% of the total.",
  "Credit card balances have crossed $1.18 trillion.",
  "Women hold a larger share of student loan debt than men.",
];

export function DebtFacts() {
  return (
    <View className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Headline band */}
      <View className="bg-primary p-6">
        <View className="flex-row items-center gap-2">
          <MaterialIcons name="lightbulb" size={16} color="#ffffff" />
          <Text className="text-xs font-bold uppercase tracking-widest text-white/90">
            Fun facts · Household debt in America
          </Text>
        </View>
        <Text className="mt-3 font-display text-5xl font-bold text-white">
          $18.20T
        </Text>
        <Text className="mt-1 text-sm leading-relaxed text-white/80">
          Total U.S. household debt in 2025 — the big number behind millions of
          everyday balances.
        </Text>
      </View>

      {/* Stat chips */}
      <View className="flex-row flex-wrap gap-3 p-4">
        {STATS.map((s) => (
          <View
            key={s.label}
            className="min-w-[100px] flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text className="font-display text-2xl font-bold text-primary">
              {s.value}
            </Text>
            <Text className="text-xs text-on-surface-variant dark:text-gray-400">
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Did you know? */}
      <View className="gap-2.5 px-4 pb-1">
        <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant dark:text-gray-400">
          Did you know?
        </Text>
        {QUICK_FACTS.map((fact, i) => (
          <View key={i} className="flex-row gap-2">
            <MaterialIcons
              name="check-circle"
              size={16}
              color="#0d631b"
              style={{ marginTop: 2 }}
            />
            <Text className="flex-1 text-sm leading-relaxed text-on-surface dark:text-gray-200">
              {fact}
            </Text>
          </View>
        ))}
      </View>

      {/* Encouraging takeaway */}
      <View className="m-4 flex-row gap-3 rounded-xl bg-secondary-container p-4">
        <MaterialIcons name="eco" size={20} color="#2a6b2c" />
        <Text className="flex-1 text-sm font-medium leading-relaxed text-on-secondary-container">
          Big numbers, small steps: debt is normal and manageable. Knowing where
          you stand — and having a plan — turns a scary total into doable monthly
          moves.
        </Text>
      </View>

      <Text className="px-4 pb-4 text-[11px] text-on-surface-variant/70 dark:text-gray-500">
        U.S. figures as of 2025, rounded for readability. General financial
        awareness, not advice.
      </Text>
    </View>
  );
}
