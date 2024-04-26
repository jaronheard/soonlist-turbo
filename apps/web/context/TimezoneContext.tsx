/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, createContext, type ReactNode } from "react";

// Create a Context for the timezone
export const TimezoneContext = createContext({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimezone: (timezone: string) => console.warn("no timezone provider"),
});

// Provider component
export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};
