/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, {
  useState,
  createContext,
  type ReactNode,
  useContext,
} from "react";

// Define the type of the context state
export enum Mode {
  Edit = "edit",
  View = "view",
}

export enum Status {
  Organize = "organize",
  Preview = "preview",
  Publish = "publish",
}

// Create a context with empty objects and dummy functions
export const NewEventProgressContext = createContext({
  mode: Mode.View,
  setMode: (mode: Mode) => console.warn("no mode provider"),
  status: Status.Preview,
  setStatus: (status: Status) => console.warn("no status provider"),
  goToNextStatus: () => console.warn("no status provider"),
  goToPreviousStatus: () => console.warn("no status provider"),
});

export const useNewEventProgressContext = () =>
  useContext(NewEventProgressContext);

// Provider component
export const NewEventProgressProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [mode, setMode] = useState(Mode.View);
  const [status, setStatus] = useState(Status.Organize);

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

  return (
    <NewEventProgressContext.Provider
      value={{
        mode,
        setMode,
        status,
        setStatus,
        goToNextStatus,
        goToPreviousStatus,
      }}
    >
      {children}
    </NewEventProgressContext.Provider>
  );
};
