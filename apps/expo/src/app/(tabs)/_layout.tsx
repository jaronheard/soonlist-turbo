import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

interface CaptureAccessoryProps {
  isCapturing: boolean;
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}

function CaptureAccessory({
  isCapturing,
  title,
  actionLabel,
  onPress,
}: CaptureAccessoryProps) {
  const placement = NativeTabs.BottomAccessory.usePlacement();

  if (placement === "inline") {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={styles.inlinePlayer}
      >
        {isCapturing ? (
          <ActivityIndicator color="#5A32FB" size="small" />
        ) : (
          <Text style={styles.inlinePlayerText}>Captured</Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.regularPlayer}>
      <Text style={styles.accessoryTitle}>{title}</Text>
      {isCapturing ? (
        <ActivityIndicator color="#5A32FB" />
      ) : actionLabel && onPress ? (
        <Pressable onPress={onPress} style={styles.accessoryAction}>
          <Text style={styles.accessoryActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const isCapturing = useInFlightEventStore((s) => s.isCapturing);
  const activeBatchId = useInFlightEventStore((s) => s.activeBatchId);
  const setActiveBatchId = useInFlightEventStore((s) => s.setActiveBatchId);
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
  const accessoryTitle = isCapturing
    ? "Capturing event"
    : !batchStatus
      ? "Creating event"
      : batchStatus.status === "failed"
        ? "Event capture failed"
        : isBatchComplete
          ? "New event captured"
          : "Creating event";
  const accessoryActionLabel =
    isBatchComplete && batchStatus && batchStatus.successCount > 0
      ? "View"
      : undefined;

  useEffect(() => {
    if (!isBatchComplete) return;

    const timeout = setTimeout(() => {
      setActiveBatchId(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isBatchComplete, setActiveBatchId]);

  const handleAccessoryPress = () => {
    if (!batchStatus || !activeBatchId || !batchStatus.successCount) return;

    if (batchStatus.totalCount === 1 && batchStatus.firstEventId) {
      void router.navigate(`/event/${batchStatus.firstEventId}`);
      return;
    }

    void router.navigate(`/batch/${activeBatchId}`);
  };

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
          tabPress: () => {
            if (!isOnline || isCapturing) return;

            void triggerAddEventFlow();
          },
        }}
      >
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

const styles = StyleSheet.create({
  inlinePlayer: {
    padding: 8,
  },
  inlinePlayerText: {
    color: "#5A32FB",
    fontWeight: "700",
  },
  regularPlayer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  accessoryTitle: {
    flex: 1,
    color: "#1F1A3D",
    fontSize: 15,
    fontWeight: "700",
  },
  accessoryAction: {
    borderRadius: 16,
    backgroundColor: "#5A32FB",
    paddingHorizontal: 16,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  accessoryActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
