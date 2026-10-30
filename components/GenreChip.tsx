import { Text, TouchableOpacity } from "react-native";

interface Props {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Pill used for genre filters and sort options. */
export default function GenreChip({ label, selected = false, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? "bg-accent rounded-full px-4 py-2"
          : "bg-dark-100 rounded-full px-4 py-2"
      }
    >
      <Text
        className={
          selected ? "text-primary text-sm font-semibold" : "text-light-200 text-sm"
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
