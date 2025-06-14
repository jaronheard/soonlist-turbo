import { preloadQuery } from "convex/nextjs";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ExploreClient } from "./ExploreClient";

export default async function Page() {
  const preloadedEvents = await preloadQuery(api.events.getNext, { limit: 50 });

  return <ExploreClient preloadedEvents={preloadedEvents} />;
}
