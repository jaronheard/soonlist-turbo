import type { FunctionReturnType } from "convex/server";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { EventMetadataLoose } from "@soonlist/cal";

type Event = NonNullable<FunctionReturnType<typeof api.events.get>>;

interface EmojiConfig {
  emoji: string;
  bgColor: string;
}

const DEFAULT_EMOJI: EmojiConfig = {
  emoji: "📅",
  bgColor: "bg-accent-yellow",
};

const PLATFORM_EMOJI: Record<string, EmojiConfig> = {
  instagram: { emoji: "📸", bgColor: "bg-pink-100" },
  tiktok: { emoji: "🎵", bgColor: "bg-gray-100" },
  facebook: { emoji: "📘", bgColor: "bg-blue-100" },
  threads: { emoji: "🧵", bgColor: "bg-purple-100" },
  twitter: { emoji: "🐦", bgColor: "bg-sky-100" },
  x: { emoji: "🐦", bgColor: "bg-sky-100" },
};

export function getEventEmoji(event: Event): EmojiConfig {
  const eventMetadata = event.eventMetadata as EventMetadataLoose;

  if (!eventMetadata?.platform) return DEFAULT_EMOJI;

  const platformKey = eventMetadata.platform.trim().toLowerCase();

  return PLATFORM_EMOJI[platformKey] ?? DEFAULT_EMOJI;
}
