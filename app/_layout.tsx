import { Stack, type ErrorBoundaryProps } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../global.css";
import "react-native-reanimated";
import OfflineBanner from "@/components/OfflineBanner";

/** Last resort when a screen throws during render. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1 items-center justify-center px-8">
        <Text className="text-white text-2xl font-bold text-center">Something broke</Text>
        <Text className="text-light-300 text-center mt-3">{error.message}</Text>
        <TouchableOpacity
          onPress={retry}
          accessibilityRole="button"
          className="bg-accent rounded-full px-6 py-3 mt-8"
        >
          <Text className="text-primary font-semibold">Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

export default function RootLayout() {
  return (
    <View className="flex-1 bg-primary">
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movies/[id]" />
        <Stack.Screen name="people/[id]" />
        <Stack.Screen name="genres/[id]" />
        <Stack.Screen name="keywords/[id]" />
        <Stack.Screen name="collections/[id]" />
        <Stack.Screen name="reviews/[id]" />
        <Stack.Screen name="lists/[kind]" />
        <Stack.Screen name="discover/index" />
        <Stack.Screen name="history/index" />
      </Stack>
    </View>
  );
}
