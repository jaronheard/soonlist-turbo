import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { AttributionGrid } from "~/components/AttributionGrid";
import { eventFollowsToSavers } from "~/utils/eventFollows";

export default function SavedByScreen() {
  const insets = useSafeAreaInsets();
  const { user: clerkUser } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = typeof id === "string" ? id : "";

  const event = useQuery(api.events.get, eventId ? { eventId } : "skip");

  const currentUserRecord = useQuery(
    api.users.getByUsername,
    clerkUser?.username ? { userName: clerkUser.username } : "skip",
  );
  const currentUserId = currentUserRecord?.id;

  return (
    <>
      <Stack.Screen options={{ title: "From these Soonlists" }} />
      <View className="flex-1 bg-white">
        {event === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A32FB" />
          </View>
        ) : !event?.user ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-base text-neutral-2">Event not found</Text>
          </View>
        ) : (
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <AttributionGrid
              creator={{
                id: event.user.id,
                username: event.user.username,
                displayName: event.user.displayName,
                userImage: event.user.userImage,
              }}
              savers={eventFollowsToSavers(event.eventFollows)}
              lists={event.lists}
              currentUserId={currentUserId}
              onNavigate={() => router.back()}
              variant="card"
              showLabel={false}
            />
          </ScrollView>
        )}
      </View>
    </>
  );
}
