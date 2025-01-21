import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

import { DEMO_CAPTURE_EVENTS } from "./demoData";

export default function DemoCaptureScreen() {
  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Text className="mb-4 text-center text-2xl font-bold">
        Pick an event to capture
      </Text>
      <Text className="mb-6 text-center text-base text-neutral-600">
        This is a quick demo of how Soonlist captures events. Select any event
        below:
      </Text>

      {DEMO_CAPTURE_EVENTS.map((event) => (
        <TouchableOpacity
          key={event.id}
          onPress={() =>
            router.push(`/onboarding/demo-feed?eventId=${event.id}`)
          }
          className="mb-4 rounded-lg bg-interactive-2 p-4"
        >
          <Text className="text-lg font-semibold text-neutral-900">
            {event.name}
          </Text>
          <Text className="text-sm text-neutral-700">{event.location}</Text>
        </TouchableOpacity>
      ))}

      <Text className="mt-8 text-center text-sm text-neutral-500">
        This feed is just a demo. Your real events will appear after onboarding.
      </Text>
    </ScrollView>
  );
}
