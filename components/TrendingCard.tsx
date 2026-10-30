import { Image, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { getImageUrl } from "@/services/api";

interface Props {
  movie: Movie;
  index: number;
}

/** Wider poster card with a rank badge, used in the horizontal trending row. */
export default function TrendingCard({ movie, index }: Props) {
  const poster = getImageUrl(movie.poster_path, "w342");

  return (
    <Link
      href={{ pathname: "/movies/[id]", params: { id: String(movie.id) } }}
      asChild
    >
      <TouchableOpacity className="w-32 relative">
        {poster ? (
          <Image
            source={{ uri: poster }}
            className="w-32 h-48 rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <View className="w-32 h-48 rounded-lg bg-dark-100 items-center justify-center">
            <Image
              source={icons.play}
              className="w-8 h-8"
              tintColor="#AB8BFF"
              resizeMode="contain"
            />
          </View>
        )}

        {/* Rank badge */}
        <View className="absolute bottom-9 -left-3 w-12 h-12 items-center justify-center">
          <Image
            source={images.rankingGradient}
            className="absolute w-12 h-12"
            resizeMode="contain"
          />
          <Text className="text-white text-2xl font-bold">{index + 1}</Text>
        </View>

        <Text className="text-light-200 text-sm font-bold mt-2" numberOfLines={2}>
          {movie.title}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}
