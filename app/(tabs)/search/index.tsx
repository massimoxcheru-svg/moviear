import { useState } from "react";
import { View, Text, Image, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";
import { searchMovies, searchPeople } from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { useDebounce } from "@/hooks/useDebounce";
import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";
import PersonCard from "@/components/PersonCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";
import OptionPicker, { type Option } from "@/components/OptionPicker";

const DEBOUNCE_MS = 500;

type Mode = "movies" | "people";
const MODES: readonly Option<Mode>[] = [
  { value: "movies", label: "Movies" },
  { value: "people", label: "People" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("movies");
  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length > 0;

  // The debounced query is the list key: changing it clears the results and
  // drops any page still in flight for the previous query.
  const movies = usePaginatedFetch((page) => searchMovies(debouncedQuery, page), {
    key: `movies:${debouncedQuery}`,
    enabled: hasQuery && mode === "movies",
  });
  const people = usePaginatedFetch((page) => searchPeople(debouncedQuery, page), {
    key: `people:${debouncedQuery}`,
    enabled: hasQuery && mode === "people",
  });

  const active = mode === "movies" ? movies : people;
  const hasResults = active.items.length > 0;

  const emptyState = (
    <View className="bg-dark-100 rounded-2xl p-6 items-center justify-center min-h-[300px]">
      <Image
        source={mode === "movies" ? icons.search : icons.person}
        className="w-12 h-12 mb-4"
        tintColor="#AB8BFF"
        resizeMode="contain"
      />
      {hasQuery ? (
        <>
          <Text className="text-light-200 text-center">No results for {debouncedQuery}</Text>
          <Text className="text-light-300 text-sm mt-2 text-center">
            {mode === "movies" ? "Try a different title" : "Try a different name"}
          </Text>
        </>
      ) : (
        <>
          <Text className="text-light-200 text-center">
            {mode === "movies" ? "Start typing to search movies" : "Start typing to search people"}
          </Text>
          <Text className="text-light-300 text-sm mt-2 text-center">
            Search results will appear here
          </Text>
        </>
      )}
    </View>
  );

  const header = (
    <View className="mt-5 mb-6">
      <Text className="text-white text-2xl font-bold">Search</Text>
      <Text className="text-light-200 text-sm mt-1">Find films, actors and directors</Text>

      <View className="mt-6">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={mode === "movies" ? "Search for a movie..." : "Search for a person..."}
        />
      </View>
      <View className="mt-3">
        <OptionPicker options={MODES} value={mode} onChange={setMode} />
      </View>

      {active.loading ? (
        <ActivityIndicator size="large" color="#AB8BFF" className="mt-8" />
      ) : active.error && !hasResults ? (
        <View className="mt-8">
          <ErrorState message={active.error.message} onRetry={active.retry} />
        </View>
      ) : hasQuery && hasResults ? (
        <Text className="text-light-300 text-base mt-8">
          Results for <Text className="text-accent font-semibold">{debouncedQuery}</Text>
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <ListFooter
      loadingMore={active.loadingMore}
      error={hasResults ? active.error : null}
      onRetry={active.retry}
    />
  );

  const listProps = {
    className: "px-5",
    numColumns: 3,
    columnWrapperStyle: { justifyContent: "flex-start" as const, gap: 12, marginBottom: 16 },
    showsVerticalScrollIndicator: false,
    keyboardShouldPersistTaps: "handled" as const,
    contentContainerStyle: { paddingBottom: 100 },
    onEndReached: active.loadMore,
    onEndReachedThreshold: 0.5,
    ListHeaderComponent: header,
    ListFooterComponent: footer,
    ListEmptyComponent: active.loading || active.error ? null : emptyState,
  };

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        {mode === "movies" ? (
          <FlatList
            {...listProps}
            key="movies"
            data={movies.items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <MovieCard movie={item} />}
          />
        ) : (
          <FlatList
            {...listProps}
            key="people"
            data={people.items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <PersonCard person={item} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
