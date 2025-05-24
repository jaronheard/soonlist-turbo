import { auth } from "@clerk/nextjs/server";

import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonProps } from "@soonlist/cal/types";

import { AddToCalendarCard } from "~/components/AddToCalendarCard";
import { ImageUpload } from "~/components/ImageUpload";
import { UserInfo } from "~/components/UserInfo";
import { YourDetails } from "~/components/YourDetails";
import { api } from "~/trpc/server";

export default async function Page(
  props: {
    params: Promise<{ eventId: string }>;
  }
) {
  const params = await props.params;
  const { userId } = auth().protect();
  const event = await api.event.get({ eventId: params.eventId });

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
  const eventLists = event.eventToLists.map((eventToList) => eventToList.list);
  return (
    <div className="flex flex-col items-center">
      {event.event ? (
        <>
          <YourDetails
            lists={event.user.lists || undefined}
            eventLists={eventLists}
            comment={mostRecentComment}
            visibility={event.visibility}
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
          />
        </>
      ) : (
        <p className="text-lg text-gray-500">No event found.</p>
      )}
      <div className="p-4"></div>
      <div className="flex place-items-center gap-2">
        <div className="font-medium">Collected by</div>
        <UserInfo userId={event.userId} />
      </div>
    </div>
  );
}
