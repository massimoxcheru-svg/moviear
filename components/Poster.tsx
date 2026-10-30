import { Image, View, type ImageProps } from "react-native";
import { icons } from "@/constants/icons";

interface Props {
  /** Full image URL, or null to show the placeholder. */
  uri: string | null;
  /** Size classes (w-, h-, rounded-) applied to both image and placeholder. */
  className: string;
  /** Icon drawn in the placeholder. Defaults to the play icon. */
  placeholderIcon?: ImageProps["source"];
  /** Placeholder icon size class. */
  iconClassName?: string;
}

/** A TMDB image that falls back to a dark tile with an icon when missing. */
export default function Poster({
  uri,
  className,
  placeholderIcon = icons.play,
  iconClassName = "w-8 h-8",
}: Props) {
  if (uri) {
    return <Image source={{ uri }} className={className} resizeMode="cover" />;
  }
  return (
    <View className={`bg-dark-100 items-center justify-center ${className}`}>
      <Image
        source={placeholderIcon}
        className={iconClassName}
        tintColor="#AB8BFF"
        resizeMode="contain"
      />
    </View>
  );
}
