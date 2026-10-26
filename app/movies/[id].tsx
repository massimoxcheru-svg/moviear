import { View, Text, Image, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { icons } from "@/constants/icons";

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Poster Placeholder */}
        <View className="h-[400px] bg-dark-100 items-center justify-center">
          <Image
            source={icons.play}
            className="w-16 h-16"
            tintColor="#AB8BFF"
            resizeMode="contain"
          />
          <Text className="text-light-300 mt-4">Movie Poster</Text>
          <Text className="text-light-200 text-sm mt-1">ID: {id}</Text>
        </View>

        {/* Back Button */}
        <SafeAreaView className="absolute top-0 left-0 right-0">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-dark-100/80 rounded-full w-10 h-10 items-center justify-center ml-5 mt-2"
          >
            <Image
              source={icons.arrow}
              className="w-5 h-5 rotate-180"
              tintColor="#FFFFFF"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Movie Info */}
        <View className="px-5 mt-5">
          <Text className="text-white text-2xl font-bold">Movie Title</Text>

          {/* Meta Info */}
          <View className="flex-row items-center mt-3 gap-4">
            <View className="flex-row items-center">
              <Image
                source={icons.star}
                className="w-4 h-4 mr-1"
                tintColor="#FFD700"
                resizeMode="contain"
              />
              <Text className="text-light-200">8.5</Text>
            </View>
            <Text className="text-light-300">2024</Text>
            <Text className="text-light-300">2h 15m</Text>
          </View>

          {/* Genres */}
          <View className="flex-row flex-wrap gap-2 mt-4">
            {["Action", "Adventure", "Sci-Fi"].map((genre, index) => (
              <View key={index} className="bg-dark-100 rounded-full px-4 py-2">
                <Text className="text-light-200 text-sm">{genre}</Text>
              </View>
            ))}
          </View>

          {/* Overview */}
          <View className="mt-6">
            <Text className="text-white text-lg font-semibold mb-3">
              Overview
            </Text>
            <Text className="text-light-300 leading-6">
              This is a placeholder for the movie overview. Connect to TMDB API
              to display actual movie descriptions and details. The overview
              will include the movie's plot summary and key information.
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity className="bg-accent rounded-full py-4 items-center mt-8">
            <View className="flex-row items-center">
              <Image
                source={icons.save}
                className="w-5 h-5 mr-2"
                tintColor="#FFFFFF"
                resizeMode="contain"
              />
              <Text className="text-white font-semibold text-base">
                Add to Watchlist
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
