import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";
import { getImageUrl } from "@/services/api";
import { formatDate, truncate } from "@/utils/format";

interface Props {
  review: Review;
  /** Show the whole text instead of a preview with "Read more". */
  expanded?: boolean;
}

const PREVIEW_LENGTH = 280;

/** One user review: avatar, author, their score, and the text. */
export default function ReviewCard({ review, expanded = false }: Props) {
  const [open, setOpen] = useState(expanded);
  const avatar = getImageUrl(review.author_details.avatar_path, "w185");
  const name = review.author_details.name || review.author;
  const date = formatDate(review.created_at.slice(0, 10));
  const isLong = review.content.length > PREVIEW_LENGTH;
  const text = open || !isLong ? review.content : truncate(review.content, PREVIEW_LENGTH);

  return (
    <View className="bg-dark-100 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center">
        <View className="w-9 h-9 rounded-full bg-dark-200 overflow-hidden items-center justify-center">
          {avatar ? (
            <Image source={{ uri: avatar }} className="w-9 h-9" resizeMode="cover" />
          ) : (
            <Text className="text-light-200 font-semibold">{name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-white font-semibold" numberOfLines={1}>
            {name}
          </Text>
          {date ? <Text className="text-light-300 text-xs">{date}</Text> : null}
        </View>
        {review.author_details.rating !== null ? (
          <View className="flex-row items-center">
            <Image source={icons.star} className="w-3 h-3 mr-1" tintColor="#FFD700" resizeMode="contain" />
            <Text className="text-light-200 text-sm font-semibold">
              {review.author_details.rating}/10
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-light-300 leading-6 mt-3">{text}</Text>
      {isLong && !expanded ? (
        <TouchableOpacity onPress={() => setOpen((v) => !v)} accessibilityRole="button" className="mt-2 self-start">
          <Text className="text-accent font-semibold text-sm">{open ? "Show less" : "Read more"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
