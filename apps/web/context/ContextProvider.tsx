import { CroppedImageProvider } from "./CroppedImageContext";
import { NewEventProvider } from "./NewEventContext";
import { NewEventProgressProvider } from "./NewEventProgressContext";
import { TimezoneProvider } from "./TimezoneContext";

export default function ContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimezoneProvider>
      <NewEventProgressProvider>
        <NewEventProvider>
          <CroppedImageProvider>{children} </CroppedImageProvider>
        </NewEventProvider>
      </NewEventProgressProvider>
    </TimezoneProvider>
  );
}
