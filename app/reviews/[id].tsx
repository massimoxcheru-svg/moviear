import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { fetchMovieReviews } from "@/services/api";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import ScreenHeader from "@/components/ScreenHeader";
import ReviewCard from "@/components/ReviewCard";
import ErrorState from "@/components/ErrorState";
import ListFooter from "@/components/ListFooter";

export default function ReviewsScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  const { items, loading, loadingMore, error, loadMore, retry } = usePaginatedFetch(
    (page) => fetchMovieReviews(id, page),
    { key: `reviews:${id}` },
  );
  const hasItems = items.length > 0;

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={title ? `Reviews: ${title}` : "Reviews"} />
        <FlatList
          className="px-5"
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReviewCard review={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator size="large" color="#AB8BFF" className="mt-10" />
            ) : error && !hasItems ? (
              <ErrorState message={error.message} onRetry={retry} />
            ) : null
          }
          ListEmptyComponent={
            loading || error ? null : (
              <Text className="text-light-300 text-center mt-10">No reviews yet</Text>
            )
          }
          ListFooterComponent={
            <ListFooter loadingMore={loadingMore} error={hasItems ? error : null} onRetry={retry} />
          }
        />
      </SafeAreaView>
    </View>
  );
}
