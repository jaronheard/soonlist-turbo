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
  const [takenEmojis, setTakenEmojis] = useState<string[]>([]);

  const utils = api.useUtils();

  const { data: emojiStatus } = api.user.getAllTakenEmojis.useQuery();

  useEffect(() => {
    if (emojiStatus) {
      setTakenEmojis(emojiStatus.takenEmojis);
    }
  }, [emojiStatus]);

  const updateUserEmoji = api.user.updateEmoji.useMutation({
    onMutate: async (newEmoji) => {
      setIsUpdating(true);
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.user.getAllTakenEmojis.cancel();

      // Optimistically update the taken emojis
      setTakenEmojis((prev) => [
        ...prev.filter((emoji) => emoji !== currentEmoji),
        ...(newEmoji.emoji ? [newEmoji.emoji] : []),
      ]);

      setCurrentEmoji(newEmoji.emoji);
    },
    onSuccess: () => {
      toast.success("Emoji updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update emoji: ${error.message}`);
      // Revert the optimistic update
      if (emojiStatus) {
        setTakenEmojis(emojiStatus.takenEmojis);
      }
      setCurrentEmoji(initialEmoji);
    },
    onSettled: () => {
      setIsUpdating(false);
      void utils.user.getAllTakenEmojis.invalidate();
    },
  });

  const isEmojiAvailable = !takenEmojis
    .filter((emoji) => emoji !== currentEmoji)
    .includes(inputEmoji);

  const isButtonDisabled =
    isUpdating ||
    inputEmoji === "" ||
    !isEmojiAvailable ||
    inputEmoji === currentEmoji;

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!inputEmoji) return;
    updateUserEmoji.mutate({ emoji: inputEmoji });
  };

  const otherUsersEmojis = takenEmojis.filter(
    (emoji) => emoji !== currentEmoji && emoji !== inputEmoji,
  );

  const getEmojiStatus = () => {
    if (!inputEmoji) return null;
    if (emojiStatus === undefined) return "Checking availability...";
    if (inputEmoji === currentEmoji) return "Your current emoji";
    if (isUpdating) return "Updating...";
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
          disabled={isUpdating}
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
          {isUpdating
            ? "Updating..."
            : currentEmoji
              ? "Change Emoji"
              : "Choose Emoji"}
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
