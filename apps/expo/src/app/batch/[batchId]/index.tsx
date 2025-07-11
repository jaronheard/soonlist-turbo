import React from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";

export default function BatchResultsPage() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();

  // Get batch status
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    batchId ? { batchId } : "skip",
  );

  // Get events for this batch
  const events = useQuery(
    api.events.getEventsByBatchId,
    batchId ? { batchId } : "skip",
  );

  if (!batchId) {
    return (
      <>
        <Stack.Screen options={{ title: "Batch Results" }} />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg text-neutral-2">No batch ID provided</Text>
        </View>
      </>
    );
  }

  if (events === undefined || batchStatus === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </>
    );
  }

  const title = batchStatus
    ? `${batchStatus.successCount} Event${batchStatus.successCount !== 1 ? "s" : ""} Added`
    : "Batch Results";

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: "Back",
        }}
      />
      <View className="flex-1 bg-white">
        <UserEventsList events={events} showCreator="never" variant="owned" />
      </View>
    </>
  );
}
