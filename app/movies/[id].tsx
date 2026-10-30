import { useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { icons } from "@/constants/icons";
import {
  fetchMovieDetails,
  fetchRecommendedMovies,
  getImageUrl,
  pickDirectors,
  pickTopCast,
  pickTrailers,
} from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import { useSettings } from "@/hooks/useSettings";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import {
  formatCount,
  formatDate,
  formatMoney,
  formatRating,
  formatRuntime,
  formatYear,
  joinNames,
} from "@/utils/format";
import ErrorState from "@/components/ErrorState";
import SectionHeader from "@/components/SectionHeader";
import CastCard from "@/components/CastCard";
import VideoCard from "@/components/VideoCard";
import MovieRow from "@/components/MovieRow";

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: movie,
    loading,
    error,
    refetch,
  } = useFetch(() => fetchMovieDetails(id));

  const recommended = useFetch(async () => (await fetchRecommendedMovies(id)).results);

  const { isSaved, toggle, hydrated } = useSavedMovies();
  const { settings } = useSettings();
  const history = useWatchHistory();
  const saved = movie ? isSaved(movie.id) : false;

  // Record the view once the movie has loaded, if the user allows it.
  useEffect(() => {
    if (!movie || !settings.trackHistory) return;
    history.record({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    });
    // Only when a different movie loads; a settings change should not re-record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id]);

  const onToggleSaved = () => {
    if (!movie) return;
    // Haptics is a no-op / unsupported on some platforms (web); never let it throw.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggle({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    });
  };

  const poster = getImageUrl(movie?.poster_path, "w780");
  const year = formatYear(movie?.release_date);
  const runtime = formatRuntime(movie?.runtime);
  const rating = movie?.vote_average ? formatRating(movie.vote_average) : null;
  const directors = pickDirectors(movie?.credits?.crew);
  const cast = pickTopCast(movie?.credits?.cast);
  const trailers = pickTrailers(movie?.videos?.results);
  const budget = formatMoney(movie?.budget);
  const revenue = formatMoney(movie?.revenue);
  const releaseDate = formatDate(movie?.release_date);
  const companies = movie?.production_companies.map((c) => c.name) ?? [];
  const language = movie?.spoken_languages.find(
    (l) => l.iso_639_1 === movie.original_language,
  )?.english_name;

  const facts: { label: string; value: string | null }[] = [
    { label: "Status", value: movie?.status ?? null },
    { label: "Released", value: releaseDate },
    { label: "Language", value: language ?? null },
    { label: "Budget", value: budget },
    { label: "Box office", value: revenue },
    { label: "Production", value: companies.length ? joinNames(companies) : null },
  ];

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Poster */}
        {poster ? (
          <Image
            source={{ uri: poster }}
            className="w-full h-[500px]"
            resizeMode="cover"
          />
        ) : (
          <View className="h-[400px] bg-dark-100 items-center justify-center">
            {loading ? (
              <ActivityIndicator size="large" color="#AB8BFF" />
            ) : (
              <>
                <Image
                  source={icons.play}
                  className="w-16 h-16"
                  tintColor="#AB8BFF"
                  resizeMode="contain"
                />
                <Text className="text-light-300 mt-4">No poster available</Text>
              </>
            )}
          </View>
        )}

        {/* Back Button */}
        <SafeAreaView className="absolute top-0 left-0 right-0">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="bg-dark-100/80 rounded-full w-10 h-10 items-center justify-center ml-5 mt-2"
          >
            <Image
              source={icons.arrow}
              className="w-5 h-5 rotate-180"
              tintColor="#FFFFFF"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Movie Info */}
        <View className="px-5 mt-5">
          {error ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : loading || !movie ? (
            <View className="min-h-[200px] items-center justify-center">
              <ActivityIndicator size="large" color="#AB8BFF" />
            </View>
          ) : (
            <>
              <Text className="text-white text-2xl font-bold">
                {movie.title}
              </Text>
              {movie.tagline ? (
                <Text className="text-light-300 italic mt-1">
                  {movie.tagline}
                </Text>
              ) : null}

              {/* Meta Info */}
              <View className="flex-row items-center mt-3 gap-4">
                {rating ? (
                  <View className="flex-row items-center">
                    <Image
                      source={icons.star}
                      className="w-4 h-4 mr-1"
                      tintColor="#FFD700"
                      resizeMode="contain"
                    />
                    <Text className="text-light-200">
                      {rating}
                      <Text className="text-light-300">
                        {" "}
                        ({formatCount(movie.vote_count)})
                      </Text>
                    </Text>
                  </View>
                ) : null}
                {year ? <Text className="text-light-300">{year}</Text> : null}
                {runtime ? (
                  <Text className="text-light-300">{runtime}</Text>
                ) : null}
              </View>

              {/* Genres */}
              {movie.genres.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {movie.genres.map((genre) => (
                    <TouchableOpacity
                      key={genre.id}
                      accessibilityRole="link"
                      onPress={() =>
                        router.push({
                          pathname: "/genres/[id]",
                          params: { id: String(genre.id), name: genre.name },
                        })
                      }
                      className="bg-dark-100 rounded-full px-4 py-2"
                    >
                      <Text className="text-light-200 text-sm">
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {directors.length > 0 ? (
                <Text className="text-light-300 mt-4">
                  Directed by{" "}
                  <Text className="text-light-200 font-semibold">
                    {joinNames(directors.map((d) => d.name))}
                  </Text>
                </Text>
              ) : null}

              {/* Overview */}
              <View className="mt-6">
                <Text className="text-white text-lg font-semibold mb-3">
                  Overview
                </Text>
                <Text className="text-light-300 leading-6">
                  {movie.overview || "No overview available."}
                </Text>
              </View>

              {/* Save / unsave toggle */}
              <TouchableOpacity
                onPress={onToggleSaved}
                disabled={!hydrated}
                accessibilityRole="button"
                accessibilityState={{ selected: saved, disabled: !hydrated }}
                accessibilityLabel={
                  saved ? "Remove from watchlist" : "Add to watchlist"
                }
                className={
                  saved
                    ? "bg-dark-100 border border-accent rounded-full py-4 items-center mt-8"
                    : "bg-accent rounded-full py-4 items-center mt-8"
                }
              >
                <View className="flex-row items-center">
                  <Image
                    source={icons.save}
                    className="w-5 h-5 mr-2"
                    tintColor={saved ? "#AB8BFF" : "#FFFFFF"}
                    resizeMode="contain"
                  />
                  <Text
                    className={
                      saved
                        ? "text-accent font-semibold text-base"
                        : "text-white font-semibold text-base"
                    }
                  >
                    {saved ? "Saved to Watchlist" : "Add to Watchlist"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cast */}
              {cast.length > 0 ? (
                <View className="mt-8">
                  <SectionHeader title="Top cast" />
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={cast}
                    keyExtractor={(item) => `${item.id}-${item.character}`}
                    renderItem={({ item }) => <CastCard member={item} />}
                    ItemSeparatorComponent={() => <View className="w-3" />}
                  />
                </View>
              ) : null}

              {/* Trailers */}
              {trailers.length > 0 ? (
                <View className="mt-8">
                  <SectionHeader title="Trailers" />
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trailers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <VideoCard video={item} />}
                    ItemSeparatorComponent={() => <View className="w-4" />}
                  />
                </View>
              ) : null}

              {/* Facts */}
              <View className="mt-8">
                <SectionHeader title="Details" />
                <View className="bg-dark-100 rounded-2xl px-5 py-2">
                  {facts
                    .filter((f) => f.value)
                    .map((f) => (
                      <View
                        key={f.label}
                        className="flex-row justify-between py-3 border-b border-dark-200"
                      >
                        <Text className="text-light-300">{f.label}</Text>
                        <Text
                          className="text-light-200 font-semibold flex-1 text-right ml-4"
                          numberOfLines={2}
                        >
                          {f.value}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>

              {/* Recommendations */}
              <View className="mt-8">
                <SectionHeader title="More like this" />
                <MovieRow
                  movies={recommended.data ?? []}
                  loading={recommended.loading}
                  error={recommended.error}
                  onRetry={recommended.refetch}
                  emptyText="No recommendations yet"
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
