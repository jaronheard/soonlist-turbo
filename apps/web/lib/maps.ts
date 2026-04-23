export function getGoogleMapsUrl(location: string): string {
  if (!location || location.trim() === "") {
    return "";
  }

  const encodedLocation = encodeURIComponent(location.trim());
  return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}
