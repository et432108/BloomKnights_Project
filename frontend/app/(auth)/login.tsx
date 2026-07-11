import { useEffect } from "react";
import { Redirect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useGoogleAuth } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function Login() {
  const user = useAuthStore((s) => s.user);
  const { request, response, promptAsync, signInWithGoogleResponse } =
    useGoogleAuth();

  useEffect(() => {
    if (response?.type === "success") {
      void signInWithGoogleResponse();
    }
  }, [response]);

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
        disabled={!request}
        onPress={() => promptAsync()}
        className="w-full rounded-full bg-white px-6 py-4 active:opacity-80"
      >
        <Text className="text-center text-base font-semibold text-brand">
          Continue with Google
        </Text>
      </Pressable>
    </View>
  );
}
