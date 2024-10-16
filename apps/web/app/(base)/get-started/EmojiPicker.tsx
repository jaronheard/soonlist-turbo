"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@soonlist/ui";
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

  const getButtonText = () => {
    if (isUpdating) return "Updating...";
    if (!inputEmoji) return "Enter an emoji";
    if (emojiStatus === undefined) return "Checking...";
    if (inputEmoji === currentEmoji) return "Current emoji";
    if (!isEmojiAvailable) return "Already taken";
    return currentEmoji ? "Change Emoji" : "Choose Emoji";
  };

  const hasClaimedEmoji = !!currentEmoji;

  return (
    <div className="flex flex-col items-center space-y-4 rounded-xl p-6">
      <h2 className="font-heading text-2xl font-bold text-interactive-1">
        Choose Your Signature Emoji
      </h2>
      <div className="flex items-center space-x-4">
        <Input
          type="text"
          value={inputEmoji}
          onChange={(e) => setInputEmoji(e.target.value)}
          className={cn({
            "h-16 w-16 bg-white text-center text-3xl": true,
            "ring-2 ring-interactive-1": inputEmoji === "",
          })}
          maxLength={2}
          disabled={isUpdating}
        />
        <Button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className="w-36"
          size="sm"
          variant={hasClaimedEmoji ? "outline" : "default"}
        >
          {getButtonText()}
        </Button>
      </div>
      {otherUsersEmojis.length > 0 && (
        <div className="text-center">
          <p className="mb-2 text-sm font-semibold text-neutral-2">
            Claimed by other Founding Members:
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {otherUsersEmojis.map((emoji, index) => (
              <span key={index} className="text-base" title="Founding Member">
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
