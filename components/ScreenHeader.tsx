import { Image, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { icons } from "@/constants/icons";

interface Props {
  title: string;
  /** Rendered on the right, e.g. a clear button. */
  right?: React.ReactNode;
}

/** Back arrow plus title for screens pushed on top of the tabs. */
export default function ScreenHeader({ title, right }: Props) {
  return (
    <View className="flex-row items-center px-5 mt-2 mb-4">
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="bg-dark-100 rounded-full w-10 h-10 items-center justify-center"
      >
        <Image
          source={icons.arrow}
          className="w-5 h-5 rotate-180"
          tintColor="#FFFFFF"
          resizeMode="contain"
        />
      </TouchableOpacity>
      <Text className="text-white text-xl font-bold ml-4 flex-1" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
