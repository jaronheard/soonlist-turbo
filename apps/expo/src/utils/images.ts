type ImageRequireSource = number;

interface RemoteImageSource {
  uri: string;
}

export type ImageSource = ImageRequireSource | RemoteImageSource;
