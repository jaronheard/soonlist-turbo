import { useEffect, useState } from "react";
import { Image, Linking, Platform, StyleSheet, Text, View } from "react-native";
import MLKit from "react-native-mlkit-ocr";
import { ShareIntentFile, useShareIntent } from "expo-share-intent";
import * as WebBrowser from "expo-web-browser";
import * as Bytescale from "@bytescale/sdk";

import { useWarmUpBrowser } from "./hooks/useWarmUpBrowser";

function guidGenerator() {
  const S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return (
    S4() +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  );
}

const uploadManager = new Bytescale.UploadManager({
  apiKey: "public_12a1yekATNiLj4VVnREZ8c7LM8V8",
});

const _uploadImage = async (
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
        folderPath: path?.folderPath,
        fileName: `${path.fileName}.${mimeTypeExtension}`,
      },
    });
    console.log("File uploaded successfully!", results);
  } catch (e: any) {
    console.log(`Error:\n${e.message}`);
  }
};

const _getTextFromImage = async (file: ShareIntentFile) => {
  try {
    const resultFromFile = await MLKit.detectFromUri(file.path);
    const textFromFile = resultFromFile.map((block) => block.text).join("");
    return textFromFile;
  } catch (e: any) {
    alert(`Error:\n${e.message}`);
  }
};

const getRandomPath = () => {
  return {
    fileName: guidGenerator(),
  };
};

export default function App() {
  const { shareIntent, resetShareIntent } = useShareIntent({
    debug: true,
    resetOnBackground: true,
  });
  const [state, setState] = useState({
    textFromImage: undefined as string | undefined,
    uploading: false,
    path: getRandomPath(),
    fileExtension: "",
    isBrowserOpening: false,
  });

  const reset = () => {
    setState({
      textFromImage: undefined,
      uploading: false,
      path: getRandomPath(),
      fileExtension: "",
      isBrowserOpening: false,
    });
    resetShareIntent();
  };

  // format is /uploads/YYYY/MM/DD/fileName.extension with leading 0s
  const year = new Date().getUTCFullYear();
  const month = String(new Date().getUTCMonth() + 1).padStart(2, "0");
  const day = String(new Date().getUTCDate()).padStart(2, "0");
  const folderPath = `/uploads/${year}/${month}/${day}`;

  const filePathParam = state.path.fileName
    ? `filePath=${folderPath}/${state.path.fileName}${state.fileExtension}`
    : "";

  useWarmUpBrowser();

  const file = shareIntent?.files?.[0];

  useEffect(() => {
    if (file?.mimeType.startsWith("image/") && !state.uploading) {
      const mimeTypeExtension = file.mimeType.split("/")[1];
      setState((prev) => ({ ...prev, fileExtension: `.${mimeTypeExtension}` }));
      _getTextFromImage(file).then((text) =>
        setState((prev) => ({ ...prev, textFromImage: text })),
      );
      setState((prev) => ({ ...prev, uploading: true }));
      _uploadImage(file.path, state.path, mimeTypeExtension).then(() =>
        setState((prev) => ({ ...prev, uploading: false })),
      );
    }
  }, [file]);

  const _handleOpenWithWebBrowser = async (
    rawText: string,
    filePathParam?: string,
  ) => {
    try {
      if (state.isBrowserOpening) {
        return false;
      }
      setState((prev) => ({ ...prev, isBrowserOpening: true }));
      const result = await WebBrowser.openBrowserAsync(
        `https://www.soonlist.com/new?rawText=${encodeURIComponent(rawText)}&${filePathParam}`,
        {
          presentationStyle:
            WebBrowser.WebBrowserPresentationStyle.OVER_CURRENT_CONTEXT,
          showInRecents: true,
          controlsColor: "#5A32FB",
          toolbarColor: "#F7F7F7",
          enableDefaultShareMenuItem: true,
        },
      );
      console.log(result);
      reset();
      return true;
    } catch (error) {
      console.error("Failed to open browser:", error);
      return false;
    }
  };

  if (shareIntent.text) {
    _handleOpenWithWebBrowser(shareIntent.text);
    return null; // Return null to prevent rendering the rest of the component
  }

  if (state.textFromImage) {
    _handleOpenWithWebBrowser(state.textFromImage, filePathParam);
    return null; // Return null to prevent rendering the rest of the component
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/icon.png")}
        style={[styles.logo, styles.gap]}
      />
      <Text style={[styles.gap, styles.large]}>
        Share a screenshot or image to Soonlist...
      </Text>
      <Text
        style={[styles.gap, styles.bold, styles.interactive]}
        onPress={() => Linking.openURL("https://www.soonlist.com")}
      >
        View events
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 75,
    height: 75,
    resizeMode: "contain",
    borderRadius: 10,
  },
  image: {
    width: 300,
    height: 200,
    resizeMode: "contain",
    // backgroundColor: "lightgray",
  },
  gap: {
    marginBottom: 20,
  },
  large: {
    fontSize: 16,
  },
  bold: {
    fontWeight: "bold",
    fontSize: 20,
  },
  meta: {
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: "red",
    marginTop: 20,
  },
  interactive: {
    color: "#5A32FB",
  },
});
