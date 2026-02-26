import React from "react";
import { Notifier } from "react-native-notifier";
import { router } from "expo-router";

import { NotificationBanner } from "~/components/NotificationBanner";
import { hapticSuccess } from "~/utils/feedback";

interface BatchSummaryBannerProps {
  batchId: string;
  notificationContent: {
    title: string;
    subtitle: string;
    body: string;
  };
  hideNotification?: () => void;
}

export function BatchSummaryBanner({
  batchId,
  notificationContent,
  hideNotification,
}: BatchSummaryBannerProps) {
  return (
    <NotificationBanner
      title={notificationContent.title}
      subtitle={notificationContent.subtitle}
      body={notificationContent.body}
      onPress={() => void router.navigate(`/batch/${batchId}`)}
      hideNotification={hideNotification}
    />
  );
}

export function showBatchSummaryBanner(props: {
  batchId: string;
  notificationContent: { title: string; subtitle: string; body: string };
}) {
  void hapticSuccess();
  Notifier.showNotification({
    duration: 5000,
    showAnimationDuration: 300,
    hideAnimationDuration: 300,
    swipeEnabled: true,
    Component: ({ hideNotification }: { hideNotification: () => void }) => (
      <BatchSummaryBanner {...props} hideNotification={hideNotification} />
    ),
  });
}
