/**
 * Generates a Google Maps URL for a given location.
 * The URL will open in the native maps app on mobile devices
 * (Google Maps on Android, user's choice on iOS).
 *
 * @param location - The location string (address, place name, or coordinates)
 * @returns A Google Maps search URL
 */
export function getGoogleMapsUrl(location: string): string {
  if (!location || location.trim() === "") {
    return "";
  }

  const encodedLocation = encodeURIComponent(location.trim());
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}
