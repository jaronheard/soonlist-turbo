import Image from "next/image";
import { ArrowBigRight } from "lucide-react";
import { api } from "@/trpc/server";
import { type AddToCalendarButtonProps } from "@/types";

export async function SampleListPhotos({ listId }: { listId: string }) {
  const list = await api.list.get.query({ listId });

  if (!list) {
    return <> </>;
  }

  // limit to 3 events from the end of the array
  const events = list.eventToLists
    .map((item) => item.event)
    // filter out null events
    .filter((event) => event?.startDateTime)
    // sort by startDateTime
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    )
    // limit to 3 events
    .slice(-3)
    // get event as AddToCalendarButtonProps
    .map((item) => {
      return item.event as AddToCalendarButtonProps;
    });

  const [firstImage, secondImage, thirdImage] = [
    events[0]?.images?.[3],
    events[1]?.images?.[3],
    events[2]?.images?.[3],
  ];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="flex shrink-0 flex-row items-start gap-4 sm:flex-col">
        {firstImage && (
          <Image
            className="size-24 rounded-lg sm:size-40"
            alt="Sample image"
            src={firstImage}
            height={160}
            width={160}
          />
        )}
        {secondImage && (
          <Image
            className="size-24 rounded-lg sm:size-40"
            alt="Sample image"
            src={secondImage}
            height={160}
            width={160}
          />
        )}
        {thirdImage && (
          <Image
            className="size-24 rounded-lg sm:size-40"
            alt="Sample image"
            src={thirdImage}
            height={160}
            width={160}
          />
        )}
      </div>
      <div className="flex flex-row items-start gap-12 sm:flex-col sm:gap-32">
        {firstImage && (
          <ArrowBigRight className="size-16 rotate-90 sm:rotate-0" />
        )}
        {secondImage && (
          <ArrowBigRight className="size-16 rotate-90 sm:rotate-0" />
        )}
        {thirdImage && (
          <ArrowBigRight className="size-16 rotate-90 sm:rotate-0" />
        )}
      </div>
    </div>
  );
}
