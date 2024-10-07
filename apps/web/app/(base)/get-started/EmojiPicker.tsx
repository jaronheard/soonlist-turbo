"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import { Input } from "@soonlist/ui/input";

import { api } from "~/trpc/react";

interface EmojiPickerProps {
  currentEmoji?: string | null;
}

export function EmojiPicker({ currentEmoji: initialEmoji }: EmojiPickerProps) {
  const [inputEmoji, setInputEmoji] = useState(initialEmoji ?? "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState<string | null | undefined>(
    initialEmoji,
  );

  const { data: emojiStatus, refetch: refetchEmojiStatus } =
    api.user.getAllTakenEmojis.useQuery();

  const utils = api.useUtils();

  const updateUserEmoji = api.user.updateEmoji.useMutation({
    onSuccess: () => {
      toast.success("Emoji updated successfully!");
      setCurrentEmoji(inputEmoji);
      void utils.user.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update emoji: ${error.message}`);
      void refetchEmojiStatus();
    },
  });

  useEffect(() => {
    if (updateUserEmoji.isSuccess) {
      setCurrentEmoji(inputEmoji);
    }
  }, [updateUserEmoji.isSuccess, inputEmoji]);

  const isEmojiAvailable =
    emojiStatus && !emojiStatus.takenEmojis.includes(inputEmoji);
  const isButtonDisabled =
    isUpdating ||
    inputEmoji === "" ||
    !isEmojiAvailable ||
    inputEmoji === currentEmoji;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!inputEmoji) {
      return;
    }
    setIsUpdating(true);
    updateUserEmoji.mutate(
      { emoji: inputEmoji },
      {
        onSettled: () => setIsUpdating(false),
      },
    );
  };

  const otherUsersEmojis =
    emojiStatus?.takenEmojis.filter((emoji) => emoji !== currentEmoji) ?? [];

  const getEmojiStatus = () => {
    if (!inputEmoji) return null;
    if (emojiStatus === undefined) return "Checking availability...";
    if (inputEmoji === currentEmoji) return "Your emoji";
    if (isEmojiAvailable) return "Available";
    return "Already taken";
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="flex flex-col items-center space-y-4">
        <Input
          type="text"
          value={inputEmoji}
          onChange={(e) => setInputEmoji(e.target.value)}
          placeholder=""
          className="h-24 w-24 text-center text-5xl"
          maxLength={2}
        />
        <div className="text-sm font-medium">
          {getEmojiStatus() && (
            <p
              className={
                getEmojiStatus() === "Already taken"
                  ? "text-destructive"
                  : getEmojiStatus() === "Available"
                    ? "text-success"
                    : "text-muted-foreground"
              }
            >
              {getEmojiStatus()}
            </p>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className="px-8 py-4 text-xl"
        >
          {currentEmoji ? "Change Emoji" : "Choose Emoji"}
        </Button>
      </div>
      {otherUsersEmojis.length > 0 && (
        <div className="mt-4 text-center">
          <h3 className="mb-2 text-lg font-medium text-neutral-2">
            Claimed by others:
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {otherUsersEmojis.map((emoji, index) => (
              <span key={index} className="text-2xl">
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
