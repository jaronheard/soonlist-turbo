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

const TYPE_EMOJI: Record<string, EmojiConfig> = {
  concert: { emoji: "🎵", bgColor: "bg-blue-100" },
  party: { emoji: "🎉", bgColor: "bg-pink-100" },
  festival: { emoji: "🎪", bgColor: "bg-purple-100" },
  exhibition: { emoji: "🖼️", bgColor: "bg-indigo-100" },
  performance: { emoji: "🎭", bgColor: "bg-red-100" },
  conference: { emoji: "💼", bgColor: "bg-gray-100" },
  workshop: { emoji: "🔧", bgColor: "bg-orange-100" },
  seminar: { emoji: "📚", bgColor: "bg-green-100" },
  meeting: { emoji: "👥", bgColor: "bg-teal-100" },
  game: { emoji: "🎮", bgColor: "bg-yellow-100" },
  movie: { emoji: "🎬", bgColor: "bg-red-100" },
  show: { emoji: "🎪", bgColor: "bg-purple-100" },
  competition: { emoji: "🏆", bgColor: "bg-yellow-100" },
  webinar: { emoji: "💻", bgColor: "bg-blue-100" },
  opening: { emoji: "🎉", bgColor: "bg-pink-100" },
};

const CATEGORY_EMOJI: Record<string, EmojiConfig> = {
  music: { emoji: "🎵", bgColor: "bg-blue-100" },
  arts: { emoji: "🎨", bgColor: "bg-indigo-100" },
  sports: { emoji: "⚽", bgColor: "bg-green-100" },
  food: { emoji: "🍽️", bgColor: "bg-orange-100" },
  tech: { emoji: "💻", bgColor: "bg-blue-100" },
  education: { emoji: "📚", bgColor: "bg-green-100" },
  community: { emoji: "👥", bgColor: "bg-teal-100" },
  entertainment: { emoji: "🎭", bgColor: "bg-red-100" },
  business: { emoji: "💼", bgColor: "bg-gray-100" },
  health: { emoji: "🏥", bgColor: "bg-red-100" },
  literature: { emoji: "📖", bgColor: "bg-amber-100" },
  science: { emoji: "🔬", bgColor: "bg-blue-100" },
  religion: { emoji: "⛪", bgColor: "bg-purple-100" },
  lifestyle: { emoji: "🌟", bgColor: "bg-pink-100" },
  culture: { emoji: "🏛️", bgColor: "bg-amber-100" },
};

export function getEventEmoji(event: Event): EmojiConfig {
  // Note: eventMetadata no longer contains type/category information
  // Always return default emoji for now
  return DEFAULT_EMOJI;
}
