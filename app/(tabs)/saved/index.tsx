import { useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import {
  SAVED_FILTER_LABELS,
  SAVED_SORT_LABELS,
  viewSavedMovies,
  type SavedFilter,
  type SavedSort,
} from "@/services/savedMovies";
import MovieCard from "@/components/MovieCard";
import EmptyState from "@/components/EmptyState";
import OptionPicker, { type Option } from "@/components/OptionPicker";

const SORTS = (Object.keys(SAVED_SORT_LABELS) as SavedSort[]).map(
  (value): Option<SavedSort> => ({ value, label: SAVED_SORT_LABELS[value] }),
);
const FILTERS = (Object.keys(SAVED_FILTER_LABELS) as SavedFilter[]).map(
  (value): Option<SavedFilter> => ({ value, label: SAVED_FILTER_LABELS[value] }),
);

function SavedCard({ movie }: { movie: SavedMovie }) {
  return (
    <View className="w-[30%] mb-1">
      <View className="w-full">
        <MovieCard movie={movie} layout="full" />
        {movie.rating !== null ? (
          <View className="absolute top-2 right-2 bg-primary/80 rounded-full px-2 py-1 flex-row items-center">
            <Image source={icons.star} className="w-3 h-3 mr-1" tintColor="#FFD700" resizeMode="contain" />
            <Text className="text-white text-xs font-semibold">{movie.rating}</Text>
          </View>
        ) : null}
      </View>
      {movie.note ? (
        <Text className="text-light-300 text-xs mt-1" numberOfLines={2}>
          {movie.note}
        </Text>
      ) : null}
    </View>
  );
}

export default function Saved() {
  const { movies, count, hydrated } = useSavedMovies();
  const [sort, setSort] = useState<SavedSort>("saved");
  const [filter, setFilter] = useState<SavedFilter>("all");

  const shown = useMemo(() => viewSavedMovies(movies, sort, filter), [movies, sort, filter]);
  const rated = movies.filter((m) => m.rating !== null).length;

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <FlatList
          className="px-5"
          data={shown}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <SavedCard movie={item} />}
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
                  ? `${count} ${count === 1 ? "movie" : "movies"} in your watchlist, ${rated} rated`
                  : "Your personal watchlist"}
              </Text>
              {count > 0 ? (
                <View className="mt-4">
                  <OptionPicker options={SORTS} value={sort} onChange={setSort} />
                  <View className="mt-3">
                    <OptionPicker options={FILTERS} value={filter} onChange={setFilter} wrap />
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !hydrated ? (
              <View className="min-h-[200px] items-center justify-center">
                <ActivityIndicator size="large" color="#AB8BFF" />
              </View>
            ) : count === 0 ? (
              <EmptyState
                icon={icons.save}
                title="No Saved Movies Yet"
                message="Browse movies and tap the save button to add them to your watchlist"
              />
            ) : (
              <Text className="text-light-300 text-center mt-10">
                Nothing matches this filter
              </Text>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
