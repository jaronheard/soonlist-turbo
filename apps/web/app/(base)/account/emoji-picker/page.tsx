import { auth } from "@clerk/nextjs/server";

import { api } from "~/trpc/server";
import { EmojiPicker } from "./EmojiPicker";

export default async function EmojiPickerPage() {
  const { userId } = auth().protect();
  const user = await api.user.getById({ id: userId });

  return (
    <div className="flex justify-center">
      <div className="rounded-lg bg-white p-12 shadow-lg">
        {user?.emoji ? (
          <div className="mb-8 text-center">
            <h1 className="mb-6 font-heading text-5xl font-bold text-neutral-1">
              Your Emoji
            </h1>
            <p className="text-9xl">{user.emoji}</p>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <h1 className="mb-6 font-heading text-5xl font-bold text-neutral-1">
              Your Emoji
            </h1>
            <p className="animate-spin text-9xl opacity-25">🌀</p>
          </div>
        )}
        <EmojiPicker currentEmoji={user?.emoji ?? undefined} />
      </div>
    </div>
  );
}
