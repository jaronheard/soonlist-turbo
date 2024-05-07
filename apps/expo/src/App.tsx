import type { ShareIntent, ShareIntentFile } from "expo-share-intent";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Image,
  Linking,
  LogBox,
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

import "./styles.css";

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
    return "";
  }
};

const browserSettings = {
  presentationStyle:
    WebBrowser.WebBrowserPresentationStyle.OVER_CURRENT_CONTEXT,
  showInRecents: true,
  controlsColor: "#5A32FB",
  toolbarColor: "#F7F7F7",
  enableDefaultShareMenuItem: true,
};

const useHandleShareIntent = (shareIntent: ShareIntent) => {
  const statusRef = useRef({
    textExtracted: false,
    text: "",
    uploading: false,
    uploadComplete: false,
    openBrowserAsyncInProgress: false,
    browserOpened: false,
    lastBrowserStatus: undefined as WebBrowser.WebBrowserResultType | undefined,
  });

  useEffect(() => {
    console.log("useHandleShareIntent effect triggered");
    const abortController = new AbortController();
    if (!shareIntent.files && !shareIntent.text) return;

    const { type, files, text /* webUrl, meta, */ } = shareIntent;

    const file = files?.[0];

    async function handleShare() {
      console.log("handleShare started");
      try {
        if (file?.mimeType.startsWith("image/")) {
          console.log("handleShare image started");
          // Logic for handling image sharing
          const text = await _getTextFromImage(file);
          if (text !== statusRef.current.text) {
            console.log("DIFFERENCE IN TEXT, DISMISSING BROWSER");
            WebBrowser.dismissBrowser();
            console.log("STATUS:", statusRef.current);
            if (
              statusRef.current.lastBrowserStatus ===
              WebBrowser.WebBrowserResultType.LOCKED
            ) {
              console.log("BROWSER LOCKED, WAITING FOR 1 SECOND");
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            console.log("BROWSER SHOULD BE DISMISSED NOW");
          }
          statusRef.current.text = text;
          statusRef.current.textExtracted = true;
          const fileName = guidGenerator();
          const fileExtension = file.mimeType.split("/")[1] || "jpg";
          const currentDate = new Date();
          const year = currentDate.getUTCFullYear();
          const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
          const day = String(currentDate.getUTCDate()).padStart(2, "0");
          const folderPath = `/uploads/${year}/${month}/${day}`;
          const filePathParam = `filePath=${encodeURIComponent(`${folderPath}/${fileName}.${fileExtension}`)}`;
          const browserUrl = `https://www.soonlist.com/new?rawText=${encodeURIComponent(text)}&${filePathParam}`;

          statusRef.current.uploading = true;
          void _uploadImage(
            file.path,
            { fileName, folderPath },
            fileExtension,
          ).then(() => {
            statusRef.current.uploading = false;
            statusRef.current.uploadComplete = true;
          });

          console.log("image > openBrowserAsync started");
          console.log(
            "lastBrowserStatus:",
            statusRef.current.lastBrowserStatus,
            "openBrowserAsyncInProgress:",
            statusRef.current.openBrowserAsyncInProgress,
            "browserOpened:",
            statusRef.current.browserOpened,
          );

          // if (
          //   statusRef.current.lastBrowserStatus !==
          //     WebBrowser.WebBrowserResultType.LOCKED &&
          //   statusRef.current.lastBrowserStatus !==
          //     WebBrowser.WebBrowserResultType.OPENED &&
          //   statusRef.current.lastBrowserStatus !==
          //     WebBrowser.WebBrowserResultType.CANCEL &&
          //   statusRef.current.lastBrowserStatus !==
          //     WebBrowser.WebBrowserResultType.DISMISS
          // ) {
          //   console.log(
          //     "🧹 dismissing browser since lastBrowserStatus: ",
          //     statusRef.current.lastBrowserStatus,
          //   );
          //   WebBrowser.dismissBrowser();
          // }
          // if (statusRef.current.openBrowserAsyncInProgress) {
          //   console.log(
          //     "🧹 dismissing browser because op: ",
          //     statusRef.current.lastBrowserStatus,
          //   );
          //   WebBrowser.dismissBrowser();
          // }
          statusRef.current.openBrowserAsyncInProgress = true;
          try {
            const result = await WebBrowser.openBrowserAsync(
              browserUrl,
              browserSettings,
            );
            console.log("image > openBrowserAsync finished", result.type);
            if (result.type === WebBrowser.WebBrowserResultType.DISMISS) {
              console.log("Browser dismissed");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.CANCEL) {
              console.log("Browser cancelled");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.OPENED) {
              console.log("Browser opened");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.LOCKED) {
              console.log("Browser locked");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            console.log("image > openBrowserAsync finished");
          } catch (error) {
            console.error("Error in image > openBrowserAsync:", error);
            statusRef.current.openBrowserAsyncInProgress = false;
          }
        } else if (type === "text" && text) {
          console.log("handleShare text started");
          if (text !== statusRef.current.text) {
            console.log("DIFFERENCE IN TEXT, DISMISSING BROWSER");
            WebBrowser.dismissBrowser();
            console.log("STATUS:", statusRef.current);
            if (
              statusRef.current.lastBrowserStatus ===
              WebBrowser.WebBrowserResultType.LOCKED
            ) {
              console.log("BROWSER LOCKED, WAITING FOR 1 SECOND");
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            console.log("BROWSER SHOULD BE DISMISSED NOW");
          }
          // Logic for handling text sharing
          statusRef.current.text = text;
          statusRef.current.textExtracted = true;
          const browserUrl = `https://www.soonlist.com/new?rawText=${encodeURIComponent(text)}`;

          console.log("text > openBrowserAsync started");
          // if (!statusRef.current.openBrowserAsyncInProgress) {
          //   console.log("text > openBrowserAsync started > dismissBrowser");
          //   WebBrowser.dismissBrowser();
          // }
          statusRef.current.openBrowserAsyncInProgress = true;
          try {
            const result = await WebBrowser.openBrowserAsync(
              browserUrl,
              browserSettings,
            );
            console.log("text > openBrowserAsync finished", result.type);
            if (result.type === WebBrowser.WebBrowserResultType.DISMISS) {
              console.log("Browser dismissed");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.CANCEL) {
              console.log("Browser cancelled");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.OPENED) {
              console.log("Browser opened");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            if (result.type === WebBrowser.WebBrowserResultType.LOCKED) {
              console.log("Browser locked");
              statusRef.current.lastBrowserStatus = result.type;
              statusRef.current.openBrowserAsyncInProgress = false;
            }
            console.log("image > openBrowserAsync finished");
          } catch (error) {
            console.error("Error in text > openBrowserAsync:", error);
            statusRef.current.openBrowserAsyncInProgress = false;
          }
        }
      } catch (error) {
        console.error("Error in handleShare:", error);
      }
    }

    void handleShare();
    return () => {
      console.log(" 🧼 useHandleShareIntent cleanup");
    };
  }, [shareIntent]);
};

export default function App() {
  LogBox.ignoreLogs([
    "Attempted to call WebBrowser.openBrowserAsync multiple times while already active. Only one WebBrowser controller can be active at any given time.",
  ]);
  // This hook manages incoming share intents
  const { shareIntent } = useShareIntent({
    // debug: true,
    resetOnBackground: false,
  });

  // Our custom hook that handles the logic based on the type of the share intent
  useHandleShareIntent(shareIntent);

  // Warm up the android browser to improve UX
  // https://docs.expo.dev/guides/authentication/#improving-user-experience
  useWarmUpBrowser();

  // // Effect to reset the share intent when task is completed
  // useEffect(() => {
  //   if (statusRef.current.taskCompleted) {
  //     resetShareIntent(); // Reset the share intent after the task is completed
  //   }
  // }, [statusRef.current.taskCompleted, resetShareIntent]);

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
      <SafeAreaView className="flex flex-1 items-center justify-center bg-white">
        <SignedOut>
          <SignInWithOAuth />
        </SignedOut>
        <SignedIn>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            source={require("../assets/icon.png")}
            className="mb-5 h-16 w-16 rounded-xl"
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
