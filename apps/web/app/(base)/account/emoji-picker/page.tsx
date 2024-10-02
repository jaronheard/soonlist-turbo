import { auth } from "@clerk/nextjs/server";

import { api } from "~/trpc/server";
import { EmojiPicker } from "./EmojiPicker";

export default async function EmojiPickerPage() {
  const { userId } = auth().protect();
  const user = await api.user.getById({ id: userId });

  if (user?.emoji) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Your Emoji: {user.emoji}</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Choose Your Unique Emoji</h1>
      <EmojiPicker />
    </div>
  );
}
