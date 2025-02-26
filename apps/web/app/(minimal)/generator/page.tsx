import { EventsFromImage } from "../new/EventsFromImage";
import { GeneratorLoadingSpinner } from "./GeneratorLoadingSpinner";
import { DirectGeneratorPage } from "./DirectGeneratorPage";
import { NewEventProvider } from "~/context/NewEventContext";

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
      <NewEventProvider>
        <DirectGeneratorPage
          filePath={searchParams.filePath}
          LoadingComponent={GeneratorLoadingSpinner}
        />
        <div className="hidden">
          <EventsFromImage
            timezone={timezone}
            filePath={searchParams.filePath}
            processOnly={true}
          />
        </div>
      </NewEventProvider>
    );
  }

  return <NewEventProvider><DirectGeneratorPage showUpload={true} /></NewEventProvider>;
}
