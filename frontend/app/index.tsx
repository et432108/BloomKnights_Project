import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Auth gate. Redirects to the tabs when signed in, otherwise to login.
 * `user === undefined` means Firebase is still resolving the session.
 */
export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0d631b" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
