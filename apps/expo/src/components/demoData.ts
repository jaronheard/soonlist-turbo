export interface DemoEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  startTime?: string;
  timeZone?: string;
  imageUri?: string;
  images?: string[];
  description?: string;
}

// Events the user can choose to "capture" in demo-capture
export const DEMO_CAPTURE_EVENTS: DemoEvent[] = [
  {
    id: "demo-music",
    name: "Electronic Music Night",
    location: "Downtown Music Hall",
    startDate: "2025-07-15",
    startTime: "20:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://upcdn.io/12a1yek/raw/uploads/Soonlist/music.png",
    images: [
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/music.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/music.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/music.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/music.png",
    ],
    description:
      "Local bands perform live in an outdoor setting. Food trucks on-site. Bring a blanket!",
  },
  {
    id: "demo-art",
    name: "Future Visions",
    location: "Modern Art Gallery",
    startDate: "2025-10-13",
    startTime: "19:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://upcdn.io/12a1yek/raw/uploads/Soonlist/art.png",
    images: [
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/art.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/art.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/art.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/art.png",
    ],
    description:
      "Come see the latest creations from local painters, sculptors, and artisans.",
  },
  {
    id: "demo-food",
    name: "Street Food Festival",
    location: "Riverside Park",
    startDate: "2025-09-09",
    startTime: "11:00",
    timeZone: "America/Los_Angeles",
    imageUri: "https://upcdn.io/12a1yek/raw/uploads/Soonlist/food.png",
    images: [
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/food.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/food.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/food.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/food.png",
    ],
    description:
      "Sample cuisines from around the world. Live music, cooking demos, and more.",
  },
  {
    id: "demo-design",
    name: "Design Thinking Workshop",
    location: "Innovation Hub",
    startDate: "2025-08-08",
    startTime: "18:30",
    timeZone: "America/Los_Angeles",
    imageUri: "https://upcdn.io/12a1yek/raw/uploads/Soonlist/design.png",
    images: [
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/design.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/design.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/design.png",
      "https://upcdn.io/12a1yek/raw/uploads/Soonlist/design.png",
    ],
    description:
      "Monthly meetup for local developers. Talks on React Native, AI, and more.",
  },
];
