import { Platform } from "react-native";
import * as Application from "expo-application";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export const APP_STORE_URL = "https://apps.apple.com/app/id6670222216";

function isVersionLessThan(version: string, thanVersion: string): boolean {
  const versionParts = version.split(".").map(Number);
  const thanParts = thanVersion.split(".").map(Number);
  const maxLength = Math.max(versionParts.length, thanParts.length);

  for (let i = 0; i < maxLength; i++) {
    const versionPart = versionParts[i] ?? 0;
    const thanPart = thanParts[i] ?? 0;

    if (versionPart < thanPart) return true;
    if (versionPart > thanPart) return false;
  }

  return false;
}

export function useForceUpdate() {
  const minimumVersion = useQuery(api.appConfig.getMinimumIOSVersion);
  const currentVersion = Application.nativeApplicationVersion;

  if (Platform.OS !== "ios") return { needsUpdate: false };
  if (minimumVersion === undefined) return { needsUpdate: false };
  if (!minimumVersion) return { needsUpdate: false };

  const needsUpdate =
    !!currentVersion && isVersionLessThan(currentVersion, minimumVersion);

  return { needsUpdate };
}

