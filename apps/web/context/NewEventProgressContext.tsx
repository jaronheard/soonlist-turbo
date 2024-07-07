/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

// Define the type of the context state
export enum Mode {
  Edit = "edit",
  View = "view",
}

export enum Status {
  Upload = "upload",
  Organize = "organize",
  Preview = "preview",
  Publish = "publish",
}

export enum UploadOptions {
  Image = "image",
  Text = "text",
  Link = "link",
}

export const UploadOptionsSchema = z.nativeEnum(UploadOptions);

// Create a context with empty objects and dummy functions
export const NewEventProgressContext = createContext({
  mode: Mode.View,
  inactiveMode: Mode.Edit,
  uploadOption: UploadOptions.Image,
  setUploadOption: (uploadOption: UploadOptions) =>
    console.warn("no uploadOption provider"),
  setMode: (mode: Mode) => console.warn("no mode provider"),
  status: Status.Preview,
  setStatus: (status: Status) => console.warn("no status provider"),
  goToNextStatus: () => console.warn("no status provider"),
  goToPreviousStatus: () => console.warn("no status provider"),
  goToStatus: (status: Status) => console.warn("no status provider"),
});

export const useNewEventProgressContext = () =>
  useContext(NewEventProgressContext);

// Provider component
export const NewEventProgressProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const router = useRouter();
  const [mode, setMode] = useState(Mode.View);
  const [status, setStatus] = useState(Status.Upload);
  const [uploadOption, setUploadOption] = useState(UploadOptions.Image);
  const inactiveMode = mode === Mode.Edit ? Mode.View : Mode.Edit;

  function goToNextStatus() {
    const allStatuses = Object.values(Status);
    const nextIndex = allStatuses.indexOf(status) + 1;
    if (nextIndex >= 0) {
      const previousStatus = allStatuses[nextIndex];
      previousStatus && setStatus(previousStatus);
    }
  }

  function goToPreviousStatus() {
    const allStatuses = Object.values(Status);
    const prevIndex = allStatuses.indexOf(status) - 1;
    if (prevIndex >= 0) {
      const previousStatus = allStatuses[prevIndex];
      previousStatus && setStatus(previousStatus);
    }
  }

  function goToStatus(newStatus: Status) {
    // clear query params if status is upload
    if (newStatus === Status.Upload) {
      router.push("/new");
    }
    setStatus(newStatus);
  }

  return (
    <NewEventProgressContext.Provider
      value={{
        mode,
        inactiveMode,
        setMode,
        status,
        setStatus,
        goToNextStatus,
        goToPreviousStatus,
        goToStatus,
        uploadOption,
        setUploadOption,
      }}
    >
      {children}
    </NewEventProgressContext.Provider>
  );
};
