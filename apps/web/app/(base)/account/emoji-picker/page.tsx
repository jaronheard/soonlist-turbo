import { auth } from "@clerk/nextjs/server";

import { Card, CardContent, CardHeader, CardTitle } from "@soonlist/ui/card";

import { api } from "~/trpc/server";
import { EmojiPicker } from "./EmojiPicker";

export default async function EmojiPickerPage() {
  const { userId } = auth().protect();
  const user = await api.user.getById({ id: userId });

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center font-heading text-4xl font-bold text-neutral-1">
            Your Emoji
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-8">
          {user?.emoji ? (
            <p className="text-9xl">{user.emoji}</p>
          ) : (
            <p className="animate-spin text-9xl opacity-25">🌀</p>
          )}
          <EmojiPicker currentEmoji={user?.emoji ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
