import type { OnboardingData } from "@soonlist/validators";

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
