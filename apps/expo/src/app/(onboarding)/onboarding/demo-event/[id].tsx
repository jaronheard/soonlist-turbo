import React, { useMemo } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { DemoEvent } from "~/components/demoData";
import { DEMO_CAPTURE_EVENTS, DEMO_FEED_BASE } from "~/components/demoData";

export default function DemoEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const event: DemoEvent | undefined = useMemo(() => {
    if (!id) return undefined;
    // Try to find in capture array first
    let found = DEMO_CAPTURE_EVENTS.find((e) => e.id === id);
    if (!found) {
      // If not found, find in feed base
      found = DEMO_FEED_BASE.find((e) => e.id === id);
    }
    return found;
  }, [id]);

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Demo event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="mb-2 text-2xl font-bold">{event.name}</Text>
      <Text className="mb-1 text-base text-neutral-600">{event.location}</Text>
      <Text className="mb-4 text-sm text-neutral-400">
        {event.startDate} {event.startTime ? `at ${event.startTime}` : ""}
      </Text>
      <Text className="text-base text-neutral-800">
        {event.description ?? "No description provided."}
      </Text>

      <View className="mt-8">
        <Button
          title="Finish Onboarding"
          onPress={() => router.replace("/feed")}
        />
      </View>
    </ScrollView>
  );
}
