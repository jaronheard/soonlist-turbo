import React from "react";
import { Animated, Pressable, useWindowDimensions } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import { Heart } from "~/components/icons";
import { api } from "~/utils/api";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
}

export default function SaveButton({ eventId, isSaved }: SaveButtonProps) {
  const { isLoaded, user } = useUser();
  const username = user?.username || "";
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const utils = api.useUtils();
  const saveEventMutation = api.event.follow.useMutation({
    async onMutate(newSavedEvent) {
      await utils.event.getSavedIdsForUser.cancel();
      const prevData = utils.event.getSavedIdsForUser.getData({
        userName: username,
      });

      utils.event.getSavedIdsForUser.setData({ userName: username }, (old) =>
        old ? [...old, { id: newSavedEvent.id }] : [{ id: newSavedEvent.id }],
      );

      return { prevData };
    },
    onError(err, newSavedEvent, ctx) {
      utils.event.getSavedIdsForUser.setData(
        { userName: username },
        ctx?.prevData,
      );
    },
    onSettled() {
      void utils.event.getSavedIdsForUser.invalidate();
      void utils.event.getEventsForUser.invalidate();
      void utils.event.getStats.invalidate();
    },
  });

  const unsaveEventMutation = api.event.unfollow.useMutation({
    async onMutate(unsavedEvent) {
      await utils.event.getSavedIdsForUser.cancel();
      const prevData = utils.event.getSavedIdsForUser.getData({
        userName: username,
      });

      utils.event.getSavedIdsForUser.setData({ userName: username }, (old) =>
        old ? old.filter((event) => event.id !== unsavedEvent.id) : [],
      );

      return { prevData };
    },
    onError(err, unsavedEvent, ctx) {
      utils.event.getSavedIdsForUser.setData(
        { userName: username },
        ctx?.prevData,
      );
    },
    onSettled() {
      void utils.event.getSavedIdsForUser.invalidate();
      void utils.event.getEventsForUser.invalidate();
      void utils.event.getStats.invalidate();
    },
  });

  const handlePress = () => {
    if (!isLoaded) return;

    if (isSaved) {
      unsaveEventMutation.mutate({ id: eventId });
    } else {
      saveEventMutation.mutate({ id: eventId });
    }

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
      className={`flex-row items-center rounded-full p-1 ${
        isSaved ? "bg-interactive-2" : "bg-interactive-2"
      } ${!isLoaded ? "opacity-50" : ""}`}
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
