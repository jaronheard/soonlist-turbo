/* eslint-disable @typescript-eslint/no-require-imports */
// Type for static image resources in React Native
type ImageRequireSource = number;

// Type for remote image source
interface RemoteImageSource {
  uri: string;
}

// Type for image source that can be either a remote URL or local require
export type ImageSource = ImageRequireSource | RemoteImageSource;

export interface DemoEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  imageUri?: ImageSource;
  images?: ImageSource[];
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imageUri: require("../assets/music.png"),
    images: [
      require("../assets/music.png"),
      require("../assets/music.png"),
      require("../assets/music.png"),
      require("../assets/music.png"),
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imageUri: require("../assets/art.png"),
    images: [
      require("../assets/art.png"),
      require("../assets/art.png"),
      require("../assets/art.png"),
      require("../assets/art.png"),
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imageUri: require("../assets/food.png"),
    images: [
      require("../assets/food.png"),
      require("../assets/food.png"),
      require("../assets/food.png"),
      require("../assets/food.png"),
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    imageUri: require("../assets/design.png"),
    images: [
      require("../assets/design.png"),
      require("../assets/design.png"),
      require("../assets/design.png"),
      require("../assets/design.png"),
    ],
    description:
      "Monthly meetup for local developers. Talks on React Native, AI, and more.",
  },
];
