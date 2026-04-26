import * as ImageManipulator from "expo-image-manipulator";

// Type for static image resources in React Native
type ImageRequireSource = number;

// Type for remote image source
interface RemoteImageSource {
  uri: string;
}

// Type for image source that can be either a remote URL or local require
export type ImageSource = ImageRequireSource | RemoteImageSource;

// Maps an EXIF Orientation tag (1-8) to the manipulation actions needed to
// produce an upright image with the orientation baked into the pixels.
// See: http://sylvana.net/jpegcrop/exif_orientation.html
//
// Chain these into the same `manipulateAsync` call as your resize/encode so
// the rotation is applied during the same pass — WEBP/JPEG output drops the
// EXIF tag without honoring it, so an un-rotated re-encode would leave the
// image visually sideways.
export function getOrientationActions(
  orientation: number | undefined,
): ImageManipulator.Action[] {
  switch (orientation) {
    case 2:
      return [{ flip: ImageManipulator.FlipType.Horizontal }];
    case 3:
      return [{ rotate: 180 }];
    case 4:
      return [{ flip: ImageManipulator.FlipType.Vertical }];
    case 5:
      return [{ rotate: 90 }, { flip: ImageManipulator.FlipType.Horizontal }];
    case 6:
      return [{ rotate: 90 }];
    case 7:
      return [{ rotate: -90 }, { flip: ImageManipulator.FlipType.Horizontal }];
    case 8:
      return [{ rotate: -90 }];
    default:
      return [];
  }
}

// Reads the EXIF Orientation value from an `expo-image-picker` asset's exif
// payload. Returns undefined if the asset wasn't fetched with `exif: true` or
// the field is missing.
export function getExifOrientation(
  exif: Record<string, unknown> | null | undefined,
): number | undefined {
  const value = exif?.Orientation;
  return typeof value === "number" ? value : undefined;
}
