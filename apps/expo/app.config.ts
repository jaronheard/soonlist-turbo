import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Soonlist",
  slug: "timetimecc",
  scheme: "soonlist",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  updates: {
    url: "https://u.expo.dev/7a5b9f0b-c450-4c48-9e89-be9b6d6a2e98",
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "soonlist.soonlist",
    buildNumber: "2",
  },
  android: {
    package: "soonlist.soonlist",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  extra: {
    eas: {
      projectId: "a8acc202-ed8c-48ed-9e5a-2570f510fe8a",
    },
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  owner: "soonlist",
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
  },
  plugins: [
    [
      "expo-share-intent",
      {
        iosActivationRules: {
          NSExtensionActivationSupportsText: true,
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsImageWithMaxCount: 2,
          NSExtensionActivationSupportsMovieWithMaxCount: 1,
          NSExtensionActivationSupportsFileWithMaxCount: 1,
        },
        androidIntentFilters: ["text/*", "image/*"],
        androidMultiIntentFilters: ["image/*"],
      },
    ],
    "expo-updates",
    "expo-router",
  ],
});
