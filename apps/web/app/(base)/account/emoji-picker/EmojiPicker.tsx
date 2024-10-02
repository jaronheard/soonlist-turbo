"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
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
      setInputEmoji(""); // Clear the input after successful update
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputEmoji) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateUserEmoji.mutateAsync({ emoji: inputEmoji });
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
        toast.error(error.message);
      } else {
        toast.error("Failed to update emoji. Please try again.");
      }
    } finally {
      setIsUpdating(false);
    }
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
        <Button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className="px-8 py-4 text-xl"
        >
          {currentEmoji ? "Update Emoji" : "Choose Emoji"}
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
