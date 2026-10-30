import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { icons } from "@/constants/icons";
import {
  buildExternalLinks,
  fetchMovieDetails,
  fetchMovieReviews,
  fetchRecommendedMovies,
  getImageUrlForSetting,
  getMovieUrl,
  pickBackdrops,
  pickCertification,
  pickDirectors,
  pickTopCast,
  pickTrailers,
  pickWatchProviders,
} from "@/services/api";
import { REGIONS } from "@/services/settings";
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
import ProviderRow from "@/components/ProviderRow";
import ImageGallery from "@/components/ImageGallery";
import ReviewCard from "@/components/ReviewCard";
import LinkRow from "@/components/LinkRow";
import GenreChip from "@/components/GenreChip";
import RateNoteSheet from "@/components/RateNoteSheet";
import Poster from "@/components/Poster";

const REVIEW_PREVIEW = 2;
const KEYWORD_LIMIT = 12;

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const details = useFetch(({ force }) => fetchMovieDetails(id, { force }));
  const { data: movie, loading, error, refetch } = details;

  const recommended = useFetch(async () => (await fetchRecommendedMovies(id)).results);
  const reviews = useFetch(() => fetchMovieReviews(id));

  const { isSaved, toggle, hydrated, get, rate, setNote } = useSavedMovies();
  const history = useWatchHistory();
  const saved = movie ? isSaved(movie.id) : false;
  const savedEntry = movie ? get(movie.id) : undefined;

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([details.refresh(), recommended.refresh(), reviews.refresh()]);
    setRefreshing(false);
  }, [details, recommended, reviews]);

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
      genre_ids: movie.genres.map((g) => g.id),
    });
  };

  const onShare = () => {
    if (!movie) return;
    const url = getMovieUrl(movie.id);
    Share.share({ message: `${movie.title} ${url}`, url, title: movie.title }).catch(() => {});
  };

  const onSaveRating = (rating: number | null, note: string) => {
    if (!movie) return;
    rate(movie.id, rating);
    setNote(movie.id, note);
    setSheetOpen(false);
  };

  const poster = getImageUrlForSetting(movie?.poster_path, "w780");
  const year = formatYear(movie?.release_date);
  const runtime = formatRuntime(movie?.runtime);
  const rating = movie?.vote_average ? formatRating(movie.vote_average) : null;
  const certification = pickCertification(movie?.release_dates, settings.region);
  const directors = pickDirectors(movie?.credits?.crew);
  const cast = pickTopCast(movie?.credits?.cast);
  const trailers = pickTrailers(movie?.videos?.results);
  const backdrops = pickBackdrops(movie?.images);
  const watch = pickWatchProviders(movie?.["watch/providers"], settings.region);
  const regionName = REGIONS.find((r) => r.code === settings.region)?.name ?? settings.region;
  const keywords = movie?.keywords?.keywords.slice(0, KEYWORD_LIMIT) ?? [];
  const links = buildExternalLinks(movie?.external_ids, movie?.homepage);
  const budget = formatMoney(movie?.budget);
  const revenue = formatMoney(movie?.revenue);
  const releaseDate = formatDate(movie?.release_date);
  const companies = movie?.production_companies.map((c) => c.name) ?? [];
  const language = movie?.spoken_languages.find(
    (l) => l.iso_639_1 === movie.original_language,
  )?.english_name;
  const collection = movie?.belongs_to_collection ?? null;
  const reviewCount = reviews.data?.total_results ?? 0;

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB8BFF" />
        }
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

        {/* Back and share */}
        <SafeAreaView className="absolute top-0 left-0 right-0 flex-row justify-between px-5">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="bg-dark-100/80 rounded-full w-10 h-10 items-center justify-center mt-2"
          >
            <Image
              source={icons.arrow}
              className="w-5 h-5 rotate-180"
              tintColor="#FFFFFF"
              resizeMode="contain"
            />
          </TouchableOpacity>
          {movie ? (
            <TouchableOpacity
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel="Share"
              className="bg-dark-100/80 rounded-full px-4 h-10 items-center justify-center mt-2"
            >
              <Text className="text-white font-semibold">Share</Text>
            </TouchableOpacity>
          ) : null}
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
              <View className="flex-row items-center flex-wrap mt-3 gap-4">
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
                {certification ? (
                  <View className="border border-light-300 rounded px-2 py-0.5">
                    <Text className="text-light-200 text-xs font-semibold">{certification}</Text>
                  </View>
                ) : null}
              </View>

              {/* Genres */}
              {movie.genres.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-4">
                  {movie.genres.map((genre) => (
                    <GenreChip
                      key={genre.id}
                      label={genre.name}
                      onPress={() =>
                        router.push({
                          pathname: "/genres/[id]",
                          params: { id: String(genre.id), name: genre.name },
                        })
                      }
                    />
                  ))}
                </View>
              ) : null}

              {directors.length > 0 ? (
                <Text className="text-light-300 mt-4">
                  Directed by{" "}
                  {directors.map((d, i) => (
                    <Text
                      key={d.id}
                      className="text-light-200 font-semibold"
                      onPress={() =>
                        router.push({ pathname: "/people/[id]", params: { id: String(d.id) } })
                      }
                    >
                      {d.name}
                      {i < directors.length - 1 ? ", " : ""}
                    </Text>
                  ))}
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

              {/* Your rating and note */}
              {saved && savedEntry ? (
                <TouchableOpacity
                  onPress={() => setSheetOpen(true)}
                  accessibilityRole="button"
                  className="bg-dark-100 rounded-2xl p-4 mt-3"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-semibold">Your rating</Text>
                    <View className="flex-row items-center">
                      {savedEntry.rating !== null ? (
                        <>
                          <Image source={icons.star} className="w-4 h-4 mr-1" tintColor="#FFD700" resizeMode="contain" />
                          <Text className="text-light-200 font-semibold">{savedEntry.rating} / 10</Text>
                        </>
                      ) : (
                        <Text className="text-accent font-semibold">Rate it</Text>
                      )}
                    </View>
                  </View>
                  {savedEntry.note ? (
                    <Text className="text-light-300 text-sm mt-2" numberOfLines={3}>
                      {savedEntry.note}
                    </Text>
                  ) : (
                    <Text className="text-light-300 text-xs mt-2">Tap to add a note</Text>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Where to watch */}
              <View className="mt-8">
                <SectionHeader title={`Where to watch in ${regionName}`} />
                <ProviderRow options={watch} regionName={regionName} />
              </View>

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

              {/* Images */}
              {backdrops.length > 0 ? (
                <View className="mt-8">
                  <SectionHeader title="Images" />
                  <ImageGallery images={backdrops} />
                </View>
              ) : null}

              {/* Collection */}
              {collection ? (
                <View className="mt-8">
                  <SectionHeader title="Part of a series" />
                  <TouchableOpacity
                    onPress={() =>
                      router.push({ pathname: "/collections/[id]", params: { id: String(collection.id) } })
                    }
                    accessibilityRole="link"
                    className="flex-row items-center bg-dark-100 rounded-2xl p-3"
                  >
                    <Poster
                      uri={getImageUrlForSetting(collection.poster_path, "w185")}
                      className="w-14 h-20 rounded-lg"
                    />
                    <View className="flex-1 ml-4">
                      <Text className="text-white font-semibold" numberOfLines={2}>
                        {collection.name}
                      </Text>
                      <Text className="text-accent text-sm mt-1">See every film</Text>
                    </View>
                  </TouchableOpacity>
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
                {links.length > 0 ? (
                  <View className="mt-4">
                    <LinkRow links={links} />
                  </View>
                ) : null}
              </View>

              {/* Keywords */}
              {keywords.length > 0 ? (
                <View className="mt-8">
                  <SectionHeader title="Keywords" />
                  <View className="flex-row flex-wrap gap-2">
                    {keywords.map((k) => (
                      <GenreChip
                        key={k.id}
                        label={k.name}
                        onPress={() =>
                          router.push({
                            pathname: "/keywords/[id]",
                            params: { id: String(k.id), name: k.name },
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Reviews */}
              <View className="mt-8">
                <SectionHeader
                  title={reviewCount > 0 ? `Reviews (${reviewCount})` : "Reviews"}
                  action={
                    reviewCount > REVIEW_PREVIEW
                      ? {
                          label: "See all",
                          onPress: () =>
                            router.push({
                              pathname: "/reviews/[id]",
                              params: { id: String(movie.id), title: movie.title },
                            }),
                        }
                      : undefined
                  }
                />
                {reviews.loading ? (
                  <ActivityIndicator size="small" color="#AB8BFF" />
                ) : reviews.error ? (
                  <ErrorState message={reviews.error.message} onRetry={reviews.refetch} />
                ) : reviewCount === 0 ? (
                  <Text className="text-light-300">No reviews yet</Text>
                ) : (
                  reviews.data?.results
                    .slice(0, REVIEW_PREVIEW)
                    .map((review) => <ReviewCard key={review.id} review={review} />)
                )}
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

      {movie ? (
        <RateNoteSheet
          visible={sheetOpen}
          title={movie.title}
          rating={savedEntry?.rating ?? null}
          note={savedEntry?.note ?? ""}
          onSave={onSaveRating}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </View>
  );
}
