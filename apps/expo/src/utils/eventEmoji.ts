import type { FunctionReturnType } from "convex/server";

import type { api } from "@soonlist/backend/convex/_generated/api";

type Event = NonNullable<FunctionReturnType<typeof api.events.get>>;

interface EmojiConfig {
  emoji: string;
  bgColor: string;
}

const DEFAULT_EMOJI: EmojiConfig = {
  emoji: "📅",
  bgColor: "bg-accent-yellow",
};

export function getEventEmoji(_event: Event): EmojiConfig {
  // Note: eventMetadata no longer contains type/category information
  // Always return default emoji for now
  return DEFAULT_EMOJI;
}
