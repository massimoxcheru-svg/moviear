import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchGenres, type DiscoverSort } from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import ScreenHeader from "@/components/ScreenHeader";
import DiscoverList from "@/components/DiscoverList";
import GenreChip from "@/components/GenreChip";
import OptionPicker, { type Option } from "@/components/OptionPicker";

const THIS_YEAR = new Date().getFullYear();

type Decade = "any" | "2020s" | "2010s" | "2000s" | "1990s" | "1980s" | "older";

const DECADES: readonly Option<Decade>[] = [
  { value: "any", label: "Any year" },
  { value: "2020s", label: "2020s" },
  { value: "2010s", label: "2010s" },
  { value: "2000s", label: "2000s" },
  { value: "1990s", label: "1990s" },
  { value: "1980s", label: "1980s" },
  { value: "older", label: "Before 1980" },
];

function decadeBounds(decade: Decade): { yearFrom?: number; yearTo?: number } {
  switch (decade) {
    case "2020s":
      return { yearFrom: 2020, yearTo: THIS_YEAR + 1 };
    case "2010s":
      return { yearFrom: 2010, yearTo: 2019 };
    case "2000s":
      return { yearFrom: 2000, yearTo: 2009 };
    case "1990s":
      return { yearFrom: 1990, yearTo: 1999 };
    case "1980s":
      return { yearFrom: 1980, yearTo: 1989 };
    case "older":
      return { yearTo: 1979 };
    default:
      return {};
  }
}

type Rating = "0" | "6" | "7" | "8";
const RATINGS: readonly Option<Rating>[] = [
  { value: "0", label: "Any rating" },
  { value: "6", label: "6+" },
  { value: "7", label: "7+" },
  { value: "8", label: "8+" },
];

type Length = "any" | "short" | "standard" | "long";
const LENGTHS: readonly Option<Length>[] = [
  { value: "any", label: "Any length" },
  { value: "short", label: "Under 90 min" },
  { value: "standard", label: "90 to 150" },
  { value: "long", label: "Over 150 min" },
];

function lengthBounds(length: Length): { runtimeMin?: number; runtimeMax?: number } {
  switch (length) {
    case "short":
      return { runtimeMax: 89 };
    case "standard":
      return { runtimeMin: 90, runtimeMax: 150 };
    case "long":
      return { runtimeMin: 151 };
    default:
      return {};
  }
}

/** Advanced browsing: combine genres, a decade, a rating floor and a length. */
export default function DiscoverScreen() {
  const genres = useFetch(() => fetchGenres());
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [decade, setDecade] = useState<Decade>("any");
  const [rating, setRating] = useState<Rating>("0");
  const [length, setLength] = useState<Length>("any");
  const [sort, setSort] = useState<DiscoverSort>("popularity");
  const [showFilters, setShowFilters] = useState(true);

  const toggleGenre = (id: number) =>
    setGenreIds((ids) => (ids.includes(id) ? ids.filter((g) => g !== id) : [...ids, id]));

  const filters = useMemo(
    () => ({
      genreIds,
      ...decadeBounds(decade),
      minRating: Number(rating),
      ...lengthBounds(length),
    }),
    [genreIds, decade, rating, length],
  );
  const filterKey = JSON.stringify(filters);

  const activeCount =
    (genreIds.length ? 1 : 0) + (decade !== "any" ? 1 : 0) + (rating !== "0" ? 1 : 0) + (length !== "any" ? 1 : 0);

  const reset = () => {
    setGenreIds([]);
    setDecade("any");
    setRating("0");
    setLength("any");
  };

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader
          title="Discover"
          right={
            <TouchableOpacity onPress={() => setShowFilters((v) => !v)} accessibilityRole="button" hitSlop={8}>
              <Text className="text-accent font-semibold">
                {showFilters ? "Hide filters" : `Filters${activeCount ? ` (${activeCount})` : ""}`}
              </Text>
            </TouchableOpacity>
          }
        />
        <DiscoverList
          filters={filters}
          filterKey={filterKey}
          sort={sort}
          onSortChange={setSort}
          header={
            showFilters ? (
              <View className="mb-4">
                <Text className="text-light-300 text-sm mb-2">Genres</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {(genres.data ?? []).map((g) => (
                      <GenreChip
                        key={g.id}
                        label={g.name}
                        selected={genreIds.includes(g.id)}
                        onPress={() => toggleGenre(g.id)}
                      />
                    ))}
                  </View>
                </ScrollView>

                <Text className="text-light-300 text-sm mb-2">Decade</Text>
                <View className="mb-4">
                  <OptionPicker options={DECADES} value={decade} onChange={setDecade} wrap />
                </View>

                <Text className="text-light-300 text-sm mb-2">Rating</Text>
                <View className="mb-4">
                  <OptionPicker options={RATINGS} value={rating} onChange={setRating} />
                </View>

                <Text className="text-light-300 text-sm mb-2">Length</Text>
                <View className="mb-4">
                  <OptionPicker options={LENGTHS} value={length} onChange={setLength} wrap />
                </View>

                {activeCount > 0 ? (
                  <TouchableOpacity onPress={reset} accessibilityRole="button" className="self-start mb-2">
                    <Text className="text-accent text-sm font-semibold">Clear filters</Text>
                  </TouchableOpacity>
                ) : null}

                <Text className="text-light-300 text-sm mb-2">Sort</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}
