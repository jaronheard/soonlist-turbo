import { auth } from "@clerk/nextjs/server";

import { api } from "~/trpc/server";
import { EmojiPicker } from "./EmojiPicker";

export default async function EmojiPickerPage() {
  const { userId } = auth().protect();
  const user = await api.user.getById({ id: userId });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-purple-100 to-pink-100">
      <div className="rounded-lg bg-white p-12 shadow-lg">
        {user?.emoji ? (
          <div className="mb-8 text-center">
            <h1 className="mb-6 text-5xl font-bold text-gray-800">
              Your Current Emoji
            </h1>
            <p className="text-9xl">{user.emoji}</p>
          </div>
        ) : (
          <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
            Choose Your Unique Emoji
          </h1>
        )}
        <EmojiPicker currentEmoji={user?.emoji ?? undefined} />
      </div>
    </div>
  );
}
