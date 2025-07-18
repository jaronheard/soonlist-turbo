import { auth } from "@clerk/nextjs/server";

import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonProps } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { ImageUpload } from "~/components/ImageUpload";
import { UserInfo } from "~/components/UserInfo";
import { YourDetails } from "~/components/YourDetails";
import { getAuthenticatedConvex } from "~/lib/convex-server";

export default async function Page(props: {
  params: Promise<{ eventId: string }>;
}) {
  const params = await props.params;
  const { userId } = await auth.protect();
  const convex = await getAuthenticatedConvex();
  const event = await convex.query(api.events.get, { eventId: params.eventId });

  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }

  if (event.userId !== userId) {
    return <p className="text-lg text-gray-500">You do not have access.</p>;
  }

  const eventData = event.event as AddToCalendarButtonProps;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const mostRecentComment = event.comments
    .filter((comment) => comment.content)
    .pop()?.content;
  // TODO: Implement event lists when list functionality is added to Convex
  // const eventLists = [];
  return (
    <div className="flex flex-col items-center">
      {event.event ? (
        <>
          <YourDetails
            lists={[]}
            eventLists={[]}
            comment={mostRecentComment}
            visibility={event.visibility}
            hideNotes
          />
          <div className="p-4"></div>
          <ImageUpload images={eventData.images as string[]} />
          <div className="p-4"></div>
          <AddToCalendarCard
            {...eventData}
            eventMetadata={eventMetadata}
            key={event.id}
            update
            updateId={params.eventId}
            hideEventMetadata
            hideSourceLink
          />
        </>
      ) : (
        <p className="text-lg text-gray-500">No event found.</p>
      )}
      <div className="p-4"></div>
      <div className="flex place-items-center gap-2">
        <div className="font-medium">Captured by</div>
        <UserInfo userId={event.userId} />
      </div>
    </div>
  );
}
