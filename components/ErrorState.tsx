import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  message: string;
  onRetry?: () => void;
}

/** Inline error box with an optional retry button. */
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center">
      <Text className="text-white font-semibold text-base">
        Something went wrong
      </Text>
      <Text className="text-light-300 text-sm text-center mt-2">{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-accent rounded-full px-6 py-2 mt-4"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
