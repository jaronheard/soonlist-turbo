import { Image, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { MapPin } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import { api } from "~/utils/api";

export default function Page() {
  const { id } = useLocalSearchParams();
  if (!id || typeof id !== "string") {
    return <Text>Invalid or missing event id</Text>;
  }

  const eventQuery = api.event.get.useQuery({ eventId: id });

  if (eventQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text>Loading event...</Text>
      </View>
    );
  }

  if (!eventQuery.data) {
    return <Text>Event not found</Text>;
  }

  const event = eventQuery.data;
  const eventData = event.event as AddToCalendarButtonPropsRestricted;

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex flex-col gap-5">
        <Text className="text-lg text-gray-500">
          {eventData.startDate} {eventData.startTime} - {eventData.endTime}
        </Text>
        <Text className="font-heading text-4xl font-bold">
          {eventData.name}
        </Text>
        {eventData.location && (
          <Link
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.location)}`}
          >
            <View className="flex-row items-center">
              <MapPin size={16} color="#6b7280" />
              <Text className="ml-1 text-gray-500">{eventData.location}</Text>
            </View>
          </Link>
        )}
      </View>
      <View className="mt-8">
        <Text>{eventData.description}</Text>
      </View>
      {eventData.images?.[3] && (
        <Image
          source={{ uri: eventData.images[3] }}
          className="mt-8 h-64 w-full object-contain"
          resizeMode="contain"
        />
      )}
    </View>
  );
}
