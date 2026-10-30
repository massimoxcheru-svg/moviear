import { Image, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { getImageUrlForSetting } from "@/services/api";
import { formatRating, formatYear } from "@/utils/format";
import Poster from "./Poster";

interface Props extends MovieCardProps {
  /**
   * "grid" fills a third of a three column grid, "row" is a fixed width for
   * horizontal lists, "full" fills whatever the parent gives it.
   */
  layout?: "grid" | "row" | "full";
}

/** Poster card used in grids (Home, Search, Saved) and horizontal rows. */
export default function MovieCard({ movie, layout = "grid" }: Props) {
  const poster = getImageUrlForSetting(movie.poster_path, "w342");
  const year = formatYear(movie.release_date);
  const rating = formatRating(movie.vote_average);
  const width = layout === "grid" ? "w-[30%]" : layout === "row" ? "w-28" : "w-full";
  const height = layout === "row" ? "h-40" : "h-52";

  return (
    <Link
      href={{ pathname: "/movies/[id]", params: { id: String(movie.id) } }}
      asChild
    >
      <TouchableOpacity className={`${width} mb-1`} accessibilityRole="link">
        <Poster uri={poster} className={`w-full ${height} rounded-lg`} />

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
