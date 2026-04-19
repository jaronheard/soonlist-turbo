import type { PostHog } from "posthog-react-native";
import { Platform, Share } from "react-native";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

export type ShareOwnListSource =
  | "pill"
  | "one_shot_sheet"
  | "header"
  | "settings"
  | "list_detail";

interface ShareOwnListParams {
  username: string | null | undefined;
  posthog: PostHog;
  source: ShareOwnListSource;
}

export async function shareOwnList({
  username,
  posthog,
  source,
}: ShareOwnListParams): Promise<{ shared: boolean }> {
  if (!username) return { shared: false };

  const url = `${Config.apiBaseUrl}/${username}`;

  posthog.capture("share_list_initiated", { source });

  try {
    const result = await Share.share(
      Platform.OS === "ios" ? { url } : { message: url },
    );

    if (result.action === Share.sharedAction) {
      posthog.capture("share_list_completed", { source });
      return { shared: true };
    }
    return { shared: false };
  } catch (error) {
    logError("shareOwnList failed", error);
    return { shared: false };
  }
}
