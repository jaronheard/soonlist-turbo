/**
 * Generates a Google Calendar URL for adding an event.
 * This provides a fallback for adding to calendar when the full
 * add-to-calendar-button library isn't available.
 *
 * @param params - Event parameters
 * @returns A Google Calendar URL
 */
export interface CalendarEventParams {
  name: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endDate?: string; // YYYY-MM-DD
  endTime?: string; // HH:MM
  timeZone?: string;
}

export function getGoogleCalendarUrl(params: CalendarEventParams): string {
  const {
    name,
    description,
    location,
    startDate,
    startTime,
    endDate,
    endTime,
  } = params;

  // Format dates for Google Calendar (YYYYMMDDTHHmmss)
  const formatDateTime = (date: string, time?: string): string => {
    const dateStr = date.replace(/-/g, "");
    const timeStr = time ? time.replace(/:/g, "") + "00" : "000000";
    return `${dateStr}T${timeStr}`;
  };

  const start = formatDateTime(startDate, startTime);
  const end = endDate
    ? formatDateTime(endDate, endTime)
    : formatDateTime(startDate, endTime || startTime);

  const baseUrl = "https://calendar.google.com/calendar/render";
  const searchParams = new URLSearchParams({
    action: "TEMPLATE",
    text: name,
    dates: `${start}/${end}`,
  });

  if (location) {
    searchParams.append("location", location);
  }

  if (description) {
    searchParams.append("details", description);
  }

  return `${baseUrl}?${searchParams.toString()}`;
}
