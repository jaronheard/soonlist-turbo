export interface Comment {
  id: number;
  content: string;
  eventId: string;
  userId: string;
  createdAt?: Date | string;
  created_at?: string;
  updatedAt?: Date | string | null;
  oldId?: string | null;
}

export interface Event {
  id: string;
  userId: string;
  userName: string;
  createdAt: Date | string;
  created_at?: string;
  updatedAt?: Date | string | null;
  event: unknown;
  eventMetadata?: unknown;
  endDateTime: Date | string;
  startDateTime: Date | string;
  visibility: "public" | "private";
}

export interface EventFollow {
  userId: string;
  eventId: string;
}

export interface ListFollow {
  userId: string;
  listId: string;
}

export interface UserFollow {
  followerId: string;
  followingId: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt?: Date | string;
  created_at?: string;
  updatedAt?: Date | string | null;
  visibility: "public" | "private" | "unlisted";
  contribution?: "open" | "restricted" | "owner";
}

export interface UserPublicMetadata {
  stripe?: {
    customerId?: string;
  };
  plan?: {
    name?: string;
    productId?: string;
    status?: string;
    id?: string;
    trialStartDate?: string;
  };
}

export interface OnboardingData {
  notificationsEnabled?: boolean;
  ageRange?: "Under 24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";
  source?: string;
  discoveryMethod?: string;
  screenshotEvents?: string;
  goals?: string[];
  priority?: {
    text: string;
    emoji: string;
  };
  completedAt?: string;
  watchedDemo?: boolean;
  subscribed?: boolean;
  subscribedAt?: string;
  subscriptionPlan?: string;
  trialMode?: boolean;
  trialStartedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  userImage: string;
  bio: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  publicInsta: string | null;
  publicWebsite: string | null;
  createdAt?: Date | string;
  created_at?: string;
  updatedAt?: Date | string | null;
  publicMetadata: UserPublicMetadata | Record<string, unknown> | null;
  emoji: string | null;
  onboardingData: OnboardingData | null;
  onboardingCompletedAt: Date | string | null;
  publicListEnabled?: boolean;
  publicListName?: string;
}

export interface EventToLists {
  eventId: string;
  listId: string;
}
