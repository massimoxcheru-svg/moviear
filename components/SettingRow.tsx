import { Image, Text, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";

interface Props {
  label: string;
  description?: string;
  /** Rendered on the right: a switch, a value, or nothing. */
  right?: React.ReactNode;
  /** When set the whole row is pressable and shows a chevron. */
  onPress?: () => void;
  /** Red label for destructive actions. */
  destructive?: boolean;
}

/** One row in the settings list. */
export default function SettingRow({
  label,
  description,
  right,
  onPress,
  destructive = false,
}: Props) {
  const content = (
    <>
      <View className="flex-1 pr-3">
        <Text className={destructive ? "text-red-400 text-base" : "text-white text-base"}>
          {label}
        </Text>
        {description ? (
          <Text className="text-light-300 text-xs mt-1">{description}</Text>
        ) : null}
      </View>
      {right}
      {onPress && !right ? (
        <Image
          source={icons.arrow}
          className="w-4 h-4"
          tintColor="#9CA4AB"
          resizeMode="contain"
        />
      ) : null}
    </>
  );

  const className = "bg-dark-100 rounded-xl py-4 px-5 mb-3 flex-row justify-between items-center";

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} accessibilityRole="button" className={className}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View className={className}>{content}</View>;
}
