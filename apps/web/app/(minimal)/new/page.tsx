import { auth } from "@clerk/nextjs/server";

import { DEFAULT_TIMEZONE } from "~/lib/constants";
import { getDefaultLists } from "~/lib/convex-lists";
import { EventsFromImage } from "./EventsFromImage";
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

  const lists = getDefaultLists(userId);
  const timezone = searchParams.timezone || DEFAULT_TIMEZONE;
  const autoProcess = searchParams.autoProcess === "true";

  if (searchParams.filePath && !searchParams.rawText) {
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


  return <ProgressStages showUpload={true} />;
}
