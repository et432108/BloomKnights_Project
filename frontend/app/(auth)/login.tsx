import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useGoogleAuth } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function Login() {
  const user = useAuthStore((s) => s.user);
  const { signIn, isSigningIn, error } = useGoogleAuth();

  if (user) return <Redirect href="/(tabs)" />;

  return (
    <View className="flex-1 items-center justify-center bg-brand px-8">
      <Text className="mb-2 text-4xl font-extrabold text-white">
        BloomKnights
      </Text>
      <Text className="mb-12 text-center text-base text-indigo-100">
        Three buckets. Zero guilt. Conquer your debt, grow your savings, and
        spend your fun money freely.
      </Text>

      <Pressable
        disabled={isSigningIn}
        onPress={() => void signIn()}
        className="w-full rounded-full bg-white px-6 py-4 active:opacity-80"
      >
        {isSigningIn ? (
          <ActivityIndicator color="#0d631b" />
        ) : (
          <Text className="text-center text-base font-semibold text-brand">
            Continue with Google
          </Text>
        )}
      </Pressable>

      {error ? (
        <Text className="mt-4 text-center text-sm text-indigo-100">{error}</Text>
      ) : null}
    </View>
  );
}
