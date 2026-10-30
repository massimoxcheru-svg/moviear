import { useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { icons } from "@/constants/icons";
import { buildFilmography, fetchPerson, getImageUrl } from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { ageOn, formatDate, todayYmd, truncate } from "@/utils/format";
import ScreenHeader from "@/components/ScreenHeader";
import ErrorState from "@/components/ErrorState";
import Poster from "@/components/Poster";
import MovieCard from "@/components/MovieCard";
import SectionHeader from "@/components/SectionHeader";

const BIO_PREVIEW_LENGTH = 320;

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: person, loading, error, refetch } = useFetch(() => fetchPerson(id));
  const [bioExpanded, setBioExpanded] = useState(false);

  const films = useMemo(() => buildFilmography(person?.movie_credits), [person]);

  const photo = getImageUrl(person?.profile_path, "h632");
  const born = formatDate(person?.birthday);
  const died = formatDate(person?.deathday);
  const age = ageOn(person?.birthday, person?.deathday ?? todayYmd());
  const bio = person?.biography?.trim() ?? "";
  const bioIsLong = bio.length > BIO_PREVIEW_LENGTH;
  const bioText = bioExpanded || !bioIsLong ? bio : truncate(bio, BIO_PREVIEW_LENGTH);

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={person?.name ?? "Person"} />

        <FlatList
          className="px-5"
          data={films}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MovieCard movie={item} />}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: "flex-start", gap: 12, marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            error ? (
              <ErrorState message={error.message} onRetry={refetch} />
            ) : loading || !person ? (
              <View className="min-h-[300px] items-center justify-center">
                <ActivityIndicator size="large" color="#AB8BFF" />
              </View>
            ) : (
              <View className="mb-6">
                <View className="flex-row">
                  <Poster
                    uri={photo}
                    className="w-32 h-44 rounded-xl"
                    placeholderIcon={icons.person}
                    iconClassName="w-12 h-12"
                  />
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-white text-2xl font-bold">{person.name}</Text>
                    <Text className="text-light-200 mt-1">{person.known_for_department}</Text>
                    {born ? (
                      <Text className="text-light-300 text-sm mt-3">
                        Born {born}
                        {age !== null && !died ? ` (age ${age})` : ""}
                      </Text>
                    ) : null}
                    {died ? (
                      <Text className="text-light-300 text-sm mt-1">
                        Died {died}
                        {age !== null ? ` (aged ${age})` : ""}
                      </Text>
                    ) : null}
                    {person.place_of_birth ? (
                      <Text className="text-light-300 text-sm mt-1" numberOfLines={2}>
                        {person.place_of_birth}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {bio ? (
                  <View className="mt-6">
                    <SectionHeader title="Biography" />
                    <Text className="text-light-300 leading-6">{bioText}</Text>
                    {bioIsLong ? (
                      <TouchableOpacity
                        onPress={() => setBioExpanded((v) => !v)}
                        accessibilityRole="button"
                        className="mt-2 self-start"
                      >
                        <Text className="text-accent font-semibold">
                          {bioExpanded ? "Show less" : "Read more"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <SectionHeader
                  title={films.length > 0 ? `Filmography (${films.length})` : "Filmography"}
                  className="mt-8"
                />
              </View>
            )
          }
          ListEmptyComponent={
            !loading && !error && person ? (
              <Text className="text-light-300">No movie credits on record</Text>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}
