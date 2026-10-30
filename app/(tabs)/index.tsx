import { View, Text, Image, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants/images";
import { icons } from "@/constants/icons";
import { fetchTrendingMovies, fetchLatestMovies } from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import MovieCard from "@/components/MovieCard";
import TrendingCard from "@/components/TrendingCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";

export default function Home() {
  const trending = useFetch(() => fetchTrendingMovies("day"));
  const latest = usePaginatedFetch((page) => fetchLatestMovies(page), {
    key: "latest",
  });

  const hasLatest = latest.items.length > 0;

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full z-0"
        resizeMode="cover"
      />
      {/* The latest grid is the list itself; everything above it is the
          header, so the screen scrolls as one piece exactly as before. */}
      <FlatList
        className="flex-1 px-5"
        data={latest.items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <MovieCard movie={item} />}
        numColumns={3}
        columnWrapperStyle={{
          justifyContent: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: "100%", paddingBottom: 100 }}
        onEndReached={latest.loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <SafeAreaView edges={["top"]}>
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

            {/* Trending Section */}
            <View className="mt-8">
              <Text className="text-white text-lg font-semibold mb-4">
                Trending today
              </Text>

              {trending.loading ? (
                <View className="min-h-[200px] items-center justify-center">
                  <ActivityIndicator size="large" color="#AB8BFF" />
                </View>
              ) : trending.error ? (
                <ErrorState
                  message={trending.error.message}
                  onRetry={trending.refetch}
                />
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={trending.data?.slice(0, 10) ?? []}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item, index }) => (
                    <TrendingCard movie={item} index={index} />
                  )}
                  ItemSeparatorComponent={() => <View className="w-6" />}
                  contentContainerStyle={{ paddingLeft: 12 }}
                  ListEmptyComponent={
                    <Text className="text-light-300">No trending movies</Text>
                  }
                />
              )}
            </View>

            {/* Latest Movies title + page-1 states; the grid follows as list rows */}
            <View className="mt-8">
              <Text className="text-white text-lg font-semibold mb-4">
                Now playing
              </Text>

              {latest.loading ? (
                <View className="min-h-[150px] items-center justify-center">
                  <ActivityIndicator size="large" color="#AB8BFF" />
                </View>
              ) : latest.error && !hasLatest ? (
                <ErrorState
                  message={latest.error.message}
                  onRetry={latest.retry}
                />
              ) : null}
            </View>
          </SafeAreaView>
        }
        ListEmptyComponent={
          latest.loading || latest.error ? null : (
            <Text className="text-light-300">No movies found</Text>
          )
        }
        ListFooterComponent={
          <ListFooter
            loadingMore={latest.loadingMore}
            error={hasLatest ? latest.error : null}
            onRetry={latest.retry}
          />
        }
      />
    </View>
  );
}
