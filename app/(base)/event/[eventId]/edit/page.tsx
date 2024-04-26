import { comment } from "postcss";
import { UserInfo } from "@/components/UserInfo";
import { AddToCalendarCard } from "@/components/AddToCalendarCard";
import { type AddToCalendarButtonProps } from "@/types";
import { ImageUpload } from "@/components/ImageUpload";
import { YourDetails } from "@/components/YourDetails";
import { api } from "@/trpc/server";
import { type EventMetadata } from "@/lib/prompts";

export default async function Page({
  params,
}: {
  params: { eventId: string };
}) {
  const event = await api.event.get.query({ eventId: params.eventId });

  if (!event) {
    return <p className="text-lg text-gray-500">No event found.</p>;
  }

  const eventData = event.event as AddToCalendarButtonProps;
  const eventMetadata = event.eventMetadata as EventMetadata;
  const mostRecentComment = event.comments
    ?.filter((comment) => comment?.content)
    .pop()?.content;
  const eventLists = event.eventToLists?.map((eventToList) => eventToList.list);
  return (
    <div className="flex flex-col items-center">
      {event?.event ? (
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
