"use client";

import { Button } from "@soonlist/ui/button";

import { UploadImageForProcessingButton } from "~/app/(base)/UploadImageForProcessingButton";
import { SaveButton } from "~/components/SaveButton";
import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Mode,
  Status,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";

export function NewEventFooterButtons({
  onClickNextOrganize,
}: {
  onClickNextOrganize?: () => void;
  onClickNextPublish?: () => void;
}) {
  const { mode, setMode, status, goToNextStatus } =
    useNewEventProgressContext();
  const { organizeData, eventData } = useNewEventContext();
  const { croppedImagesUrls } = useCroppedImageContext();
  const otherMode = mode === Mode.Edit ? Mode.View : Mode.Edit;

  const hasFilePath = croppedImagesUrls.filePath;
  const hasAllAspectRatios =
    croppedImagesUrls.cropped &&
    croppedImagesUrls.square &&
    croppedImagesUrls.fourThree &&
    croppedImagesUrls.sixteenNine;
  const validImagesFromContext = hasFilePath && hasAllAspectRatios;

  const imagesFromContext = validImagesFromContext
    ? [
        croppedImagesUrls.square!,
        croppedImagesUrls.fourThree!,
        croppedImagesUrls.sixteenNine!,
        croppedImagesUrls.cropped!,
      ]
    : undefined;

  const removeImage = croppedImagesUrls.deleted;
  // use images from context or initial props
  const images = removeImage
    ? []
    : imagesFromContext || eventData?.images || [];

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-4 border-t border-neutral-3 bg-white p-5">
      {status === Status.Upload && <UploadImageForProcessingButton />}
      {status === Status.Preview && (
        <>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setMode(otherMode)}
            className="capitalize"
          >
            {otherMode}
          </Button>
          {eventData && (
            <SaveButton
              event={{ ...eventData, images }}
              eventMetadata={eventData.eventMetadata}
              notes={organizeData.notes}
              visibility={organizeData.visibility}
              lists={organizeData.lists}
              onClick={goToNextStatus}
            />
          )}
        </>
      )}
      {status === Status.Organize && (
        <Button size="lg" onClick={onClickNextOrganize}>
          Next
        </Button>
      )}
    </footer>
  );
}
