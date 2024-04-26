"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCroppedImageContext } from "@/context/CroppedImageContext";
import {
  Mode,
  Status,
  useNewEventProgressContext,
} from "@/context/NewEventProgressContext";
import { useNewEventContext } from "@/context/NewEventContext";

export function ResetNewEventContext() {
  const pathName = usePathname();
  const { setCroppedImagesUrls } = useCroppedImageContext();
  const { setOrganizeData, setEventData } = useNewEventContext();
  const { setStatus, setMode } = useNewEventProgressContext();

  useEffect(() => {
    setCroppedImagesUrls({});
    setOrganizeData({
      notes: "",
      visibility: "public",
      lists: [],
    });
    setEventData(undefined);
    setMode(Mode.View);
    setStatus(Status.Organize);
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
