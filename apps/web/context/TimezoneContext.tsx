/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import type { ReactNode } from "react";
import React, { createContext, useState } from "react";

export const TimezoneContext = createContext({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimezone: (timezone: string) => console.warn("no timezone provider"),
});

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};
