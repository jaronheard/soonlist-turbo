import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS } from "~/components/demoData";
import { FinishDemoButton } from "~/components/FinishDemoButton";
import { HeaderLogo } from "~/components/HeaderLogo";
import UserEventsList from "~/components/UserEventsList"; // Reuse your existing feed list
import { useOneSignal } from "~/providers/OneSignalProvider";

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Sort events by date (earliest first)
const sortEventsByDate = (events: DemoEvent[]) => {
  return [...events].sort((a, b) => {
    const dateA = new Date(`${a.startDate}T${a.startTime ?? "00:00"}`);
    const dateB = new Date(`${b.startDate}T${b.startTime ?? "00:00"}`);
    return dateA.getTime() - dateB.getTime();
  });
};

export default function DemoFeedScreen() {
  const router = useRouter();
  const { eventId, eventName } = useLocalSearchParams<{
    eventId?: string;
    eventName?: string;
  }>();
  const { hasNotificationPermission, checkPermissionStatus } = useOneSignal();

  // The newly captured event from user selection
  const [newEvent, setNewEvent] = useState<DemoEvent | null>(null);

  // Initialize feed with all events except the one being captured, sorted by date
  const initialFeed = useMemo(() => {
    const filteredEvents = DEMO_CAPTURE_EVENTS.filter(
      (event) => event.id !== eventId,
    );
    return sortEventsByDate(filteredEvents);
  }, [eventId]);

  // The local feed
  const [demoFeed, setDemoFeed] = useState<DemoEvent[]>(initialFeed);

  // Handle showing the notification
  const showNotification = async (eventId: string, eventName: string) => {
    try {
      // Check if notification permissions are granted using OneSignal
      const startTime = performance.now();
      const hasPermission = await checkPermissionStatus();
      const endTime = performance.now();
      console.log(`Permission check took ${endTime - startTime}ms`);

      if (hasPermission) {
        // Use Expo's local notifications with optimized settings for immediate display
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Event Captured! 🎉",
            body: `"${eventName}" has been added to your feed`,
            data: { eventId },
            sound: true, // Play sound to make it more noticeable
            priority: "high", // Set high priority
          },
          trigger: null, // Show immediately
        });
      } else {
        // Use toast if notifications are not enabled
        toast.success("Event Captured! 🎉", {
          description: `"${eventName}" has been added to your feed`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Failed to show notification:", error);
      // Fallback to toast if notification fails
      toast.success(`New event added: ${eventName}`);
    }
  };

  // Calculate stats based on feed events
  const stats = useMemo(() => {
    return {
      capturesThisWeek: demoFeed.length,
      weeklyGoal: 5, // Set a reasonable demo goal
      upcomingEvents: demoFeed.length,
      allTimeEvents: demoFeed.length,
    };
  }, [demoFeed]);

  // When the screen mounts, find the chosen event
  useEffect(() => {
    if (!eventId) return;
    const found = DEMO_CAPTURE_EVENTS.find((e) => e.id === eventId);
    setNewEvent(found ?? null);
  }, [eventId]);

  // Add the new event and show notification immediately
  useEffect(() => {
    if (newEvent && eventName) {
      // Add event to feed and sort by date
      setDemoFeed((prev) => sortEventsByDate([newEvent, ...prev]));
      // Show notification immediately
      void showNotification(eventId!, eventName);
    }
  }, [newEvent, eventId, eventName]);

  // We can reuse the <UserEventsList> with minimal props
  const feedEvents = useMemo(() => {
    // Transform demo events into the shape that your existing list expects
    // We'll do a quick inline transform
    const now = new Date();
    return demoFeed.map((demo) => ({
      id: demo.id,
      userId: "demoUserId",
      userName: "demoUser",
      createdAt: now,
      updatedAt: null,
      startDateTime: new Date(demo.startDate),
      endDateTime: new Date(demo.startDate),
      visibility: "public" as const,
      event: demo,
      eventMetadata: null,
      images: demo.images,
      user: {
        id: "demoUserId",
        createdAt: now,
        updatedAt: null,
        username: "demoUser",
        email: "demo@example.com",
        displayName: "Demo User",
        userImage: "",
        bio: null,
        publicEmail: null,
        publicPhone: null,
        publicLocation: null,
        publicBirthday: null,
        emoji: null,
        publicInsta: null,
        publicWebsite: null,
        publicMetadata: null,
        onboardingCompletedAt: null,
        onboardingData: null,
      },
      eventFollows: [],
      comments: [],
    }));
  }, [demoFeed]);

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "See all your possibilities",
          headerStyle: {
            backgroundColor: "#5A32FB",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerLeft: () => <HeaderLogo />,
        }}
      />

      <View className="flex-1">
        <View className="absolute right-4 top-16 z-10 ">
          <Text className="rounded-xl bg-accent-yellow px-3 py-1.5 text-center text-base font-medium text-neutral-1">
            Press and hold for options 👇
          </Text>
        </View>

        <UserEventsList
          events={feedEvents}
          showCreator="always"
          isRefetching={false}
          onRefresh={async () => Alert.alert("Demo feed refresh")}
          onEndReached={() => null}
          isFetchingNextPage={false}
          stats={stats}
          demoMode
        />
      </View>

      <View className="bg-white">
        <FinishDemoButton />
      </View>
    </View>
  );
}
