import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  title: string;
  /** Optional small action on the right, e.g. "See all". */
  action?: { label: string; onPress: () => void };
  className?: string;
}

/** Title row above a list section, with an optional action link. */
export default function SectionHeader({ title, action, className = "" }: Props) {
  return (
    <View className={`flex-row items-center justify-between mb-4 ${className}`}>
      <Text className="text-white text-lg font-semibold">{title}</Text>
      {action ? (
        <TouchableOpacity onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text className="text-accent text-sm font-semibold">{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
