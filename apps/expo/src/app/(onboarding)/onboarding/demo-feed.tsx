import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS } from "~/components/demoData";
import { HeaderLogo } from "~/components/HeaderLogo";
import UserEventsList from "~/components/UserEventsList"; // Reuse your existing feed list

const NOTIFICATION_DELAY = 1000; // 4 seconds

// Sort events by date (earliest first)
const sortEventsByDate = (events: DemoEvent[]) => {
  return [...events].sort((a, b) => {
    const dateA = new Date(`${a.startDate}T${a.startTime ?? "00:00"}`);
    const dateB = new Date(`${b.startDate}T${b.startTime ?? "00:00"}`);
    return dateA.getTime() - dateB.getTime();
  });
};

// Handle showing the notification
const showNotification = async (eventId: string, eventName: string) => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === Notifications.PermissionStatus.GRANTED) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Event Captured! 🎉",
          body: `"${eventName}" has been added to your feed`,
          data: {
            url: `/onboarding/demo-feed?eventId=${eventId}`,
            notificationId: "demo-capture-notification",
          },
        },
        trigger: null, // Show immediately since we're already delayed
      });
    } else {
      // Fallback to toast if no notification permissions
      toast(`New event added: ${eventName}`);
    }
  } catch (error) {
    console.error("Failed to show notification:", error);
    toast(`New event added: ${eventName}`);
  }
};

export default function DemoFeedScreen() {
  const { eventId, eventName } = useLocalSearchParams<{
    eventId?: string;
    eventName?: string;
  }>();
  const router = useRouter();

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

  // Add the new event and show notification after delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (newEvent && eventName) {
      timer = setTimeout(() => {
        // Add event to feed and sort by date
        setDemoFeed((prev) => sortEventsByDate([newEvent, ...prev]));
        // Show notification
        void showNotification(eventId!, eventName);
      }, NOTIFICATION_DELAY);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
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
          headerTitle: "Demo Feed",
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

      <UserEventsList
        events={feedEvents}
        showCreator="always"
        isRefetching={false}
        onRefresh={async () => Alert.alert("Demo feed refresh")}
        onEndReached={() => null}
        isFetchingNextPage={false}
        stats={stats}
        onEventPress={(event) => {
          router.push(`/onboarding/demo-event/${event.id}`);
        }}
      />

      <View className="px-4 pb-8">
        <Button
          title="Finish or View Details"
          onPress={() => {
            if (newEvent) {
              // If they want to see details of the newly added event
              router.push(`/onboarding/demo-event/${newEvent.id}`);
            } else {
              // If no new event, just end
              router.push("/feed");
            }
          }}
        />
      </View>
    </View>
  );
}
