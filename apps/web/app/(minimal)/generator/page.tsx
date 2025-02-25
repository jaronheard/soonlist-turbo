import { EventsFromImage } from "../new/EventsFromImage";
import { GeneratorProgressStages } from "./GeneratorProgressStages";

export const maxDuration = 60;

interface Props {
  searchParams: {
    filePath?: string;
    timezone?: string;
  };
}

export default async function Page({ searchParams }: Props) {
  const timezone = searchParams.timezone || "America/Los_Angeles";

  // image only
  if (searchParams.filePath) {
    return (
      <GeneratorProgressStages
        filePath={searchParams.filePath}
        Preview={
          <EventsFromImage
            timezone={timezone}
            filePath={searchParams.filePath}
          />
        }
      />
    );
  }

  return <GeneratorProgressStages showUpload={true} />;
}
