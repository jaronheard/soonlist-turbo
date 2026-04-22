import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { AttributionGrid } from "~/components/AttributionGrid";
import { eventFollowsToSavers } from "~/utils/eventFollows";

interface EnrichedEventFollow {
  userId: string;
  eventId: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    userImage?: string | null;
  } | null;
}

export default function SavedByScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useUser();

  const event = useQuery(api.events.get, id ? { eventId: id } : "skip");

  const savers = useMemo(() => {
    if (!event?.user) return [];
    return eventFollowsToSavers(
      event.eventFollows as EnrichedEventFollow[] | undefined,
      { excludeUserId: event.user.id },
    );
  }, [event]);

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Stack.Screen options={{ title: "From these Soonlists" }} />
        {event === undefined ? (
          <ActivityIndicator size="large" color="#5A32FB" />
        ) : null}
      </View>
    );
  }

  const eventUser = event.user;
  if (!eventUser) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ title: "From these Soonlists" }} />
      </View>
    );
  }

  const lists = (event as { lists?: Doc<"lists">[] }).lists ?? [];

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ title: "From these Soonlists" }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <AttributionGrid
          creator={{
            id: eventUser.id,
            username: eventUser.username,
            displayName: eventUser.displayName,
            userImage: eventUser.userImage,
          }}
          savers={savers}
          lists={lists}
          currentUserId={currentUser?.id}
          onNavigate={() => router.back()}
          variant="card"
          showLabel={false}
        />
      </ScrollView>
    </View>
  );
}
