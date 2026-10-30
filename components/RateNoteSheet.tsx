import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MAX_NOTE_LENGTH } from "@/services/savedMovies";
import RatingPicker from "./RatingPicker";

interface Props {
  visible: boolean;
  title: string;
  rating: number | null;
  note: string;
  onSave: (rating: number | null, note: string) => void;
  onClose: () => void;
}

/** Bottom sheet for the user's own rating and note on a saved movie. */
export default function RateNoteSheet({ visible, title, rating, note, onSave, onClose }: Props) {
  const [draftRating, setDraftRating] = useState<number | null>(rating);
  const [draftNote, setDraftNote] = useState(note);

  // Start from the stored values every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraftRating(rating);
      setDraftNote(note);
    }
  }, [visible, rating, note]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end"
      >
        <Pressable className="flex-1 bg-black/60" onPress={onClose} accessibilityLabel="Close" />
        <View className="bg-dark-200 rounded-t-3xl px-5 pt-5 pb-8">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-light-300 text-sm mt-1 mb-5">Your rating and notes</Text>

          <RatingPicker value={draftRating} onChange={setDraftRating} />

          <TextInput
            value={draftNote}
            onChangeText={setDraftNote}
            placeholder="What did you think? (optional)"
            placeholderTextColor="#9CA4AB"
            multiline
            maxLength={MAX_NOTE_LENGTH}
            textAlignVertical="top"
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mt-6 min-h-[96px]"
          />
          <Text className="text-light-300 text-xs text-right mt-1">
            {draftNote.length} / {MAX_NOTE_LENGTH}
          </Text>

          <View className="flex-row mt-5 gap-3">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              className="flex-1 bg-dark-100 rounded-full py-3 items-center"
            >
              <Text className="text-light-200 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(draftRating, draftNote)}
              accessibilityRole="button"
              className="flex-1 bg-accent rounded-full py-3 items-center"
            >
              <Text className="text-primary font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
