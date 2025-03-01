import type { ConfigContext, ExpoConfig } from "expo/config";

// Environment configuration
const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

// Throw error if preview environment is detected
if (IS_PREVIEW) {
  throw new Error(
    "Preview environment is not fully configured. Please use development or production environment.",
  );
}

// Get unique identifier based on environment
const getUniqueIdentifier = () => {
  if (IS_DEV) return "com.soonlist.app.dev";
  return "com.soonlist.app";
};

// Get app name based on environment
const getAppName = () => {
  if (IS_DEV) return "Soonlist (Dev)";
  return "Soonlist";
};

// Get scheme based on environment
const getScheme = () => {
  if (IS_DEV) return "soonlist.dev";
  return "soonlist";
};

// Get app group based on environment
const getAppGroup = () => {
  if (IS_DEV) return "group.com.soonlist.dev";
  return "group.com.soonlist";
};

// Get schemes for current environment only
const getSchemes = () => {
  if (IS_DEV) return ["soonlist.dev"];
  return ["soonlist"];
};

// Get OneSignal mode based on environment
const getOneSignalMode = () => {
  if (IS_DEV) return "development";
  return "production";
};

// Get OneSignal App ID based on environment
const getOneSignalAppId = (): string => {
  if (IS_DEV) return (process.env.ONE_SIGNAL_APP_ID_DEV as string) || "";
  return (process.env.ONE_SIGNAL_APP_ID_PROD as string) || "";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: "soonlist",
  name: getAppName(),
  slug: "timetimecc",
  scheme: getScheme(),
  version: "1.0.21",
  orientation: "portrait",
  icon: IS_DEV ? "./assets/icon-dev.png" : "./assets/icon.png",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  plugins: [
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
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
    ["expo-router"],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E0D9FF",
        image: "./assets/splash-logo.png",
        dark: {
          image: "./assets/splash-logo.png",
          backgroundColor: "#E0D9FF",
        },
        imageWidth: 200,
      },
    ],
    [
      "onesignal-expo-plugin",
      {
        mode: getOneSignalMode(),
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
    supportsTablet: false,
    bundleIdentifier: getUniqueIdentifier(),
    config: {
      usesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": [getAppGroup()],
    },
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ["fetch"],
      CFBundleURLTypes: [
        {
          CFBundleURLName: "Soonlist Schemes",
          CFBundleURLSchemes: getSchemes(),
        },
        {
          CFBundleURLName: "Additional Scheme",
          CFBundleURLSchemes: [getUniqueIdentifier()],
        },
      ],
    },
    associatedDomains: ["applinks:www.soonlist.com"],
  },
  android: {
    package: getUniqueIdentifier(),
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
  newArchEnabled: false,
  // plugins: ["expo-router"],
  extra: {
    eas: {
      projectId: "a8acc202-ed8c-48ed-9e5a-2570f510fe8a",
    },
    oneSignalAppId: getOneSignalAppId(),
  },
});
