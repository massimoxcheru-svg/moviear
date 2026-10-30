import { ActivityIndicator, FlatList, Text, View } from "react-native";
import MovieCard from "./MovieCard";
import ErrorState from "./ErrorState";

interface Props {
  movies: readonly MovieCardMovie[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyText?: string;
}

/** Horizontal strip of compact movie cards with loading, error and empty states. */
export default function MovieRow({
  movies,
  loading = false,
  error = null,
  onRetry,
  emptyText = "Nothing here yet",
}: Props) {
  if (loading) {
    return (
      <View className="h-40 items-center justify-center">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (movies.length === 0) {
    return <Text className="text-light-300">{emptyText}</Text>;
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={movies}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <MovieCard movie={item} layout="row" />}
      ItemSeparatorComponent={() => <View className="w-4" />}
    />
  );
}
