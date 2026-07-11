import { View } from "react-native";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View
      className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800 ${className}`}
    >
      {children}
    </View>
  );
}
