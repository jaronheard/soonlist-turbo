import React from "react";
import { Notifier } from "react-native-notifier";
import { router } from "expo-router";

import { NotificationBanner } from "~/components/NotificationBanner";
import { hapticSuccess } from "~/utils/feedback";

interface EventCaptureBannerProps {
  eventId: string;
  notificationContent: {
    title: string;
    subtitle: string;
    body: string;
  };
  hideNotification?: () => void;
}

export function EventCaptureBanner({
  eventId,
  notificationContent,
  hideNotification,
}: EventCaptureBannerProps) {
  return (
    <NotificationBanner
      title={notificationContent.title}
      subtitle={notificationContent.subtitle}
      body={notificationContent.body}
      onPress={() => void router.navigate(`/event/${eventId}`)}
      hideNotification={hideNotification}
    />
  );
}

export function showEventCaptureBanner(props: {
  eventId: string;
  notificationContent: { title: string; subtitle: string; body: string };
}) {
  void hapticSuccess();
  Notifier.showNotification({
    duration: 8000,
    showAnimationDuration: 300,
    hideAnimationDuration: 300,
    swipeEnabled: true,
    Component: ({ hideNotification }: { hideNotification: () => void }) => (
      <EventCaptureBanner {...props} hideNotification={hideNotification} />
    ),
  });
}
