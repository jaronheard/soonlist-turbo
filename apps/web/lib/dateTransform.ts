// Utility to transform created_at string from database to Date for web components
export function transformCreatedAt(created_at: string): Date {
  return new Date(created_at);
}

// Transform single event data from Convex format to web component format
export function transformEventForWeb(event: {
  id: string;
  created_at: string;
  visibility: "public" | "private";
  [key: string]: unknown;
}) {
  return {
    ...event,
    createdAt: transformCreatedAt(event.created_at),
  };
}

// Transform events array from Convex format to web component format
export function transformEventsForWeb<T extends { created_at: string }>(
  events: T[],
) {
  return events.map((event) => ({
    ...event,
    createdAt: transformCreatedAt(event.created_at),
  }));
}
