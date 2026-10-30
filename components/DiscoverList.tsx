import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import {
  DISCOVER_SORT_LABELS,
  discoverMovies,
  type DiscoverOptions,
  type DiscoverSort,
} from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { todayYmd } from "@/utils/format";
import MovieCard from "./MovieCard";
import ErrorState from "./ErrorState";
import ListFooter from "./ListFooter";
import OptionPicker, { type Option } from "./OptionPicker";

const SORTS: readonly DiscoverSort[] = ["popularity", "rating", "newest", "revenue", "title"];
const SORT_OPTIONS: readonly Option<DiscoverSort>[] = SORTS.map((value) => ({
  value,
  label: DISCOVER_SORT_LABELS[value],
}));

interface Props {
  /** Filters other than sort and page. */
  filters: Omit<DiscoverOptions, "sort" | "page" | "releasedBefore">;
  /** Serialises the filters; a change clears the list. */
  filterKey: string;
  /** Rendered above the sort picker. */
  header?: React.ReactNode;
  initialSort?: DiscoverSort;
  /** Hide the sort picker (advanced discover renders its own). */
  showSort?: boolean;
  sort?: DiscoverSort;
  onSortChange?: (sort: DiscoverSort) => void;
}

/** Paginated three column grid over /discover/movie with a sort picker. */
export default function DiscoverList({
  filters,
  filterKey,
  header,
  initialSort = "popularity",
  showSort = true,
  sort: controlledSort,
  onSortChange,
}: Props) {
  const [ownSort, setOwnSort] = useState<DiscoverSort>(initialSort);
  const sort = controlledSort ?? ownSort;
  const setSort = onSortChange ?? setOwnSort;
  // Fixed for the life of the screen so paging does not drift across midnight.
  const today = useMemo(() => todayYmd(), []);
  const [refreshing, setRefreshing] = useState(false);

  const { items, loading, loadingMore, error, loadMore, retry, reload } = usePaginatedFetch(
    (page) =>
      discoverMovies({
        ...filters,
        sort,
        page,
        releasedBefore: sort === "newest" ? today : undefined,
      }),
    { key: `${filterKey}:${sort}` },
  );

  const hasItems = items.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
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
        <View className="mb-6">
          {header}
          {showSort ? (
            <View className="flex-row flex-wrap">
              <OptionPicker options={SORT_OPTIONS} value={sort} onChange={setSort} wrap />
            </View>
          ) : null}
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
          <Text className="text-light-300 text-center mt-10">No movies match</Text>
        )
      }
      ListFooterComponent={
        <ListFooter loadingMore={loadingMore} error={hasItems ? error : null} onRetry={retry} />
      }
    />
  );
}
