import { Image, Text, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";
import { MAX_RATING, MIN_RATING } from "@/services/savedMovies";

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
}

const SCORES = Array.from({ length: MAX_RATING - MIN_RATING + 1 }, (_, i) => MIN_RATING + i);

/** Ten tappable stars. Tapping the current score clears it. */
export default function RatingPicker({ value, onChange }: Props) {
  return (
    <View>
      <View className="flex-row justify-between">
        {SCORES.map((score) => {
          const filled = value !== null && score <= value;
          return (
            <TouchableOpacity
              key={score}
              onPress={() => onChange(score === value ? null : score)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ checked: score === value }}
              accessibilityLabel={`${score} out of ${MAX_RATING}`}
            >
              <Image
                source={icons.star}
                className="w-7 h-7"
                tintColor={filled ? "#FFD700" : "#3B3860"}
                resizeMode="contain"
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <Text className="text-light-300 text-xs text-center mt-2">
        {value === null ? "Tap a star to rate" : `${value} / ${MAX_RATING}`}
      </Text>
    </View>
  );
}
