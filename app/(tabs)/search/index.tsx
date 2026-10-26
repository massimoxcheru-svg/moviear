import { View, Text, TextInput, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";

export default function Search() {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <View className="px-5 mt-5">
          {/* Header */}
          <Text className="text-white text-2xl font-bold">Search Movies</Text>
          <Text className="text-light-200 text-sm mt-1">
            Find your favorite films
          </Text>

          {/* Search Bar */}
          <View className="flex-row items-center bg-dark-100 rounded-full px-4 py-3 mt-6">
            <Image
              source={icons.search}
              className="w-5 h-5"
              tintColor="#A8B5DB"
              resizeMode="contain"
            />
            <TextInput
              placeholder="Search for a movie..."
              placeholderTextColor="#9CA4AB"
              className="flex-1 ml-3 text-white text-base"
            />
          </View>

          {/* Results Placeholder */}
          <View className="mt-8">
            <Text className="text-light-300 text-base mb-4">
              Popular Searches
            </Text>
            <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center min-h-[300px]">
              <Image
                source={icons.search}
                className="w-12 h-12 mb-4"
                tintColor="#AB8BFF"
                resizeMode="contain"
              />
              <Text className="text-light-200 text-center">
                Start typing to search movies
              </Text>
              <Text className="text-light-300 text-sm mt-2 text-center">
                Search results will appear here
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
