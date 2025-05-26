// Type for static image resources in React Native
type ImageRequireSource = number;

// Type for remote image source
interface RemoteImageSource {
  uri: string;
}

// Type for image source that can be either a remote URL or local require
export type ImageSource = ImageRequireSource | RemoteImageSource;
