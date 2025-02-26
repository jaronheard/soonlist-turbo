import { EventsFromImage } from "../new/EventsFromImage";
import { GeneratorLoadingSpinner } from "./GeneratorLoadingSpinner";
import { DirectGeneratorPage } from "./DirectGeneratorPage";

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
      <DirectGeneratorPage
        filePath={searchParams.filePath}
        Preview={
          <EventsFromImage
            timezone={timezone}
            filePath={searchParams.filePath}
            LoadingComponent={GeneratorLoadingSpinner}
          />
        }
      />
    );
  }

  return <DirectGeneratorPage showUpload={true} />;
}

