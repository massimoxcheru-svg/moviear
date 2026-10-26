import { View, Text, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { icons } from "@/constants/icons";

export default function Home() {
  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full z-0"
        resizeMode="cover"
      />
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: "100%", paddingBottom: 100 }}
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-center mt-5">
            <Image source={icons.logo} className="w-12 h-10" />
          </View>

          {/* Welcome Section */}
          <View className="mt-10">
            <Text className="text-white text-2xl font-bold">
              Welcome to MovieAr
            </Text>
            <Text className="text-light-200 text-base mt-2">
              Discover trending movies and save your favorites
            </Text>
          </View>

          {/* Trending Section Placeholder */}
          <View className="mt-8">
            <Text className="text-white text-lg font-semibold mb-4">
              🔥 Trending Now
            </Text>
            <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center min-h-[200px]">
              <Text className="text-light-300 text-center">
                Movie list will appear here
              </Text>
              <Text className="text-accent text-sm mt-2">
                Connect TMDB API to load movies
              </Text>
            </View>
          </View>

          {/* Latest Movies Placeholder */}
          <View className="mt-8">
            <Text className="text-white text-lg font-semibold mb-4">
              🎬 Latest Movies
            </Text>
            <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center min-h-[150px]">
              <Text className="text-light-300 text-center">
                Discover new releases
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}
