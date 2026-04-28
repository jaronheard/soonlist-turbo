import * as ImageManipulator from "expo-image-manipulator";

// Type for static image resources in React Native
type ImageRequireSource = number;

// Type for remote image source
interface RemoteImageSource {
  uri: string;
}

// Type for image source that can be either a remote URL or local require
export type ImageSource = ImageRequireSource | RemoteImageSource;

// EXIF Orientation tag values: 1=normal, 3=180°, 6=90° CW, 8=90° CCW,
// 2/4/5/7 are rare flipped variants.
// See: http://sylvana.net/jpegcrop/exif_orientation.html
export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// Maps an EXIF Orientation tag to the manipulation actions needed to produce
// an upright image with the orientation baked into the pixels.
//
// Chain these into the same `manipulateAsync` call as your resize/encode so
// the rotation is applied during the same pass — WEBP/JPEG output drops the
// EXIF tag without honoring it, so an un-rotated re-encode would leave the
// image visually sideways.
export function getOrientationActions(
  orientation: ExifOrientation | undefined,
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
): ExifOrientation | undefined {
  const value = exif?.Orientation;
  return typeof value === "number" && value >= 1 && value <= 8
    ? (value as ExifOrientation)
    : undefined;
}
