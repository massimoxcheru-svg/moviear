import { View, Text, Image, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import MovieCard from "@/components/MovieCard";

export default function Saved() {
  const { movies, count, hydrated } = useSavedMovies();

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <FlatList
          className="px-5"
          data={movies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MovieCard movie={item} />}
          numColumns={3}
          columnWrapperStyle={{
            justifyContent: "flex-start",
            gap: 12,
            marginBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View className="mt-5 mb-6">
              {/* Header */}
              <Text className="text-white text-2xl font-bold">
                Saved Movies
              </Text>
              <Text className="text-light-200 text-sm mt-1">
                {hydrated && count > 0
                  ? `${count} ${count === 1 ? "movie" : "movies"} in your watchlist`
                  : "Your personal watchlist"}
              </Text>
            </View>
          }
          ListEmptyComponent={
            hydrated ? (
              <View className="flex-1 items-center justify-center mt-20">
                <View className="bg-dark-100 rounded-full p-6 mb-6">
                  <Image
                    source={icons.save}
                    className="w-16 h-16"
                    tintColor="#AB8BFF"
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-white text-xl font-semibold">
                  No Saved Movies Yet
                </Text>
                <Text className="text-light-300 text-center mt-3 px-8">
                  Browse movies and tap the save icon to add them to your
                  watchlist
                </Text>
              </View>
            ) : (
              <View className="min-h-[200px] items-center justify-center">
                <ActivityIndicator size="large" color="#AB8BFF" />
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
