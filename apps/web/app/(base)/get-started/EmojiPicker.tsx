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
      await utils.user.getAllTakenEmojis.cancel();
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
      if (emojiStatus) {
        setTakenEmojis(emojiStatus.takenEmojis);
      }
      setCurrentEmoji(initialEmoji);
    },
    onSettled: () => {
      setIsUpdating(false);
      void utils.user.getAllTakenEmojis.invalidate();
      void utils.user.getByUsername.invalidate();
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
    if (!inputEmoji) return "Enter an emoji";
    if (emojiStatus === undefined) return "Checking availability...";
    if (inputEmoji === currentEmoji) return "Your current emoji";
    if (isUpdating) return "Updating...";
    if (isEmojiAvailable) return "Available";
    return "Already taken";
  };

  const hasClaimedEmoji = !!currentEmoji;

  return (
    <div className="rounded-xl p-6">
      <h2 className="mb-4 text-center font-heading text-2xl font-bold text-interactive-1">
        Choose Your Signature Emoji
      </h2>
      <div className="flex flex-col space-y-4">
        <div className="flex items-start justify-center space-x-4">
          <Input
            type="text"
            value={inputEmoji}
            onChange={(e) => setInputEmoji(e.target.value)}
            className="h-16 w-16 bg-white text-center text-3xl"
            maxLength={2}
            disabled={isUpdating}
          />
          <div className="flex flex-col items-center">
            <Button
              onClick={handleSubmit}
              disabled={isButtonDisabled}
              className="w-36"
              size="sm"
              variant={hasClaimedEmoji ? "outline" : "default"}
            >
              {isUpdating
                ? "Updating..."
                : currentEmoji
                  ? "Change Emoji"
                  : "Choose Emoji"}
            </Button>
            <div className="mt-2 h-5 text-center text-sm font-medium">
              <p
                className={
                  getEmojiStatus() === "Already taken"
                    ? "text-destructive"
                    : getEmojiStatus() === "Available"
                      ? "text-success"
                      : "text-neutral-2"
                }
              >
                {getEmojiStatus()}
              </p>
            </div>
          </div>
        </div>
        {otherUsersEmojis.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-center text-lg font-semibold text-neutral-1">
              Claimed by other Founding Members:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {otherUsersEmojis.map((emoji, index) => (
                <span key={index} className="text-3xl" title="Founding Member">
                  {emoji}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
