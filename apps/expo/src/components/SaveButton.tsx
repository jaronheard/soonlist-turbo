import React from "react";
import { Pressable } from "react-native";
import { Check, Plus } from "lucide-react-native";

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
      className={`h-10 w-10 items-center justify-center rounded-2xl bg-interactive-1 px-3 py-2 ${
        isSaved ? "bg-interactive-2" : "bg-interactive-1"
      }`}
    >
      {isSaved ? (
        <Check color="white" size={16} />
      ) : (
        <Plus color="white" size={16} />
      )}
    </Pressable>
  );
}
