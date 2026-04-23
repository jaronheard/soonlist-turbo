import type { OnboardingData } from "@soonlist/validators";

export type OnboardingStep =
  | "welcome"
  | "tryIt"
  | "yourList"
  | "notifications"
  | "paywall"
  | "signIn"
  // Legacy steps (kept for backward compatibility with existing data)
  | "intro"
  | "goals"
  | "screenshot"
  | "discovery"
  | "age"
  | "source"
  | "readyNotifications"
  | "demo"
  | "demoIntro"
  | "screenshotDemo"
  | "addScreenshot"
  | "success"
  | "shareDemoTryIt";

export type { OnboardingData };
