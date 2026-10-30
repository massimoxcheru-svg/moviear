import { useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { discoverMovies, type DiscoverSort } from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { todayYmd } from "@/utils/format";
import ScreenHeader from "@/components/ScreenHeader";
import MovieCard from "@/components/MovieCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";
import OptionPicker, { type Option } from "@/components/OptionPicker";

const SORT_OPTIONS: readonly Option<DiscoverSort>[] = [
  { value: "popularity", label: "Popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

export default function GenreScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const genreId = Number(id);
  const [sort, setSort] = useState<DiscoverSort>("popularity");
  // Fixed for the life of the screen so paging does not drift across midnight.
  const today = useMemo(() => todayYmd(), []);

  const { items, loading, loadingMore, error, loadMore, retry } = usePaginatedFetch(
    (page) =>
      discoverMovies({
        genreId,
        sort,
        page,
        releasedBefore: sort === "newest" ? today : undefined,
      }),
    { key: `${genreId}:${sort}`, enabled: Number.isFinite(genreId) },
  );

  const hasItems = items.length > 0;

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={name ?? "Genre"} />

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
          ListHeaderComponent={
            <View className="mb-6">
              <OptionPicker options={SORT_OPTIONS} value={sort} onChange={setSort} />
              {loading ? (
                <ActivityIndicator size="large" color="#AB8BFF" className="mt-10" />
              ) : error && !hasItems ? (
                <View className="mt-6">
                  <ErrorState message={error.message} onRetry={retry} />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading || error ? null : (
              <Text className="text-light-300 text-center mt-10">
                No movies found for this genre
              </Text>
            )
          }
          ListFooterComponent={
            <ListFooter
              loadingMore={loadingMore}
              error={hasItems ? error : null}
              onRetry={retry}
            />
          }
        />
      </SafeAreaView>
    </View>
  );
}
