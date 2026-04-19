import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { usePostHog } from "posthog-react-native";

interface ShareListPromptSheetProps {
  isVisible: boolean;
  onShare: () => void;
  onDismiss: (method: "not_now_button" | "swipe") => void;
}

export function ShareListPromptSheet({
  isVisible,
  onShare,
  onDismiss,
}: ShareListPromptSheetProps): React.ReactElement {
  const posthog = usePostHog();

  React.useEffect(() => {
    if (isVisible) {
      posthog.capture("share_prompt_one_shot_shown");
    }
  }, [isVisible, posthog]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => onDismiss("swipe")}
    >
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={() => onDismiss("swipe")}
        accessibilityRole="button"
        accessibilityLabel="Dismiss share prompt"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white px-6 pb-8 pt-4"
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-neutral-300" />
          <Text className="mb-2 text-center font-heading text-2xl font-bold text-neutral-1">
            Your Soon List is ready to share
          </Text>
          <Text className="mb-6 text-center text-base text-neutral-2">
            Send your upcoming events to friends.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share your Soon List"
            onPress={onShare}
            className="mb-3 rounded-full bg-interactive-1 py-4"
          >
            <Text className="text-center text-base font-semibold text-white">
              Share
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={() => onDismiss("not_now_button")}
            className="py-3"
          >
            <Text className="text-center text-base font-medium text-neutral-2">
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
