"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";
import { Input } from "@soonlist/ui/input";

import { api } from "~/trpc/react";

interface EmojiStatus {
  isAvailable: boolean;
  usedByUsername?: string;
}

export function EmojiPicker() {
  const router = useRouter();
  const [inputEmoji, setInputEmoji] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: emojiStatus, refetch: refetchEmojiStatus } =
    api.user.getEmojiStatus.useQuery<EmojiStatus>(
      { emoji: inputEmoji },
      { enabled: inputEmoji.length > 0 },
    );

  const updateUserEmoji = api.user.updateEmoji.useMutation({
    onSuccess: () => {
      toast.success("Emoji set successfully!");
      router.refresh();
    },
    onError: (error) => toast.error(`Failed to set emoji: ${error.message}`),
  });

  const isButtonDisabled =
    isUpdating ||
    inputEmoji === "" ||
    (emojiStatus !== undefined && !emojiStatus.isAvailable);

  const handleEmojiSubmit = async () => {
    if (emojiStatus && !emojiStatus.isAvailable) {
      toast.error("This emoji is not available");
      return;
    }
    setIsUpdating(true);
    await updateUserEmoji.mutateAsync({ emoji: inputEmoji });
    setIsUpdating(false);
    setInputEmoji("");
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          type="text"
          value={inputEmoji}
          onChange={(e) => {
            setInputEmoji(e.target.value);
            void refetchEmojiStatus();
          }}
          placeholder="Enter an emoji"
          className="w-24"
        />
        <Button onClick={handleEmojiSubmit} disabled={isButtonDisabled}>
          Set Emoji
        </Button>
      </div>
      {inputEmoji && emojiStatus && (
        <div>
          {emojiStatus.isAvailable ? (
            <p className="text-green-600">This emoji is available!</p>
          ) : (
            <p className="text-red-600">
              This emoji is used by: {emojiStatus.usedByUsername}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
