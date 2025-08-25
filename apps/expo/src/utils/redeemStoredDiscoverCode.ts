import AsyncStorage from "@react-native-async-storage/async-storage";

import { DISCOVER_CODE_KEY } from "~/constants";
import { useAppStore } from "~/store";
import { logError, logMessage } from "~/utils/errorLogging";

type RedeemFn = (args: {
  code: string;
}) => Promise<{ success: boolean; error?: string }>;

export async function redeemStoredDiscoverCode(
  redeemCode: RedeemFn,
): Promise<void> {
  let shouldClear: boolean | undefined;
  try {
    const code = await AsyncStorage.getItem(DISCOVER_CODE_KEY);
    if (!code) return;

    const normalized = code.trim().toUpperCase();
    const result = await redeemCode({ code: normalized });

    if (result.success) {
      logMessage("Redeemed stored discover code", { code: normalized });
      // Set override immediately so UI updates on first render post-signup
      try {
        const setOverride = useAppStore.getState().setDiscoverAccessOverride;
        setOverride(true);
      } catch {
        // ignore if store is not initialized in this context
      }
      shouldClear = true;
    } else {
      logError(
        "Failed to redeem stored discover code",
        new Error(result.error || "Unknown error"),
        { code: normalized },
      );
      // Only clear on known invalid-code responses to avoid losing retry on transient failures
      if (result.error === "Invalid code") {
        shouldClear = true;
      }
    }
  } catch (err) {
    logError("Error redeeming stored discover code", err);
  } finally {
    try {
      if (typeof shouldClear !== "undefined" && shouldClear) {
        await AsyncStorage.removeItem(DISCOVER_CODE_KEY);
      }
    } catch (clearErr) {
      logError("Failed to clear DISCOVER_CODE_KEY", clearErr);
    }
  }
}
