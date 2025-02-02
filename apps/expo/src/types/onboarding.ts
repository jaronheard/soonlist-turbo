import type { OnboardingData } from "@soonlist/db/types";

export type OnboardingStep =
  | "notifications"
  | "age"
  | "source"
  | "discovery"
  | "screenshot"
  | "priorities"
  | "photos";

export type { OnboardingData };
