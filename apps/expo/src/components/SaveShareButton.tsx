import React from "react";
import {
  Animated,
  Share,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "@clerk/clerk-expo";

import { Heart, ShareIcon } from "~/components/icons";
import { useEventSaveActions } from "~/hooks/useEventActions";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

interface SaveShareButtonProps {
  eventId: string;
  isSaved: boolean;
}

export default function SaveShareButton({
  eventId,
  isSaved,
}: SaveShareButtonProps) {
  const { isLoaded } = useUser();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  // Local state to track saved status for immediate UI updates
  const [localIsSaved, setLocalIsSaved] = React.useState(isSaved);

  // Use the simplified event save actions hook
  const { handleFollow } = useEventSaveActions(eventId, isSaved);

  const handleShare = async () => {
    const triggerHaptic = () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    triggerHaptic();
    try {
      await Share.share({
        url: `${Config.apiBaseUrl}/event/${eventId}`,
      });
    } catch (error) {
      logError("Error sharing event", error);
    }
  };

  const handlePress = () => {
    if (!isLoaded) return;

    if (localIsSaved) {
      // If already saved, share the event
      void handleShare();
    } else {
      // If not saved, save the event and update local state immediately
      setLocalIsSaved(true);
      void handleFollow();
    }
  };

  return (
    <TouchableOpacity
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
      style={{ borderRadius: 16 }}
      onPress={handlePress}
      disabled={!isLoaded}
      accessibilityLabel={localIsSaved ? "Share" : "Save"}
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {localIsSaved ? (
          <ShareIcon size={iconSize * 1.1} color="#5A32FB" />
        ) : (
          <Heart color="#5A32FB" size={iconSize * 1.1} fill="white" />
        )}
      </Animated.View>
      <Text className="text-base font-bold text-interactive-1">
        {localIsSaved ? "Share" : "Save"}
      </Text>
    </TouchableOpacity>
  );
}
