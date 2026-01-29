import React from "react";
import { Pressable, Text, View } from "react-native";
import { Notifier } from "react-native-notifier";
import { router } from "expo-router";

import { hapticSuccess } from "~/utils/feedback";

interface BatchSummaryBannerProps {
  batchId: string;
  title: string;
  subtitle: string;
  body: string;
  successCount: number;
  failureCount: number;
  hideNotification?: () => void;
}

export function BatchSummaryBanner({
  batchId,
  title,
  subtitle,
  body,
  successCount,
  failureCount,
  hideNotification,
}: BatchSummaryBannerProps) {
  const handleViewBatch = () => {
    hideNotification?.();
    void router.navigate(`/batch/${batchId}`);
  };

  const hasFailures = failureCount > 0;

  return (
    <View className="w-full px-4 pt-2">
      <Pressable onPress={handleViewBatch}>
        <View
          className="w-full overflow-hidden rounded-3xl bg-interactive-2 p-4"
          style={{
            borderWidth: 3,
            borderColor: hasFailures ? "#FCA5A5" : "white",
            shadowColor: hasFailures ? "#EF4444" : "#5A32FB",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2.5,
            elevation: 2,
            marginVertical: 4,
          }}
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                className="text-lg font-bold text-black"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
              <Text
                className="text-base text-black/80"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
              <Text className="mt-1 text-sm text-black/60">{body}</Text>
            </View>

            <View
              className="items-center justify-center rounded-full bg-interactive-1 px-4 py-3"
              style={{
                shadowColor: "#5A32FB",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-sm font-semibold text-white">View</Text>
            </View>
          </View>

          {/* Success/Failure counts */}
          <View className="mt-3 flex-row gap-3">
            <View className="flex-row items-center rounded-full bg-green-100 px-3 py-1">
              <Text className="text-xs font-medium text-green-700">
                ✓ {successCount} captured
              </Text>
            </View>
            {hasFailures && (
              <View className="flex-row items-center rounded-full bg-red-100 px-3 py-1">
                <Text className="text-xs font-medium text-red-700">
                  ✗ {failureCount} failed
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function showBatchSummaryBanner(
  props: Omit<BatchSummaryBannerProps, "hideNotification">,
) {
  void hapticSuccess();
  Notifier.showNotification({
    duration: 8000,
    showAnimationDuration: 300,
    hideAnimationDuration: 300,
    swipeEnabled: true,
    Component: ({ hideNotification }: { hideNotification: () => void }) => (
      <BatchSummaryBanner {...props} hideNotification={hideNotification} />
    ),
  });
}
