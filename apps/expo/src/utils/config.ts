import * as Updates from "expo-updates";

// https://docs.expo.dev/eas-update/environment-variables/#setting-a-custom-local-environment

interface Config {
  env: "development" | "production";
  apiBaseUrl: string;
  clerkPublishableKey: string;
}

const Config: Config = {
  env: "development",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "",
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
};

if (Updates.channel === "production") {
  Config.env = "production";
  Config.apiBaseUrl = "https://www.soonlist.com";
  Config.clerkPublishableKey = "pk_live_Y2xlcmsuc29vbmxpc3QuY29tJA";
}

export default Config;
