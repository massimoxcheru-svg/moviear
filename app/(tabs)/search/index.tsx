import { useState } from "react";
import { View, Text, Image, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";
import { searchMovies } from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { useDebounce } from "@/hooks/useDebounce";
import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";

const DEBOUNCE_MS = 500;

export default function Search() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length > 0;

  // The debounced query is the list key: changing it clears the results and
  // drops any page still in flight for the previous query.
  const {
    items: movies,
    loading,
    loadingMore,
    error,
    loadMore,
    retry,
  } = usePaginatedFetch((page) => searchMovies(debouncedQuery, page), {
    key: debouncedQuery,
    enabled: hasQuery,
  });

  const hasResults = movies.length > 0;

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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View className="mt-5 mb-6">
              {/* Header */}
              <Text className="text-white text-2xl font-bold">
                Search Movies
              </Text>
              <Text className="text-light-200 text-sm mt-1">
                Find your favorite films
              </Text>

              {/* Search Bar */}
              <View className="mt-6">
                <SearchBar value={query} onChangeText={setQuery} />
              </View>

              {/* Status row */}
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#AB8BFF"
                  className="mt-8"
                />
              ) : error && !hasResults ? (
                <View className="mt-8">
                  <ErrorState message={error.message} onRetry={retry} />
                </View>
              ) : hasQuery && hasResults ? (
                <Text className="text-light-300 text-base mt-8">
                  Results for{" "}
                  <Text className="text-accent font-semibold">
                    {debouncedQuery}
                  </Text>
                </Text>
              ) : null}
            </View>
          }
          ListFooterComponent={
            <ListFooter
              loadingMore={loadingMore}
              error={hasResults ? error : null}
              onRetry={retry}
            />
          }
          ListEmptyComponent={
            loading || error ? null : (
              <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center min-h-[300px]">
                <Image
                  source={icons.search}
                  className="w-12 h-12 mb-4"
                  tintColor="#AB8BFF"
                  resizeMode="contain"
                />
                {hasQuery ? (
                  <>
                    <Text className="text-light-200 text-center">
                      No results for {debouncedQuery}
                    </Text>
                    <Text className="text-light-300 text-sm mt-2 text-center">
                      Try a different title
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-light-200 text-center">
                      Start typing to search movies
                    </Text>
                    <Text className="text-light-300 text-sm mt-2 text-center">
                      Search results will appear here
                    </Text>
                  </>
                )}
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
