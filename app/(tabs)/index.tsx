import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { images } from "@/constants/images";
import { icons } from "@/constants/icons";
import {
  fetchGenres,
  fetchLatestMovies,
  fetchMovieList,
  fetchTrendingMovies,
  MOVIE_LIST_TITLES,
} from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { useSettings } from "@/hooks/useSettings";
import MovieCard from "@/components/MovieCard";
import TrendingCard from "@/components/TrendingCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";
import SectionHeader from "@/components/SectionHeader";
import GenreChip from "@/components/GenreChip";
import MovieRow from "@/components/MovieRow";

export default function Home() {
  const { settings } = useSettings();
  const { trendingWindow, region, language } = settings;
  const [refreshing, setRefreshing] = useState(false);

  // Trending re-runs when the window or language changes; the fetch function
  // is read through a ref inside useFetch, so the closure is always current.
  const trending = useFetch(({ force }) => fetchTrendingMovies(trendingWindow, { force }), false);
  const refetchTrending = trending.refetch;
  useEffect(() => {
    void refetchTrending();
  }, [trendingWindow, language, refetchTrending]);

  const genres = useFetch(({ force }) => fetchGenres({ force }));
  const upcoming = useFetch(
    async ({ force }) => (await fetchMovieList("upcoming", 1, { force })).results,
  );
  const topRated = useFetch(
    async ({ force }) => (await fetchMovieList("top_rated", 1, { force })).results,
  );

  const latest = usePaginatedFetch(
    (page, options) => fetchLatestMovies(page, { force: options?.force }),
    { key: `latest:${region}:${language}` },
  );

  // Region and language changes should refresh the regional rows too.
  const refreshUpcoming = upcoming.refetch;
  const refreshTopRated = topRated.refetch;
  useEffect(() => {
    void refreshUpcoming();
    void refreshTopRated();
  }, [region, language, refreshUpcoming, refreshTopRated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      trending.refresh(),
      genres.refresh(),
      upcoming.refresh(),
      topRated.refresh(),
      latest.reload(),
    ]);
    setRefreshing(false);
  }, [trending, genres, upcoming, topRated, latest]);

  const hasLatest = latest.items.length > 0;

  return (
    <View className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full z-0"
        resizeMode="cover"
      />
      {/* The latest grid is the list itself; everything above it is the
          header, so the screen scrolls as one piece. */}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB8BFF" />
        }
        ListHeaderComponent={
          <SafeAreaView edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center justify-center mt-5">
              <Image source={icons.logo} className="w-12 h-10" />
            </View>

            {/* Welcome Section */}
            <View className="mt-10 flex-row items-end justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-white text-2xl font-bold">
                  Welcome to MovieAr
                </Text>
                <Text className="text-light-200 text-base mt-2">
                  Discover trending movies and save your favorites
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/discover")}
                accessibilityRole="link"
                className="bg-accent rounded-full px-4 py-2"
              >
                <Text className="text-primary font-semibold text-sm">Discover</Text>
              </TouchableOpacity>
            </View>

            {/* Trending Section */}
            <View className="mt-8">
              <SectionHeader
                title={trendingWindow === "day" ? "Trending today" : "Trending this week"}
                action={{
                  label: "Settings",
                  onPress: () => router.push("/profile"),
                }}
              />

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

            {/* Genres */}
            <View className="mt-8">
              <SectionHeader title="Browse by genre" />
              {genres.error ? (
                <ErrorState message={genres.error.message} onRetry={genres.refetch} />
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={genres.data ?? []}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <GenreChip
                      label={item.name}
                      onPress={() =>
                        router.push({
                          pathname: "/genres/[id]",
                          params: { id: String(item.id), name: item.name },
                        })
                      }
                    />
                  )}
                  ItemSeparatorComponent={() => <View className="w-2" />}
                  ListEmptyComponent={
                    genres.loading ? (
                      <ActivityIndicator size="small" color="#AB8BFF" />
                    ) : null
                  }
                />
              )}
            </View>

            {/* Coming soon */}
            <View className="mt-8">
              <SectionHeader
                title={MOVIE_LIST_TITLES.upcoming}
                action={{
                  label: "See all",
                  onPress: () => router.push({ pathname: "/lists/[kind]", params: { kind: "upcoming" } }),
                }}
              />
              <MovieRow
                movies={upcoming.data ?? []}
                loading={upcoming.loading}
                error={upcoming.error}
                onRetry={upcoming.refetch}
                emptyText="Nothing announced for your region yet"
              />
            </View>

            {/* Top rated */}
            <View className="mt-8">
              <SectionHeader
                title={MOVIE_LIST_TITLES.top_rated}
                action={{
                  label: "See all",
                  onPress: () => router.push({ pathname: "/lists/[kind]", params: { kind: "top_rated" } }),
                }}
              />
              <MovieRow
                movies={topRated.data ?? []}
                loading={topRated.loading}
                error={topRated.error}
                onRetry={topRated.refetch}
              />
            </View>

            {/* Latest Movies title + page-1 states; the grid follows as list rows */}
            <View className="mt-8">
              <SectionHeader
                title={MOVIE_LIST_TITLES.now_playing}
                action={{
                  label: "See all",
                  onPress: () => router.push({ pathname: "/lists/[kind]", params: { kind: "now_playing" } }),
                }}
              />

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
