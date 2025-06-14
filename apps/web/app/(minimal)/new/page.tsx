import { auth } from "@clerk/nextjs/server";

import { getDefaultLists } from "~/lib/convex-lists";
import { EventsFromImage } from "./EventsFromImage";
import { EventsFromRawText } from "./EventsFromRawText";
import { EventsFromUrl } from "./EventsFromUrl";
import { ProgressStages } from "./newEventProgressStages";

export const maxDuration = 60;

interface Props {
  searchParams: Promise<{
    rawText?: string;
    url?: string;
    saveIntent?: boolean;
    filePath?: string;
    timezone?: string;
    edit?: boolean;
    autoProcess?: string;
  }>;
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const { userId } = await auth.protect({
    unauthenticatedUrl: "/sign-in",
    unauthorizedUrl: "/",
  });

  // TODO: Implement list queries in Convex backend
  // For now, using empty array until lists module is migrated
  const lists = getDefaultLists(userId);
  const timezone = searchParams.timezone || "America/Los_Angeles";
  const autoProcess = searchParams.autoProcess === "true";

  // image only
  if (searchParams.filePath && !searchParams.rawText) {
    // If autoProcess is true, render EventsFromImage directly without ProgressStages wrapper
    if (autoProcess) {
      return (
        <EventsFromImage timezone={timezone} filePath={searchParams.filePath} />
      );
    }
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
    // If autoProcess is true, render EventsFromRawText directly without ProgressStages wrapper
    if (autoProcess) {
      return (
        <EventsFromRawText timezone={timezone} rawText={searchParams.rawText} />
      );
    }
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
    // If autoProcess is true, render EventsFromUrl directly without ProgressStages wrapper
    if (autoProcess) {
      return <EventsFromUrl timezone={timezone} url={searchParams.url} />;
    }
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
