import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "feed",
};

const INLINE_LABEL_SIZE = 15;
/** `neutral-2` from Tailwind/CSS vars (`apps/expo/src/styles.css` - 98 116 150). */
const NEUTRAL_2 = "#627496";
/** `interactive-1` from Tailwind/CSS vars (`apps/expo/src/styles.css` - 90 50 251). */
const INTERACTIVE_1 = "#5A32FB";

interface CaptureAccessoryProps {
  isCapturing: boolean;
  title: string;
  /** Short left label when the accessory is minimized (compact tab placement). */
  inlineLeadingLabel: string;
  actionLabel?: string;
  onPress?: () => void;
}

function CaptureAccessory({
  isCapturing,
  title,
  inlineLeadingLabel,
  actionLabel,
  onPress,
}: CaptureAccessoryProps) {
  const placement = NativeTabs.BottomAccessory.usePlacement();

  if (placement === "inline") {
    return (
      <View style={styles.inlinePlayer}>
        <Text style={styles.inlineAccessoryTitle} numberOfLines={1}>
          {inlineLeadingLabel}
        </Text>
        {isCapturing || (actionLabel && onPress) ? (
          <View style={styles.inlineTrailing}>
            {isCapturing ? (
              <ActivityIndicator color={NEUTRAL_2} size="small" />
            ) : (
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                hitSlop={6}
                style={styles.accessoryActionPressable}
              >
                <Text style={styles.inlineAccessoryAction}>{actionLabel}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.regularPlayer}>
      <Text style={styles.accessoryTitle}>{title}</Text>
      {isCapturing || (actionLabel && onPress) ? (
        <View style={styles.regularTrailing}>
          {isCapturing ? (
            <ActivityIndicator color={NEUTRAL_2} />
          ) : (
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.accessoryActionPressable}
            >
              <Text style={styles.accessoryAction}>{actionLabel}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const previousBatchStatusRef = useRef<string | undefined>(undefined);

  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const activeBatchId = useInFlightEventStore((s) => s.activeBatchId);
  const clearActiveBatchIdIfCurrent = useInFlightEventStore(
    (s) => s.clearActiveBatchIdIfCurrent,
  );
  const isOnline = useNetworkStatus();
  const { triggerAddEventFlow } = useAddEventFlow();

  // The query result IS state — no useEffect → zustand → useStore loop. The
  // count queries are backed by userFeedGroupsAggregate (O(log n)) and return
  // 0 when unauthenticated, so they're safe to call here unconditionally.
  // See https://react.dev/learn/you-might-not-need-an-effect.
  const myListBadgeCount = useQuery(api.feeds.getMyFeedGroupedBadgeCount) ?? 0;
  const communityBadgeCount =
    useQuery(api.feeds.getFollowedListsFeedGroupedBadgeCount) ?? 0;
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    activeBatchId ? { batchId: activeBatchId } : "skip",
  );

  const isBatchComplete =
    batchStatus?.status === "completed" || batchStatus?.status === "failed";
  const showCaptureAccessory = isCapturing || Boolean(activeBatchId);
  const isMultipleEventBatch = (batchStatus?.totalCount ?? 0) > 1;
  const accessoryTitle = isCapturing
    ? "Capturing events"
    : !batchStatus
      ? "Capturing events"
      : batchStatus.status === "failed"
        ? "Capture failed"
        : isBatchComplete
          ? isMultipleEventBatch
            ? "Events captured"
            : "New event captured"
          : "Capturing events";

  /** Compact/minimized accessory: mirrors large layout - short left copy, spinner or View trailing. */
  const inlineLeadingLabel = isCapturing
    ? "Capturing..."
    : !batchStatus
      ? "Capturing..."
      : batchStatus.status === "failed"
        ? "failed"
        : isBatchComplete
          ? "Captured"
          : "Capturing...";
  const accessoryActionLabel =
    batchStatus?.status === "completed" && batchStatus.successCount > 0
      ? "View"
      : undefined;

  useEffect(() => {
    const previousStatus = previousBatchStatusRef.current;
    const currentStatus = batchStatus?.status;

    previousBatchStatusRef.current = currentStatus;

    if (previousStatus === currentStatus) return;

    if (currentStatus === "completed") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [batchStatus?.status]);

  useEffect(() => {
    if (!isBatchComplete || !activeBatchId) return;

    const timeout = setTimeout(() => {
      clearActiveBatchIdIfCurrent(activeBatchId);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [activeBatchId, clearActiveBatchIdIfCurrent, isBatchComplete]);

  const handleAccessoryPress = () => {
    if (!batchStatus || !activeBatchId || !batchStatus.successCount) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (batchStatus.totalCount === 1 && batchStatus.firstEventId) {
      void router.navigate(`/event/${batchStatus.firstEventId}`);
      return;
    }

    void router.navigate(`/batch/${activeBatchId}`);
  };

  const handleAddTabPress = useCallback(() => {
    if (!isOnline || isCapturing) return;

    void triggerAddEventFlow();
  }, [isCapturing, isOnline, triggerAddEventFlow]);

  return (
    <NativeTabs
      tintColor="#5A32FB"
      {...(SUPPORTS_LIQUID_GLASS
        ? { minimizeBehavior: "onScrollDown" as const }
        : {})}
      blurEffect="systemChromeMaterialLight" /* interactive-1 */
    >
      {showCaptureAccessory ? (
        <NativeTabs.BottomAccessory>
          <CaptureAccessory
            isCapturing={isCapturing || !isBatchComplete}
            title={accessoryTitle}
            inlineLeadingLabel={inlineLeadingLabel}
            actionLabel={accessoryActionLabel}
            onPress={accessoryActionLabel ? handleAccessoryPress : undefined}
          />
        </NativeTabs.BottomAccessory>
      ) : null}
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>My Soonlist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "list.bullet", selected: "list.bullet" }}
        />
        {myListBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(myListBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="following">
        <NativeTabs.Trigger.Label>My Scene</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
        />
        {communityBadgeCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {String(communityBadgeCount)}
          </NativeTabs.Trigger.Badge>
        ) : (
          <NativeTabs.Trigger.Badge hidden />
        )}
      </NativeTabs.Trigger>
      {/* Search-role tab: blank Add screen + photo capture on press. */}
      <NativeTabs.Trigger
        name="add"
        role="search"
        // @ts-expect-error -- preventNavigation comes from our react-native-screens patch; not yet in published .d.ts
        unstable_nativeProps={{ preventNavigation: true }}
        listeners={{
          tabPress: handleAddTabPress,
        }}
      >
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          src={require("~/assets/tabs/add.png")}
          renderingMode="original"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  inlinePlayer: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  inlineAccessoryTitle: {
    flex: 1,
    flexShrink: 1,
    color: NEUTRAL_2,
    fontSize: INLINE_LABEL_SIZE,
    fontWeight: "700",
    marginRight: 8,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false }
      : ({
          paddingVertical: 1,
        } as const)),
  },
  inlineTrailing: {
    minHeight: INLINE_LABEL_SIZE + (Platform.OS === "ios" ? 8 : 6),
    justifyContent: "center",
    alignItems: "flex-end",
  },
  inlineAccessoryAction: {
    color: INTERACTIVE_1,
    fontSize: INLINE_LABEL_SIZE,
    fontWeight: "700",
    ...(Platform.OS === "ios"
      ? ({ paddingVertical: 1 } as const)
      : { includeFontPadding: false }),
  },
  regularPlayer: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  /**
   * Fixed-height trailing column so spinner vs "View" share the same cross-axis geometry.
   * Otherwise the success-only row measures shorter and flexbox re-centers the title differently.
   */
  regularTrailing: {
    minHeight: 28,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  accessoryTitle: {
    flex: 1,
    flexShrink: 1,
    color: NEUTRAL_2,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 12,
    // Let RN derive line metrics from the font; fixed lineHeight + bold SF was clipping in the accessory.
    ...(Platform.OS === "android"
      ? { includeFontPadding: false }
      : ({
          /** iOS: ~1 px breathing room inside the label for the tab accessory slot. */
          paddingVertical: 1,
        } as const)),
  },
  accessoryActionPressable: {
    justifyContent: "center",
  },
  accessoryAction: {
    color: INTERACTIVE_1,
    fontSize: 15,
    fontWeight: "700",
    ...(Platform.OS === "ios"
      ? ({ paddingVertical: 1 } as const)
      : { includeFontPadding: false }),
  },
});
