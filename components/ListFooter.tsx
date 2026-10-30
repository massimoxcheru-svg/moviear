import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface Props {
  loadingMore: boolean;
  /** Pass the error only when items are already on screen; page-1 errors
   *  are shown by the screen itself. */
  error: Error | null;
  onRetry: () => void;
}

/** Footer for paginated lists: a small spinner, or an inline retry row. */
export default function ListFooter({ loadingMore, error, onRetry }: Props) {
  if (loadingMore) {
    return (
      <View className="py-6 items-center justify-center">
        <ActivityIndicator size="small" color="#AB8BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="py-4 items-center justify-center">
        <Text className="text-light-300 text-sm text-center">
          Could not load more: {error.message}
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          className="bg-dark-100 rounded-full px-5 py-2 mt-3"
        >
          <Text className="text-accent font-semibold text-sm">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
