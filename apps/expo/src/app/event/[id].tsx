import {
  Dimensions,
  Linking,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AutoHeightImage from "react-native-auto-height-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Edit, MapPin, ShareIcon } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import { api } from "~/utils/api";
import { getDateTimeInfo, timeFormatDateInfo } from "~/utils/dates";

export default function Page() {
  const { width } = Dimensions.get("window");
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
  const formatDate = (date: string, startTime?: string, endTime?: string) => {
    const startDateInfo = getDateTimeInfo(
      date,
      startTime || "",
      eventData.timeZone || "",
    );
    if (!startDateInfo) return { date: "", time: "" };

    const formattedDate = `${startDateInfo.dayOfWeek}, ${startDateInfo.monthName} ${startDateInfo.day}`;
    const formattedStartTime = startTime
      ? timeFormatDateInfo(startDateInfo)
      : "";
    const formattedEndTime = endTime
      ? timeFormatDateInfo(
          getDateTimeInfo(date, endTime, eventData.timeZone || "") ||
            startDateInfo,
        )
      : "";

    const timeRange =
      startTime && endTime
        ? `${formattedStartTime} - ${formattedEndTime}`
        : formattedStartTime;
    return { date: formattedDate, time: timeRange.trim() };
  };

  const { date, time } = formatDate(
    eventData.startDate || "",
    eventData.startTime,
    eventData.endTime,
  );

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: "Event Details",
          headerRight: () => (
            <View className="flex-row">
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `${process.env.EXPO_PUBLIC_API_BASE_URL}/event/${id}/edit`,
                  )
                }
              >
                <Edit size={24} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const shareUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/event/${id}`;
                  try {
                    await Share.share({
                      message: shareUrl,
                      url: shareUrl,
                    });
                  } catch (error) {
                    console.error("Error sharing:", error);
                  }
                }}
                className="ml-4"
              >
                <ShareIcon size={24} color="#5A32FB" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <View className="p-4">
        <View className="flex flex-col gap-5">
          <View>
            <Text className="text-lg text-gray-500">{date}</Text>
            <Text className="text-lg text-gray-500">{time}</Text>
          </View>
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
          <AutoHeightImage
            source={{ uri: eventData.images[3] }}
            width={width - 32}
          />
        )}
      </View>
    </ScrollView>
  );
}
