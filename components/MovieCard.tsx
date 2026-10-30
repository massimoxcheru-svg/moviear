import { Image, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { getImageUrl } from "@/services/api";

/** Poster card used in the Home "Latest" grid and in Search results. */
export default function MovieCard({ movie }: MovieCardProps) {
  const poster = getImageUrl(movie.poster_path, "w342");
  const year = movie.release_date?.split("-")[0];
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

  return (
    <Link
      href={{ pathname: "/movies/[id]", params: { id: String(movie.id) } }}
      asChild
    >
      <TouchableOpacity className="w-[30%] mb-1">
        {poster ? (
          <Image
            source={{ uri: poster }}
            className="w-full h-52 rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-52 rounded-lg bg-dark-100 items-center justify-center">
            <Image
              source={icons.play}
              className="w-8 h-8"
              tintColor="#AB8BFF"
              resizeMode="contain"
            />
          </View>
        )}

        <Text className="text-white text-sm font-bold mt-2" numberOfLines={1}>
          {movie.title}
        </Text>

        <View className="flex-row items-center justify-between mt-1">
          <View className="flex-row items-center gap-x-1">
            <Image
              source={icons.star}
              className="w-3 h-3"
              tintColor="#FFD700"
              resizeMode="contain"
            />
            <Text className="text-light-200 text-xs font-semibold">{rating}</Text>
          </View>
          {year ? <Text className="text-light-300 text-xs">{year}</Text> : null}
        </View>
      </TouchableOpacity>
    </Link>
  );
}
