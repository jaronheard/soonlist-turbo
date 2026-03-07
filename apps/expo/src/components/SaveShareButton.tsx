import React from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { EyeOff, Globe2, Heart } from "~/components/icons";
import { useEventSaveActions } from "~/hooks/useEventActions";

interface SaveShareButtonProps {
  eventId: string;
  isSaved: boolean;
  source: string;
  isOwnEvent?: boolean;
  visibility?: "public" | "private";
}

export default function SaveShareButton({
  eventId,
  isSaved,
  source = "unknown",
  isOwnEvent = false,
  visibility = "private",
}: SaveShareButtonProps) {
  const { isLoaded } = useUser();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;
  const posthog = usePostHog();
  const toggleVisibility = useMutation(api.events.toggleVisibility);

  const { handleFollow } = useEventSaveActions(eventId, isSaved);

  const isDiscoverable = visibility === "public";

  const handleToggleDiscoverable = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newVisibility = isDiscoverable ? "private" : "public";
    posthog.capture("toggle_discoverable", {
      event_id: eventId,
      source,
      new_visibility: newVisibility,
    });
    await toggleVisibility({ id: eventId, visibility: newVisibility });
  };

  const handlePress = () => {
    if (!isLoaded) return;

    if (isOwnEvent) {
      void handleToggleDiscoverable();
    } else {
      void handleFollow();
    }
  };

  // Own events: show discoverable toggle
  if (isOwnEvent) {
    return (
      <TouchableOpacity
        className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
        style={{ borderRadius: 16 }}
        onPress={handlePress}
        disabled={!isLoaded}
        accessibilityLabel={
          isDiscoverable ? "Make not discoverable" : "Make discoverable"
        }
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {isDiscoverable ? (
            <Globe2 size={iconSize * 1.1} color="#5A32FB" />
          ) : (
            <EyeOff size={iconSize * 1.1} color="#5A32FB" />
          )}
        </Animated.View>
        <Text className="text-base font-bold text-interactive-1">
          {isDiscoverable ? "Discoverable" : "Not discoverable"}
        </Text>
      </TouchableOpacity>
    );
  }

  // Others' events: show Save if not saved, hide if already saved
  if (isSaved) {
    return null;
  }

  return (
    <TouchableOpacity
      className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
      style={{ borderRadius: 16 }}
      onPress={handlePress}
      disabled={!isLoaded}
      accessibilityLabel="Save"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Heart color="#5A32FB" size={iconSize * 1.1} fill="white" />
      </Animated.View>
      <Text className="text-base font-bold text-interactive-1">Save</Text>
    </TouchableOpacity>
  );
}
