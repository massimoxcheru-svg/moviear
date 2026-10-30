import { Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { getImageUrl } from "@/services/api";
import Poster from "./Poster";

interface Props {
  member: CastMember;
}

/** Round headshot with name and character, linking to the person screen. */
export default function CastCard({ member }: Props) {
  const photo = getImageUrl(member.profile_path, "w185");

  return (
    <Link
      href={{ pathname: "/people/[id]", params: { id: String(member.id) } }}
      asChild
    >
      <TouchableOpacity className="w-24 items-center" accessibilityRole="link">
        <Poster
          uri={photo}
          className="w-20 h-20 rounded-full"
          placeholderIcon={icons.person}
          iconClassName="w-8 h-8"
        />
        <Text className="text-white text-xs font-semibold mt-2 text-center" numberOfLines={2}>
          {member.name}
        </Text>
        {member.character ? (
          <Text className="text-light-300 text-xs text-center mt-0.5" numberOfLines={2}>
            {member.character}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Link>
  );
}
