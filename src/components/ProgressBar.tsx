import { View } from "react-native";

interface Props {
  /** 0..1 fill ratio. */
  value: number;
  /** Tailwind bg color class, e.g. "bg-debt". */
  color?: string;
}

export function ProgressBar({ value, color = "bg-brand" }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <View className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
