import { Text, View } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/** Thin strip shown at the top of the app while there is no connection. */
export default function OfflineBanner() {
  const { offline } = useNetworkStatus();
  if (!offline) return null;
  return (
    <View className="bg-dark-100 border-b border-dark-200 py-2 px-5" accessibilityLiveRegion="polite">
      <Text className="text-light-200 text-xs text-center">
        You are offline. Showing what was loaded before.
      </Text>
    </View>
  );
}
