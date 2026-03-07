import type { OnboardingData } from "@soonlist/cal/dbTypes";

export type OnboardingStep =
  | "welcome"
  | "intro"
  | "goals"
  | "screenshot"
  | "discovery"
  | "age"
  | "source"
  | "readyNotifications"
  | "notifications"
  | "demo"
  | "demoIntro"
  | "screenshotDemo"
  | "addScreenshot"
  | "success"
  | "paywall";

export type { OnboardingData };
