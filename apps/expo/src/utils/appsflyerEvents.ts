import appsFlyer from "react-native-appsflyer";

import { logError } from "./errorLogging";

export const AF_EVENTS = {
  COMPLETE_REGISTRATION: "af_complete_registration",
  LOGIN: "af_login",
  CONTENT_VIEW: "af_content_view",
  SHARE: "af_share",
  START_TRIAL: "af_start_trial",
} as const;

export function trackAFEvent(
  eventName: string,
  eventValues: Record<string, string | number | boolean>,
): void {
  try {
    appsFlyer.logEvent(eventName, eventValues);
  } catch (error) {
    logError("AppsFlyer event tracking failed", error, { eventName });
  }
}
