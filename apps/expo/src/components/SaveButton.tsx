import React from "react";
import { Pressable } from "react-native";
import { Heart } from "lucide-react-native";

import { api } from "~/utils/api";

interface SaveButtonProps {
  eventId: string;
  isSaved: boolean;
}

export default function SaveButton({ eventId, isSaved }: SaveButtonProps) {
  const utils = api.useUtils();
  const saveEventMutation = api.event.follow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });
  const unsaveEventMutation = api.event.unfollow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const handlePress = () => {
    if (isSaved) {
      unsaveEventMutation.mutate({ id: eventId });
    } else {
      saveEventMutation.mutate({ id: eventId });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row items-center rounded-full p-2 ${
        isSaved ? "bg-interactive-3/90" : "bg-interactive-1/90"
      }`}
    >
      {isSaved ? (
        <Heart color="#5A32FB" size={16} strokeWidth={2} fill={"#5A32FB"} />
      ) : (
        <Heart color="white" size={16} strokeWidth={2} />
      )}
    </Pressable>
  );
}