/**
 * Default values used throughout the mobile application
 */

// Default timezone for events
export const DEFAULT_TIMEZONE = "America/Los_Angeles";

// Default visibility setting for new events
export const DEFAULT_VISIBILITY = "public" as const;

export type EventVisibility = "public" | "private";

// Storage keys
export const DISCOVER_CODE_KEY = "soonlist_discover_code";
