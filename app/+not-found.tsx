import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";

/** Shown for a link the app does not know, for example a mistyped deep link. */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 bg-primary">
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-2xl font-bold text-center">This page does not exist</Text>
          <Text className="text-light-300 text-center mt-3">
            The link may be old, or the movie may have been removed.
          </Text>
          <Link href="/" asChild>
            <TouchableOpacity accessibilityRole="link" className="bg-accent rounded-full px-6 py-3 mt-8">
              <Text className="text-primary font-semibold">Go to Home</Text>
            </TouchableOpacity>
          </Link>
        </SafeAreaView>
      </View>
    </>
  );
}
