"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useCroppedImageContext } from "~/context/CroppedImageContext";
import { useNewEventContext } from "~/context/NewEventContext";
import {
  Mode,
  Status,
  useNewEventProgressContext,
} from "~/context/NewEventProgressContext";
import { DEFAULT_VISIBILITY } from "~/lib/constants";

export function ResetNewEventContext() {
  const pathName = usePathname();
  const { setCroppedImagesUrls } = useCroppedImageContext();
  const { setOrganizeData, setEventData } = useNewEventContext();
  const { setStatus, setMode } = useNewEventProgressContext();
  const { setIsShortcut } = useNewEventProgressContext();

  useEffect(() => {
    setCroppedImagesUrls({});
    setOrganizeData({
      notes: "",
      visibility: DEFAULT_VISIBILITY,
      lists: [],
    });
    setEventData(undefined);
    setMode(Mode.View);
    setStatus(Status.Upload);
    setIsShortcut(false);
  }, [
    pathName,
    setCroppedImagesUrls,
    setOrganizeData,
    setEventData,
    setMode,
    setStatus,
  ]);

  return null;
}
