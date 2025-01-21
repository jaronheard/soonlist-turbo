export interface DemoEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  startTime?: string;
  timeZone?: string;
  imageUri?: string;
  description?: string;
}

// Events the user can choose to "capture" in demo-capture
export const DEMO_CAPTURE_EVENTS: DemoEvent[] = [
  {
    id: "concert",
    name: "Outdoor Concert",
    location: "Civic Park",
    startDate: "2025-05-04",
    startTime: "18:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/400/300", // Placeholder image, replace as needed
    description:
      "Local bands perform live in an outdoor setting. Food trucks on-site. Bring a blanket!",
  },
  {
    id: "artShow",
    name: "Local Art Showcase",
    location: "Gallery Row",
    startDate: "2025-05-07",
    startTime: "14:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/450/300",
    description:
      "Come see the latest creations from local painters, sculptors, and artisans.",
  },
  {
    id: "foodFest",
    name: "Food Festival",
    location: "Central Plaza",
    startDate: "2025-05-10",
    startTime: "11:30",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/420/320",
    description:
      "Sample cuisines from around the world. Live music, cooking demos, and more.",
  },
  {
    id: "techMeet",
    name: "Tech Meetup",
    location: "Innovation Hub",
    startDate: "2025-05-15",
    startTime: "17:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/400/400",
    description:
      "Monthly meetup for local developers. Talks on React Native, AI, and more.",
  },
];

// Base feed events that appear before user captures a new event
export const DEMO_FEED_BASE: DemoEvent[] = [
  {
    id: "market",
    name: "Farmers Market",
    location: "Evergreen Lot",
    startDate: "2025-05-02",
    startTime: "09:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/401/301",
    description:
      "Weekly farmers market featuring fresh produce, artisan goods, and community workshops.",
  },
  {
    id: "yoga",
    name: "Yoga in the Park",
    location: "Riverside Park",
    startDate: "2025-05-05",
    startTime: "07:30",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/402/301",
    description:
      "Early morning yoga session along the river. Bring your own mat. Beginners welcome!",
  },
  {
    id: "coffee",
    name: "Coffee Meetup",
    location: "Brew & Beans",
    startDate: "2025-05-16",
    startTime: "10:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://placekitten.com/403/301",
    description:
      "Casual meetup to chat about local events, community building, and new tech. Free pastries!",
  },
];
