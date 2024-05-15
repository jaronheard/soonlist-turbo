import type { ConfigContext, ExpoConfig } from "expo/config";

const clerkPublishableKey =
  "pk_test_dGlnaHQtbW9uZ3JlbC01LmNsZXJrLmFjY291bnRzLmRldiQ";

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
  assetBundlePatterns: ["**/*"],
  plugins: [
    [
      "expo-share-intent",
      {
        iosActivationRules: {
          NSExtensionActivationSupportsText: true,
          // TODO: SUPPORT TEXT
          // NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          // NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsImageWithMaxCount: 1,
          // NSExtensionActivationSupportsMovieWithMaxCount: 1,
          // NSExtensionActivationSupportsFileWithMaxCount: 1,
        },
        androidIntentFilters: ["image/*"],
        // TODO: SUPPORT TEXT
        // androidIntentFilters: ["text/*", "image/*"],
        androidMultiIntentFilters: ["image/*"],
      },
    ],
    "expo-updates",
    [
      "@sentry/react-native/expo",
      {
        organization: "soonlist",
        project: "soonlist",
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "soonlist.soonlist",
  },
  android: {
    package: "soonlist.soonlist",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  updates: {
    url: "https://u.expo.dev/a8acc202-ed8c-48ed-9e5a-2570f510fe8a",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  experiments: {
    tsconfigPaths: true,
    // typedRoutes: true,
  },
  // plugins: ["expo-router"],
  extra: {
    eas: {
      projectId: "a8acc202-ed8c-48ed-9e5a-2570f510fe8a",
    },
    clerkPublishableKey: clerkPublishableKey,
  },
});
