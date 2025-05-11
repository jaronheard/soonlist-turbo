import * as ImagePicker from "expo-image-picker";

export function useImagePicker() {
  const pickImage = async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0 &&
        result.assets[0]
      ) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error("Error picking image:", error);
      return null;
    }
  };

  const takePhoto = async (): Promise<string | null> => {
    try {
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (cameraPermission.status !== ImagePicker.PermissionStatus.GRANTED) {
        console.log("Camera permission denied");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0 &&
        result.assets[0]
      ) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error("Error taking photo:", error);
      return null;
    }
  };

  return { pickImage, takePhoto };
}
