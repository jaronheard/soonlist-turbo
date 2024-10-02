"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import { Input } from "@soonlist/ui/input";

import { api } from "~/trpc/react";

interface EmojiPickerProps {
  currentEmoji?: string | null;
}

export function EmojiPicker({ currentEmoji }: EmojiPickerProps) {
  const router = useRouter();
  const [inputEmoji, setInputEmoji] = useState(currentEmoji || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: emojiStatus, refetch: refetchEmojiStatus } =
    api.user.getAllTakenEmojis.useQuery();

  const utils = api.useUtils();

  const updateUserEmoji = api.user.updateEmoji.useMutation({
    onSuccess: () => {
      toast.success("Emoji updated successfully!");
      void utils.user.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(`Failed to update emoji: ${error.message}`);
      void refetchEmojiStatus();
    },
  });

  const isEmojiAvailable =
    emojiStatus && !emojiStatus.takenEmojis.includes(inputEmoji);
  const isButtonDisabled = isUpdating || inputEmoji === "" || !isEmojiAvailable;

  const handleEmojiSubmit = async () => {
    if (!isEmojiAvailable) {
      toast.error("This emoji is not available");
      return;
    }
    setIsUpdating(true);
    await updateUserEmoji.mutateAsync({ emoji: inputEmoji });
    setIsUpdating(false);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-800">
          {currentEmoji ? "Change Your Emoji" : "Choose Your Emoji"}
        </h2>
        <p className="text-lg text-gray-600">
          This emoji will represent you across Soonlist
        </p>
      </div>
      <div className="flex flex-col items-center space-y-4">
        <Input
          type="text"
          value={inputEmoji}
          onChange={(e) => setInputEmoji(e.target.value)}
          placeholder="Enter an emoji"
          className="h-24 w-24 text-center text-5xl"
        />
        <Button
          onClick={handleEmojiSubmit}
          disabled={isButtonDisabled}
          className="px-8 py-4 text-xl"
        >
          {currentEmoji ? "Update Emoji" : "Set Emoji"}
        </Button>
      </div>
      {inputEmoji && (
        <div className="text-center text-xl">
          {emojiStatus === undefined ? (
            <p className="text-blue-600">Loading emoji status...</p>
          ) : isEmojiAvailable ? (
            <p className="text-green-600">This emoji is available!</p>
          ) : (
            <p className="text-red-600">This emoji is already taken</p>
          )}
        </div>
      )}
      {emojiStatus && emojiStatus.takenEmojis.length > 0 && (
        <div className="mt-4 text-center">
          <h3 className="mb-2 text-lg font-semibold">Taken Emojis:</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {emojiStatus.takenEmojis.map((emoji, index) => (
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
