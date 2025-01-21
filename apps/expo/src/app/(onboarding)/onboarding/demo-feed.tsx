import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { toast } from "sonner-native";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS, DEMO_FEED_BASE } from "~/components/demoData";
import { HeaderLogo } from "~/components/HeaderLogo";
import UserEventsList from "~/components/UserEventsList"; // Reuse your existing feed list

export default function DemoFeedScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const router = useRouter();

  // The newly captured event from user selection
  const [newEvent, setNewEvent] = useState<DemoEvent | null>(null);

  // The local feed
  const [demoFeed, setDemoFeed] = useState<DemoEvent[]>(DEMO_FEED_BASE);

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

  // After 4 seconds, if we have a newEvent, add it
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (newEvent) {
      timer = setTimeout(() => {
        // Show a local push or toast
        void scheduleDemoNotification(newEvent.name).catch((err) =>
          console.error("Notification failed", err),
        );
        setDemoFeed((prev) => [...prev, newEvent]);
      }, 4000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [newEvent]);

  // Simulate local push for the newly "captured" event
  async function scheduleDemoNotification(eventName: string) {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === Notifications.PermissionStatus.GRANTED) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Captured a new event!",
            body: `Your demo event "${eventName}" has been added.`,
          },
          trigger: null,
        });
      } else {
        toast(`New event added: ${eventName}`);
      }
    } catch (error) {
      console.error(error);
      toast(`Added event: ${eventName}`);
    }
  }

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
