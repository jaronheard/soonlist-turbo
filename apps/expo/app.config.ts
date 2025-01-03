import type { ConfigContext, ExpoConfig } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: "soonlist",
  name: IS_DEV ? "Soonlist (Dev)" : "Soonlist",
  slug: "timetimecc",
  scheme: IS_DEV ? "soonlist.dev" : "soonlist",
  version: "1.0.4",
  orientation: "portrait",
  icon: IS_DEV ? "./assets/icon-dev.png" : "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  plugins: [
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.0",
          infoPlist: {
            PHPhotoLibraryPreventAutomaticLimitedAccessAlert: true,
          },
        },
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
    "expo-secure-store",
    [
      "expo-calendar",
      {
        calendarPermission:
          "The app needs to access your calendars to add events.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "The app accesses photos you select to add events.",
      },
    ],
    [
      "@bacons/apple-targets",
      {
        appleTeamId: "GQ59Z4XZHZ",
      },
    ],
    [
      "@intercom/intercom-react-native",
      {
        appId: "xn0q41hi",
        androidApiKey: "android_sdk-a26b2f3e5307db04134c71c8e59f7465a578109d",
        iosApiKey: "ios_sdk-34383d2c19fe53cc172a8be023b3dfc92fa87004",
      },
    ],
    ["expo-apple-authentication"],
    ["expo-localization"],
    ["expo-av"],
    [
      "expo-media-library",
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
        savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    // [
    //   "expo-background-fetch",
    //   {
    //     startOnBoot: true,
    //   },
    // ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? "com.soonlist.app.dev" : "com.soonlist.app",
    config: {
      usesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": [
        IS_DEV ? "group.com.soonlist.dev" : "group.com.soonlist",
      ],
    },
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ["fetch"],
    },
  },
  android: {
    package: IS_DEV ? "com.soonlist.app.dev" : "com.soonlist.app",
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
    typedRoutes: true,
  },
  // plugins: ["expo-router"],
  extra: {
    eas: {
      projectId: "a8acc202-ed8c-48ed-9e5a-2570f510fe8a",
    },
  },
});
