import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import MovieCard from "@/components/MovieCard";
import EmptyState from "@/components/EmptyState";

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
              <EmptyState
                icon={icons.save}
                title="No Saved Movies Yet"
                message="Browse movies and tap the save button to add them to your watchlist"
              />
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
