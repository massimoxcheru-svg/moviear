import { useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { fetchMovieList, MOVIE_LIST_TITLES, type MovieListKind } from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { useSettings } from "@/hooks/useSettings";
import ScreenHeader from "@/components/ScreenHeader";
import MovieCard from "@/components/MovieCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";

const KINDS = Object.keys(MOVIE_LIST_TITLES) as MovieListKind[];

/** "See all" for the Home rows: an endless grid of one standard TMDB list. */
export default function MovieListScreen() {
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind: MovieListKind = KINDS.includes(raw as MovieListKind)
    ? (raw as MovieListKind)
    : "popular";
  const { settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);

  const { items, loading, loadingMore, error, loadMore, retry, reload } = usePaginatedFetch(
    (page, options) => fetchMovieList(kind, page, { force: options?.force }),
    { key: `${kind}:${settings.region}:${settings.language}` },
  );
  const hasItems = items.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={MOVIE_LIST_TITLES[kind]} />
        <FlatList
          className="px-5"
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MovieCard movie={item} />}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: "flex-start", gap: 12, marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB8BFF" />
          }
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator size="large" color="#AB8BFF" className="mt-10 mb-6" />
            ) : error && !hasItems ? (
              <View className="mb-6">
                <ErrorState message={error.message} onRetry={retry} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading || error ? null : (
              <Text className="text-light-300 text-center mt-10">Nothing to show</Text>
            )
          }
          ListFooterComponent={
            <ListFooter loadingMore={loadingMore} error={hasItems ? error : null} onRetry={retry} />
          }
        />
      </SafeAreaView>
    </View>
  );
}
