import { Stack } from "expo-router";
import "../global.css";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="movies/[id]" />
      <Stack.Screen name="people/[id]" />
      <Stack.Screen name="genres/[id]" />
      <Stack.Screen name="history/index" />
    </Stack>
  );
}
