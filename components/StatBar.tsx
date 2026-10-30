import { Text, View } from "react-native";

interface Props {
  label: string;
  value: string;
  /** 0 to 1 width of the bar. */
  share: number;
}

/** A labelled horizontal bar for the taste breakdown. */
export default function StatBar({ label, value, share }: Props) {
  const width = `${Math.max(4, Math.round(share * 100))}%` as const;
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-light-200 text-sm">{label}</Text>
        <Text className="text-light-300 text-sm">{value}</Text>
      </View>
      <View className="h-2 bg-dark-200 rounded-full overflow-hidden">
        <View className="h-2 bg-accent rounded-full" style={{ width }} />
      </View>
    </View>
  );
}
