import { Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { getImageUrlForSetting } from "@/services/api";
import Poster from "./Poster";

interface Props {
  person: PersonSummary;
}

/** Grid card for a person in search results. */
export default function PersonCard({ person }: Props) {
  const photo = getImageUrlForSetting(person.profile_path, "w342");
  const knownFor = person.known_for
    .map((m) => m.title)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return (
    <Link href={{ pathname: "/people/[id]", params: { id: String(person.id) } }} asChild>
      <TouchableOpacity className="w-[30%] mb-1" accessibilityRole="link">
        <Poster
          uri={photo}
          className="w-full h-52 rounded-lg"
          placeholderIcon={icons.person}
          iconClassName="w-10 h-10"
        />
        <Text className="text-white text-sm font-bold mt-2" numberOfLines={1}>
          {person.name}
        </Text>
        <Text className="text-light-300 text-xs mt-1" numberOfLines={2}>
          {knownFor || person.known_for_department}
        </Text>
      </TouchableOpacity>
    </Link>
  );
}
