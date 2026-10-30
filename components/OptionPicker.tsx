import { Text, TouchableOpacity, View } from "react-native";

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Wrap onto several lines instead of one row (long lists like regions). */
  wrap?: boolean;
}

/** Segmented control. One option is always selected. */
export default function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  wrap = false,
}: Props<T>) {
  return (
    <View className={wrap ? "flex-row flex-wrap gap-2" : "flex-row bg-dark-200 rounded-xl p-1"}>
      {options.map((option) => {
        const selected = option.value === value;
        const base = wrap ? "rounded-full px-4 py-2" : "flex-1 rounded-lg py-2 items-center";
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={selected ? `${base} bg-accent` : `${base} ${wrap ? "bg-dark-100" : ""}`}
          >
            <Text
              className={
                selected ? "text-primary text-sm font-semibold" : "text-light-200 text-sm"
              }
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
