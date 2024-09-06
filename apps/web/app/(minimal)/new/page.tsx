import { auth } from "@clerk/nextjs/server";

import { api } from "~/trpc/server";
import { EventsFromImage } from "./EventsFromImage";
import { EventsFromRawText } from "./EventsFromRawText";
import { EventsFromUrl } from "./EventsFromUrl";
import { ProgressStages } from "./newEventProgressStages";

export const maxDuration = 60;

interface Props {
  searchParams: {
    rawText?: string;
    url?: string;
    saveIntent?: boolean;
    filePath?: string;
    timezone?: string;
    edit?: boolean;
  };
}

export default async function Page({ searchParams }: Props) {
  const { userId } = auth().protect({
    unauthenticatedUrl: "/sign-up",
    unauthorizedUrl: "/",
  });

  const lists = await api.list.getAllForUserId({
    userId: userId,
  });
  const timezone = searchParams.timezone || "America/Los_Angeles";
  // image only
  if (searchParams.filePath && !searchParams.rawText) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists}
        Preview={
          <EventsFromImage
            timezone={timezone}
            filePath={searchParams.filePath}
          />
        }
      ></ProgressStages>
    );
  }

  // text (with or without image)
  if (searchParams.rawText) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists}
        Preview={
          <EventsFromRawText
            timezone={timezone}
            rawText={searchParams.rawText}
          />
        }
      ></ProgressStages>
    );
  }
  // url
  if (searchParams.url) {
    return (
      <ProgressStages
        filePath={searchParams.filePath}
        lists={lists}
        Preview={<EventsFromUrl timezone={timezone} url={searchParams.url} />}
      ></ProgressStages>
    );
  }

  return <ProgressStages showUpload={true} />;
}
