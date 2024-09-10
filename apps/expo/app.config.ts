import type { ConfigContext, ExpoConfig } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "Soonlist (Dev)" : "Soonlist",
  slug: "timetimecc",
  scheme: IS_DEV ? "soonlist.dev" : "soonlist",
  version: "1.0.1",
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
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.0",
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
