import React, { useState } from "react";
import { Animated, Pressable } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Heart } from "lucide-react-native";

import { api } from "~/utils/api";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
}

export default function SaveButton({
  eventId,
  isSaved: initialIsSaved,
}: SaveButtonProps) {
  const { isLoaded, user } = useUser();
  const username = user?.username || "";
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const scaleAnim = new Animated.Value(1);

  const utils = api.useUtils();
  const saveEventMutation = api.event.follow.useMutation({
    onMutate: async () => {
      await utils.event.getSavedIdsForUser.cancel();
      const prevData = utils.event.getSavedIdsForUser.getData();
      utils.event.getSavedIdsForUser.setData({ userName: username }, (old) =>
        old ? [...old, { id: eventId }] : [{ id: eventId }],
      );
      return { prevData };
    },
    onError: (_, __, context) => {
      utils.event.getSavedIdsForUser.setData(
        { userName: username },
        context?.prevData,
      );
      setIsSaved(initialIsSaved);
    },
    onSettled: () => {
      void utils.event.getSavedIdsForUser.invalidate();
      void utils.event.getUpcomingForUser.invalidate(); // Invalidate event.getUpcomingForUser
    },
  });

  const unsaveEventMutation = api.event.unfollow.useMutation({
    onMutate: async () => {
      await utils.event.getSavedIdsForUser.cancel();
      const prevData = utils.event.getSavedIdsForUser.getData();
      utils.event.getSavedIdsForUser.setData({ userName: username }, (old) =>
        old ? old.filter((event) => event.id !== eventId) : [],
      );
      return { prevData };
    },
    onError: (_, __, context) => {
      utils.event.getSavedIdsForUser.setData(
        { userName: username },
        context?.prevData,
      );
      setIsSaved(initialIsSaved);
    },
    onSettled: () => {
      void utils.event.getSavedIdsForUser.invalidate();
      void utils.event.getUpcomingForUser.invalidate(); // Invalidate event.getUpcomingForUser
    },
  });

  const handlePress = () => {
    if (!isLoaded) return; // Prevent action if Clerk is not loaded

    setIsSaved(!isSaved);
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
      disabled={!isLoaded} // Disable the button if Clerk is not loaded
      className={`flex-row items-center rounded-full p-2 ${
        isSaved ? "bg-interactive-3/90" : "bg-interactive-1/90"
      } ${!isLoaded ? "opacity-50" : ""}`} // Add opacity when disabled
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {isSaved ? (
          <Heart color="#5A32FB" size={16} strokeWidth={2} fill={"#5A32FB"} />
        ) : (
          <Heart color="white" size={16} strokeWidth={2} />
        )}
      </Animated.View>
    </Pressable>
  );
}
