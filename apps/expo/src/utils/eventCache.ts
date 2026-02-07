import type { FunctionReturnType } from "convex/server";

import type { api } from "@soonlist/backend/convex/_generated/api";

type Event = NonNullable<FunctionReturnType<typeof api.events.get>>;

const cache = new Map<string, Event>();

export function setEventCache(id: string, event: Event) {
  cache.set(id, event);
}

export function getEventCache(id: string): Event | undefined {
  return cache.get(id);
}
