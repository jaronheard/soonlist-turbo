import type { ShareIntentFile } from "expo-share-intent";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import MLKit from "react-native-mlkit-ocr";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useShareIntent } from "expo-share-intent";
import * as WebBrowser from "expo-web-browser";
import * as Bytescale from "@bytescale/sdk";
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";

import SignInWithOAuth from "./components/SignInWithOAuth";
import { useWarmUpBrowser } from "./hooks/useWarmUpBrowser";

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const SignOut = () => {
  const { isLoaded, signOut } = useAuth();
  if (!isLoaded) {
    return null;
  }
  return (
    <View>
      <Button
        title="Sign Out"
        onPress={() => {
          void signOut();
        }}
      />
    </View>
  );
};

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
  } catch (e: unknown) {
    console.error("Failed to upload the file:", e);
    return { error: e };
  }
};

const _getTextFromImage = async (file: ShareIntentFile) => {
  try {
    const resultFromFile = await MLKit.detectFromUri(file.path);
    const textFromFile = resultFromFile.map((block) => block.text).join("");
    return textFromFile;
  } catch (e: unknown) {
    console.error("Failed to get text from image:", e);
    return { error: e };
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
  const [state, setState] = useState<{
    textFromImage?: string;
    uploading: boolean;
    path: { folderPath?: string; fileName: string };
    fileExtension?: string;
    isBrowserOpening: boolean;
  }>({
    textFromImage: undefined,
    uploading: false,
    path: getRandomPath(),
    fileExtension: undefined,
    isBrowserOpening: false,
  });

  // Using ref to keep track of the latest state
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
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

  // Building folderPath outside of useEffect
  const getDatePath = () => {
    const year = new Date().getUTCFullYear();
    const month = String(new Date().getUTCMonth() + 1).padStart(2, "0");
    const day = String(new Date().getUTCDate()).padStart(2, "0");
    return `/uploads/${year}/${month}/${day}`;
  };
  const folderPath = getDatePath();
  const filePathParam = state.path.fileName
    ? `filePath=${encodeURIComponent(
        `${folderPath}/${state.path.fileName}${state.fileExtension}`,
      )}`
    : "";

  useWarmUpBrowser();

  const file = shareIntent.files?.[0];

  useEffect(() => {
    if (!file?.mimeType.startsWith("image/") || stateRef.current.uploading)
      return;

    const mimeTypeExtension = file.mimeType.split("/")[1];
    const newPathState = {
      ...stateRef.current,
      fileExtension: `.${mimeTypeExtension}`,
      uploading: true,
    };
    setState(newPathState);

    void (async () => {
      try {
        const text = await _getTextFromImage(file);
        if (typeof text === "string") {
          console.log("Text from image:", text);
        }
        if (!(typeof text === "string")) {
          console.error("Failed to get text from image:", text);
          setState((prev) => ({ ...prev, uploading: false }));
          return;
        }
        await _uploadImage(
          file.path,
          stateRef.current.path,
          mimeTypeExtension || "jpg",
        );
        console.log("Upload successful");
        setState((prev) => ({
          ...prev,
          textFromImage: text,
          uploading: false,
        }));
      } catch (e) {
        console.error("Failed to handle image:", e);
        setState((prev) => ({ ...prev, uploading: false }));
      }
    })();
  }, [file]);

  // Handle opening web browser
  const _handleOpenWithWebBrowser = async (
    rawText: string,
    filePathParam?: string,
  ) => {
    if (state.isBrowserOpening) return false;
    setState((prev) => ({ ...prev, isBrowserOpening: true }));
    try {
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
    void _handleOpenWithWebBrowser(shareIntent.text);
    return null; // Return null to prevent rendering the rest of the component
  }

  if (state.textFromImage) {
    void _handleOpenWithWebBrowser(state.textFromImage, filePathParam);
    return null; // Return null to prevent rendering the rest of the component
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const clerkPublishableKey = Constants.expoConfig?.extra
    ?.clerkPublishableKey as string | undefined;

  if (!clerkPublishableKey) {
    console.log(Constants.expoConfig);
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="mt-5 text-red-500">
          No Clerk Publishable Key found. Please check your environment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <SignedOut>
          <SignInWithOAuth />
        </SignedOut>
        <SignedIn>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            source={require("../assets/icon.png")}
            className="w-18 h-18 contain mb-5 rounded-md"
          />
          <Text className="mb-5 text-lg">
            Share a screenshot or image to Soonlist...
          </Text>
          <Text
            className="mb-5 text-xl font-bold text-interactive-1"
            onPress={() => Linking.openURL("https://www.soonlist.com")}
          >
            View events
          </Text>
          <SignOut />
        </SignedIn>
      </SafeAreaView>
    </ClerkProvider>
  );
}
