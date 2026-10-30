import { Image, TextInput, View } from "react-native";
import { icons } from "@/constants/icons";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search for a movie...",
  autoFocus = false,
}: Props) {
  return (
    <View className="flex-row items-center bg-dark-100 rounded-full px-4 py-3">
      <Image
        source={icons.search}
        className="w-5 h-5"
        tintColor="#A8B5DB"
        resizeMode="contain"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA4AB"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        className="flex-1 ml-3 text-white text-base"
      />
    </View>
  );
}
