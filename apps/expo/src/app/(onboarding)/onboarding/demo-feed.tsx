import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS } from "~/components/demoData";
import { FinishDemoButton } from "~/components/FinishDemoButton";
import { HeaderLogo } from "~/components/HeaderLogo";
import UserEventsList from "~/components/UserEventsList"; // Reuse your existing feed list

const ADD_EVENT_DELAY = 4000;

// Sort events by date (earliest first)
const sortEventsByDate = (events: DemoEvent[]) => {
  return [...events].sort((a, b) => {
    const dateA = new Date(`${a.startDate}T${a.startTime ?? "00:00"}`);
    const dateB = new Date(`${b.startDate}T${b.startTime ?? "00:00"}`);
    return dateA.getTime() - dateB.getTime();
  });
};

export default function DemoFeedScreen() {
  const { eventId, eventName } = useLocalSearchParams<{
    eventId?: string;
    eventName?: string;
  }>();

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

    if (newEvent && eventName && eventId) {
      // Set a timer to add the event after a delay
      timer = setTimeout(() => {
        // Add event to feed and sort by date
        setDemoFeed((prev) => sortEventsByDate([newEvent, ...prev]));
      }, ADD_EVENT_DELAY);
    }

    // Clean up the timer if component unmounts
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
