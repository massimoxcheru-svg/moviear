import { Image, Text, View, type ImageProps } from "react-native";

interface Props {
  icon: ImageProps["source"];
  title: string;
  message: string;
}

/** Centered icon, title and hint for a list with nothing in it. */
export default function EmptyState({ icon, title, message }: Props) {
  return (
    <View className="flex-1 items-center justify-center mt-20 px-8">
      <View className="bg-dark-100 rounded-full p-6 mb-6">
        <Image source={icon} className="w-16 h-16" tintColor="#AB8BFF" resizeMode="contain" />
      </View>
      <Text className="text-white text-xl font-semibold text-center">{title}</Text>
      <Text className="text-light-300 text-center mt-3">{message}</Text>
    </View>
  );
}
