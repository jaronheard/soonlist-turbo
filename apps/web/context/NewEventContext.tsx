"use client";

import React, {
  createContext,
  useState,
  useContext,
  type ReactNode,
} from "react";
import type * as z from "zod";
import { type organizeFormSchema } from "@/components/YourDetails";
import { type AddToCalendarCardProps } from "@/components/AddToCalendarCard";

// Define the type of the context state
interface NewEventContextState {
  organizeData: z.infer<typeof organizeFormSchema>;
  setOrganizeData: (data: z.infer<typeof organizeFormSchema>) => void;
  eventData?: AddToCalendarCardProps;
  setEventData: (data?: AddToCalendarCardProps) => void;
}

// Create a context with empty objects and dummy functions
const NewEventContext = createContext<NewEventContextState>({
  organizeData: { notes: "", visibility: "public", lists: [] } as z.infer<
    typeof organizeFormSchema
  >,
  setOrganizeData: () => null,
  eventData: undefined,
  setEventData: () => null,
});

export const useNewEventContext = () => useContext(NewEventContext);

export const NewEventProvider = ({ children }: { children: ReactNode }) => {
  const [organizeData, setOrganizeData] = useState<
    NewEventContextState["organizeData"]
  >({
    notes: "",
    visibility: "public",
    lists: [],
  });
  const [eventData, setEventData] =
    useState<NewEventContextState["eventData"]>(undefined);

  return (
    <NewEventContext.Provider
      value={{
        organizeData,
        setOrganizeData,
        eventData,
        setEventData,
      }}
    >
      {children}
    </NewEventContext.Provider>
  );
};
