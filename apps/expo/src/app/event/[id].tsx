import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import { api } from "~/utils/api";

export default function Page() {
  const { id } = useLocalSearchParams();
  if (!id) {
    return <Text>No event id found</Text>;
  }
  if (typeof id !== "string") {
    return <Text>Invalid event id</Text>;
  }
  const eventQuery = api.event.get.useQuery({
    eventId: id,
  });

  // display event
  if (!eventQuery.data) {
    return <Text>Event not found</Text>;
  }

  const event = eventQuery.data;
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text>Event: {eventData.name}</Text>
      <Text>Description: {eventData.description}</Text>
      <Text>Start Date: {eventData.startDate}</Text>
      <Text>Start Time: {eventData.startTime}</Text>
      <Text>End Date: {eventData.endDate}</Text>
      <Text>End Time: {eventData.endTime}</Text>
      <Text>Time Zone: {eventData.timeZone}</Text>
      <Text>Location: {eventData.location}</Text>
    </View>
  );
}
