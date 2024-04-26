"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useUser } from "@clerk/nextjs";
import {
  boot as bootIntercom,
  load as loadIntercom,
  update as updateIntercom,
} from "./intercom";

export interface IntercomProviderProps {
  children: ReactNode;
}

export const IntercomProvider = ({ children }: IntercomProviderProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  if (typeof window !== "undefined" && isLoaded && user) {
    loadIntercom();

    const intercomOptions = user
      ? {
          user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.firstName || user.lastName || "",
        }
      : {};

    bootIntercom(intercomOptions);
  }

  const handleRouteChange = () => {
    if (typeof window !== "undefined") {
      updateIntercom();
    }
  };

  useEffect(() => {
    handleRouteChange();
  }, [pathname, searchParams]);

  return children;
};
