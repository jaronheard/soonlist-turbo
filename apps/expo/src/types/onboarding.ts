export interface OnboardingData {
  notificationsEnabled: boolean;
  ageRange: "Under 24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";
  priority: {
    text: string;
    emoji: string;
  };
  completedAt: Date;
}

export type OnboardingStep =
  | "notifications"
  | "age"
  | "source"
  | "discovery"
  | "screenshot"
  | "priorities"
  | "photos";
