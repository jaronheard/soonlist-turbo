// Shared minimal interfaces for display-only components
// These interfaces contain only the essential properties needed for UI rendering
// without depending on full database schemas

export interface MinimalUserInfo {
  id: string;
  username: string;
  displayName?: string;
  userImage: string;
  emoji?: string | null;
}

export interface MinimalEventFollow {
  userId: string;
}

export interface MinimalComment {
  id: string | number;
}

export interface MinimalList {
  id: string;
  name: string;
}

export interface MinimalEventToLists {
  eventId: string;
  listId: string;
  list: MinimalList;
}

// Plan-related minimal interfaces
export interface MinimalPlanInfo {
  name?: string;
  status?: string;
}

export interface MinimalUserPublicMetadata {
  plan?: MinimalPlanInfo;
  showDiscover?: boolean;
}

export interface MinimalUserForPlan {
  publicMetadata: MinimalUserPublicMetadata | null;
}

// Minimal types that match the actual Convex database structure
export interface MinimalEvent {
  id: string;
  created_at: string; // ISO string from database
  visibility: "public" | "private";
  event: Record<string, unknown>; // The event data object
  userId: string;
  userName: string;
  startDateTime: string;
  endDateTime: string;
}

export interface MinimalUser {
  id: string;
  username: string;
  displayName: string;
  userImage: string;
  emoji?: string;
}

export interface MinimalEventFollow {
  id: string;
  userId: string;
  eventId: string;
}

export interface MinimalComment {
  id: string;
  content: string;
  userId: string;
  eventId: string;
}

export interface MinimalList {
  id: string;
  name: string;
  description: string;
  userId: string;
  visibility: "public" | "private";
}
