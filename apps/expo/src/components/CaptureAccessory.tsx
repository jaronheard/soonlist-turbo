import type { FunctionReturnType } from "convex/server";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { hapticSelection } from "~/utils/feedback";

type BatchStatus = FunctionReturnType<typeof api.eventBatches.getBatchStatus>;

const BRAND = "#5A32FB";
const NEUTRAL_2 = "#627496";

interface CaptureAccessoryContentProps {
  batchId: string;
}

/**
 * CaptureAccessoryContent
 * -----------------------
 * Rendered inside `<NativeTabs.BottomAccessory>` (iOS 26+). Two instances of
 * this component are rendered simultaneously — one for the "regular"
 * placement (above the tab bar) and one for "inline" (next to the tab bar
 * when it's minimized). Local state would not be shared between them, so
 * all state lives in `useAppStore` and the Convex query below
 * (deduped across both instances).
 */
export function CaptureAccessoryContent({
  batchId,
}: CaptureAccessoryContentProps) {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const completedAt = useAppStore((s) => s.accessoryCompletedAt);

  const status = useQuery(api.eventBatches.getBatchStatus, { batchId });
  const isTerminal =
    status?.status === "completed" || status?.status === "failed";

  const handleOpen = useCallback(() => {
    void hapticSelection();
    // Prefer the direct event route only when this was a single-event
    // capture to begin with. Partial-success multi-captures still have
    // `events.length === 1` but the user needs to see the batch screen
    // to review what failed, so gate on totalCount too. Otherwise (still
    // loading, still processing, multi-event, or failure), fall through
    // to the batch screen — so a tap is never dropped just because
    // `getBatchStatus` hasn't resolved.
    if (
      isTerminal &&
      status.totalCount === 1 &&
      status.events.length === 1 &&
      status.events[0]
    ) {
      router.navigate(`/event/${status.events[0].id}`);
    } else {
      router.navigate(`/batch/${batchId}`);
    }
  }, [batchId, status, isTerminal]);

  const handleDismiss = useCallback(() => {
    void hapticSelection();
    useAppStore.getState().dismissAccessoryBatch();
  }, []);

  if (placement === "inline") {
    return (
      <InlineAccessory
        status={status}
        isTerminal={isTerminal}
        onOpen={handleOpen}
      />
    );
  }

  return (
    <RegularAccessory
      status={status}
      isTerminal={isTerminal}
      completedAt={completedAt}
      onOpen={handleOpen}
      onDismiss={handleDismiss}
    />
  );
}

interface RegularAccessoryProps {
  status: BatchStatus | undefined;
  isTerminal: boolean;
  completedAt: number | null;
  onOpen: () => void;
  onDismiss: () => void;
}

function RegularAccessory({
  status,
  isTerminal,
  completedAt,
  onOpen,
  onDismiss,
}: RegularAccessoryProps) {
  const copy = getAccessoryCopy(status, isTerminal, completedAt);
  // Only treat this as a single-event capture when the batch was a
  // single-event capture to begin with. Partial-success multi-captures
  // have `events.length === 1` too, but the user needs the batch-level
  // context — tap opens the batch screen rather than a single event.
  const singleEvent =
    isTerminal && status?.totalCount === 1 && status.events.length === 1
      ? status.events[0]
      : null;
  const imageUrl = singleEvent?.image ?? null;

  return (
    <View style={styles.regularContainer}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={copy.accessibility}
        accessibilityHint={
          isTerminal
            ? "Opens the captured event"
            : "Opens the batch progress screen"
        }
        style={({ pressed }) => [
          styles.regularPressable,
          pressed && { opacity: 0.7 },
        ]}
      >
        <AccessoryLeading
          status={status}
          isTerminal={isTerminal}
          imageUrl={imageUrl}
        />
        <View style={styles.regularTextColumn}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.regularTitle}
          >
            {copy.title}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.regularSubtitle}
          >
            {copy.subtitle}
          </Text>
        </View>
      </Pressable>

      {isTerminal ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={6}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.5 },
          ]}
        >
          <SymbolView
            name="xmark"
            size={12}
            tintColor={NEUTRAL_2}
            resizeMode="scaleAspectFit"
          />
        </Pressable>
      ) : null}
    </View>
  );
}

interface AccessoryLeadingProps {
  status: BatchStatus | undefined;
  isTerminal: boolean;
  imageUrl: string | null;
}

function AccessoryLeading({
  status,
  isTerminal,
  imageUrl,
}: AccessoryLeadingProps) {
  if (!isTerminal || !status) {
    return (
      <View style={styles.leading}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }
  if (status.successCount === 0) {
    return (
      <View style={[styles.leading, styles.leadingFailure]}>
        <SymbolView
          name="exclamationmark.triangle.fill"
          size={18}
          tintColor="#FFFFFF"
          resizeMode="scaleAspectFit"
        />
      </View>
    );
  }
  if (imageUrl) {
    return (
      <ExpoImage
        source={{ uri: `${imageUrl}?w=72&h=72&fit=cover&f=webp&q=80` }}
        style={styles.leadingImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
      />
    );
  }
  return (
    <View style={[styles.leading, styles.leadingSuccess]}>
      <SymbolView
        name="checkmark"
        size={16}
        tintColor="#FFFFFF"
        resizeMode="scaleAspectFit"
      />
    </View>
  );
}

interface InlineAccessoryProps {
  status: BatchStatus | undefined;
  isTerminal: boolean;
  onOpen: () => void;
}

function InlineAccessory({ status, isTerminal, onOpen }: InlineAccessoryProps) {
  const label = getInlineLabel(status, isTerminal);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={label ?? "Event capture"}
      style={({ pressed }) => [
        styles.inlineContainer,
        pressed && { opacity: 0.6 },
      ]}
      hitSlop={8}
    >
      {!isTerminal || !status ? (
        <ActivityIndicator color={BRAND} />
      ) : status.successCount === 0 ? (
        <SymbolView
          name="exclamationmark.triangle.fill"
          size={18}
          tintColor="#B3261E"
          resizeMode="scaleAspectFit"
        />
      ) : (
        <SymbolView
          name="checkmark.circle.fill"
          size={20}
          tintColor={BRAND}
          resizeMode="scaleAspectFit"
        />
      )}
      {label ? (
        <Text numberOfLines={1} style={styles.inlineLabel}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface AccessoryCopy {
  title: string;
  subtitle: string;
  accessibility: string;
}

function getAccessoryCopy(
  status: BatchStatus | undefined,
  isTerminal: boolean,
  completedAt: number | null,
): AccessoryCopy {
  if (!status) {
    return {
      title: "Capturing…",
      subtitle: "Getting things ready",
      accessibility: "Capturing event",
    };
  }
  const total = status.totalCount;
  if (!isTerminal) {
    const plural = total === 1 ? "1 event" : `${total} events`;
    return {
      title: `Capturing ${plural}…`,
      subtitle:
        status.progress > 0 ? `${status.progress}% processed` : "Starting up",
      accessibility: `Capturing ${plural}`,
    };
  }

  if (status.successCount === 0) {
    return {
      title: "Capture failed",
      subtitle: total > 1 ? `0 of ${total} events added` : "Tap for details",
      accessibility: "Capture failed",
    };
  }

  if (total === 1 && status.events.length === 1 && status.events[0]) {
    const event = status.events[0];
    const name = event.name || "New event";
    const when = formatWhen(event.startDate, event.startTime);
    const relative = completedAt ? ` · ${formatRelative(completedAt)}` : "";
    return {
      title: name,
      subtitle: `${when ?? "Event captured"}${relative}`,
      accessibility: `${name}, captured`,
    };
  }

  const successCount = status.successCount;
  const addedLabel = `${successCount} event${successCount === 1 ? "" : "s"} added`;
  if (status.failureCount > 0) {
    return {
      title: addedLabel,
      subtitle: `${status.failureCount} didn't capture`,
      accessibility: `${addedLabel}, ${status.failureCount} failed`,
    };
  }
  return {
    title: addedLabel,
    subtitle: "Tap to review",
    accessibility: addedLabel,
  };
}

function getInlineLabel(
  status: BatchStatus | undefined,
  isTerminal: boolean,
): string | null {
  if (!status || !isTerminal) return null;
  if (status.successCount === 0) return null;
  if (status.successCount === 1) return null;
  return String(status.successCount);
}

function formatWhen(
  startDate: string | null,
  startTime: string | null,
): string | null {
  if (!startDate) return null;
  try {
    // startDate is an ISO date like "2026-11-22"; build a stable local date
    // so we render the same calendar day the user saw when capturing.
    const dateParts = startDate.split("-");
    const year = dateParts[0] ? parseInt(dateParts[0], 10) : NaN;
    const month = dateParts[1] ? parseInt(dateParts[1], 10) : NaN;
    const day = dateParts[2] ? parseInt(dateParts[2], 10) : NaN;
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    const date = new Date(year, month - 1, day);
    const dateLabel = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (startTime) {
      const timeParts = startTime.split(":");
      const h = timeParts[0] ? parseInt(timeParts[0], 10) : NaN;
      const m = timeParts[1] ? parseInt(timeParts[1], 10) : NaN;
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const timed = new Date(date);
        timed.setHours(h, m, 0, 0);
        const timeLabel = timed.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: m === 0 ? undefined : "2-digit",
        });
        return `${dateLabel} · ${timeLabel}`;
      }
    }
    return dateLabel;
  } catch {
    return null;
  }
}

function formatRelative(timestampMs: number): string {
  const deltaSec = Math.max(0, Math.round((Date.now() - timestampMs) / 1000));
  if (deltaSec < 45) return "just now";
  const minutes = Math.round(deltaSec / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

const LEADING_SIZE = 28;

const styles = StyleSheet.create({
  // iOS 26 provides the capsule background + vertical padding; our
  // container only lays out the row. Avoid flex:1 / paddingVertical so
  // the accessory sizes to its intrinsic content instead of stretching.
  regularContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 8,
  },
  regularPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Allow the text column to shrink for ellipsis; without minWidth:0
    // on the flex child, long labels push the dismiss button off-screen.
    minWidth: 0,
  },
  regularTextColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  regularTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0B0B0B",
  },
  regularSubtitle: {
    fontSize: 11,
    color: NEUTRAL_2,
    marginTop: 1,
  },
  actionButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  leading: {
    width: LEADING_SIZE,
    height: LEADING_SIZE,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(90,50,251,0.12)",
  },
  leadingSuccess: {
    backgroundColor: BRAND,
  },
  leadingFailure: {
    backgroundColor: "#B3261E",
  },
  leadingImage: {
    width: LEADING_SIZE,
    height: LEADING_SIZE,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND,
  },
});
