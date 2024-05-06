import type { ShareIntentFile } from "expo-share-intent";
import { Platform } from "react-native";
import MLKit from "react-native-mlkit-ocr";
import * as Bytescale from "@bytescale/sdk";

const uploadManager = new Bytescale.UploadManager({
  apiKey: "public_12a1yekATNiLj4VVnREZ8c7LM8V8",
});

export const _uploadImage = async (
  localFile: string, // path to the file
  path: { folderPath?: string; fileName: string },
  mimeTypeExtension: string,
) => {
  try {
    let fileData: Blob;

    if (Platform.OS === "android") {
      // Read the file data using FileReader on Android
      fileData = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          const blob = new Blob([xhr.response], {
            type: `image/${mimeTypeExtension}`,
            lastModified: Date.now(),
          });
          resolve(blob);
        };
        xhr.onerror = function () {
          reject(new Error("Failed to read the file."));
        };
        xhr.responseType = "blob";
        xhr.open("GET", localFile, true);
        xhr.send(null);
      });
    } else {
      // Use fetch on iOS
      const imageData = await fetch(localFile);
      fileData = await imageData.blob();
    }

    const results = await uploadManager.upload({
      data: fileData,
      path: {
        folderPath: path.folderPath,
        fileName: `${path.fileName}.${mimeTypeExtension}`,
      },
    });
    console.log("File uploaded successfully!", results);
    return { success: true };
  } catch (e: unknown) {
    console.error("Failed to upload the file:", e);
    return { error: e };
  }
};

export const _getTextFromImage = async (file: ShareIntentFile) => {
  try {
    const resultFromFile = await MLKit.detectFromUri(file.path);
    const textFromFile = resultFromFile.map((block) => block.text).join("");
    return textFromFile;
  } catch (e: unknown) {
    console.error("Failed to get text from image:", e);
    return { error: e };
  }
};
