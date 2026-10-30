import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { icons } from "@/constants/icons";
import { fetchMovieDetails, getImageUrl } from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import ErrorState from "@/components/ErrorState";

function formatRuntime(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: movie,
    loading,
    error,
    refetch,
  } = useFetch(() => fetchMovieDetails(id));

  const { isSaved, toggle, hydrated } = useSavedMovies();
  const saved = movie ? isSaved(movie.id) : false;

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
  const year = movie?.release_date?.split("-")[0];
  const runtime = formatRuntime(movie?.runtime ?? null);
  const rating = movie?.vote_average ? movie.vote_average.toFixed(1) : null;

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
                        ({movie.vote_count})
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
                    <View
                      key={genre.id}
                      className="bg-dark-100 rounded-full px-4 py-2"
                    >
                      <Text className="text-light-200 text-sm">
                        {genre.name}
                      </Text>
                    </View>
                  ))}
                </View>
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
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
