import React from "react";
import { Animated, Pressable, useWindowDimensions } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import { Heart } from "~/components/icons";
import { useEventSaveActions } from "~/hooks/useEventActions";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
}

export default function SaveButton({ eventId, isSaved }: SaveButtonProps) {
  const { isLoaded } = useUser();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  // Use the simplified event save actions hook
  const { handleFollow, handleUnfollow } = useEventSaveActions(
    eventId,
    isSaved,
  );

  const handlePress = () => {
    if (!isLoaded) return;

    // Use the event actions
    if (isSaved) {
      void handleUnfollow();
    } else {
      void handleFollow();
    }

    // Animate the button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isLoaded}
      className={`flex-row items-center rounded-full p-2.5 ${
        isSaved ? "bg-interactive-2" : "bg-interactive-2"
      } ${!isLoaded ? "opacity-50" : ""}`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {isSaved ? (
          <Heart color="#5A32FB" size={iconSize} fill={"#5A32FB"} />
        ) : (
          <Heart color="#5A32FB" size={iconSize} fill="white" />
        )}
      </Animated.View>
    </Pressable>
  );
}
