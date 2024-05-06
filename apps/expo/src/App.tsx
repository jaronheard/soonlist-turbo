import type { ShareIntent, ShareIntentFile } from "expo-share-intent";
import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState({
    textExtracted: false,
    text: "",
    uploading: false,
    uploadComplete: false,
    browserOpened: false,
    taskCompleted: false,
  });

  useEffect(() => {
    if (!shareIntent.files) return;

    const { type, files, text /* webUrl, meta, */ } = shareIntent;

    // only use first file
    if (!files[0]) return;
    const file = files[0];

    async function handleShare() {
      if (file.mimeType.startsWith("image/")) {
        const text = await _getTextFromImage(file);
        setStatus((prev) => ({ ...prev, textExtracted: true, text }));
        const fileName = guidGenerator(); // Generate a unique filename for each image
        const fileExtension = file.mimeType.split("/")[1] || "jpg";
        const currentDate = new Date();
        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getUTCDate()).padStart(2, "0");
        const folderPath = `/uploads/${year}/${month}/${day}`;
        const filePathParam = `filePath=${encodeURIComponent(
          `${folderPath}/${fileName}.${fileExtension}`,
        )}`;
        const browserUrl = `https://www.soonlist.com/new?rawText=${encodeURIComponent(
          text,
        )}&${filePathParam}`;

        // Open the browser with the extracted text
        void WebBrowser.openBrowserAsync(browserUrl, browserSettings).then(
          (result) => {
            setStatus((prev) => ({ ...prev, browserOpened: true }));
            if (result.type === WebBrowser.WebBrowserResultType.DISMISS) {
              setStatus((prev) => ({ ...prev, taskCompleted: true }));
            }
          },
        );

        // Start the upload in parallel
        setStatus((prev) => ({ ...prev, uploading: true }));
        void _uploadImage(
          file.path,
          { fileName, folderPath },
          fileExtension,
        ).then(() => {
          setStatus((prev) => ({
            ...prev,
            uploading: false,
            uploadComplete: true,
          }));
        });
      } else if (type === "text" && text) {
        setStatus((prev) => ({ ...prev, textExtracted: true, text: text }));
        const browserUrl = `https://www.soonlist.com/new?rawText=${encodeURIComponent(
          text,
        )}`;

        // Open the browser with the extracted text
        void WebBrowser.openBrowserAsync(browserUrl, browserSettings).then(
          (result) => {
            setStatus((prev) => ({ ...prev, browserOpened: true }));
            if (result.type === WebBrowser.WebBrowserResultType.DISMISS) {
              setStatus((prev) => ({ ...prev, taskCompleted: true }));
            }
          },
        );
      }
    }

    void handleShare();

    return () => {
      // Cleanup potential pending operations if a new share intent is received
      WebBrowser.dismissBrowser();
    };
  }, [shareIntent]);

  return { status };
};

export default function App() {
  // This hook manages incoming share intents
  const { shareIntent, resetShareIntent } = useShareIntent({
    // debug: true,
    resetOnBackground: true,
  });

  // Our custom hook that handles the logic based on the type of the share intent
  const { status } = useHandleShareIntent(shareIntent);

  // Warm up the android browser to improve UX
  // https://docs.expo.dev/guides/authentication/#improving-user-experience
  useWarmUpBrowser();

  // Effect to reset the share intent when task is completed
  useEffect(() => {
    if (status.taskCompleted) {
      resetShareIntent(); // Reset the share intent after the task is completed
    }
  }, [status.taskCompleted, resetShareIntent]);

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
          {status.uploading && (
            <Text className="mb-5 text-lg">Uploading...</Text>
          )}
          {!status.uploading && (
            <>
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
            </>
          )}
          <SignOut />
        </SignedIn>
      </SafeAreaView>
    </ClerkProvider>
  );
}
