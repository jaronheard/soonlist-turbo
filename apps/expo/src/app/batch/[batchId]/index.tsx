import React from "react";
import { View, Text } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import UserEventsList from "~/components/UserEventsList";
import LoadingSpinner from "~/components/LoadingSpinner";

export default function BatchResultsPage() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();

  // Get batch status
  const batchStatus = useQuery(api.eventBatches.getBatchStatus, 
    batchId ? { batchId } : "skip"
  );

  // Get events for this batch
  const events = useQuery(api.events.getEventsByBatchId,
    batchId ? { batchId } : "skip"
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
    ? `${batchStatus.successCount} Event${batchStatus.successCount !== 1 ? 's' : ''} Added`
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
        {batchStatus && batchStatus.successCount > 0 && (
          <View className="border-b border-neutral-4 bg-neutral-5 px-4 py-3">
            <Text className="text-center text-sm text-neutral-2">
              {batchStatus.failureCount === 0 
                ? `Successfully captured ${batchStatus.successCount} of ${batchStatus.totalCount} events`
                : `Captured ${batchStatus.successCount} of ${batchStatus.totalCount} events (${batchStatus.failureCount} failed)`
              }
            </Text>
          </View>
        )}
        
        <UserEventsList
          events={events}
          showCreator="never"
          variant="owned"
        />
      </View>
    </>
  );
}