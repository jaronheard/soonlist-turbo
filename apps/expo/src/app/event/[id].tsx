import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AutoHeightImage from "react-native-auto-height-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Edit, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import LoadingSpinner from "~/components/LoadingSpinner";
import ShareButton from "~/components/ShareButton";
import { api } from "~/utils/api";
import { getDateTimeInfo, timeFormatDateInfo } from "~/utils/dates";

export default function Page() {
  const { width } = Dimensions.get("window");
  const { id } = useLocalSearchParams();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (imageLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim, imageLoaded]);

  if (!id || typeof id !== "string") {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Event" }} />
        <Text>Invalid or missing event id</Text>
      </View>
    );
  }

  const eventQuery = api.event.get.useQuery({ eventId: id });

  if (eventQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Event" }} />
        <LoadingSpinner />
      </View>
    );
  }

  if (!eventQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen options={{ title: "Event" }} />
        <Text>Event not found</Text>
      </View>
    );
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
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 36,
      }}
    >
      <Stack.Screen
        options={{
          title: "Event",
          headerRight: () => (
            <View className="-mr-2 flex-row items-center gap-1">
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `${process.env.EXPO_PUBLIC_API_BASE_URL}/event/${id}/edit`,
                  )
                }
              >
                <View className="rounded-full p-2">
                  <Edit size={24} color="#5A32FB" />
                </View>
              </TouchableOpacity>
              <ShareButton webPath={`/event/${id}`} />
            </View>
          ),
        }}
      />
      {!id || typeof id !== "string" ? (
        <Text>Invalid or missing event id</Text>
      ) : (
        <View className="p-4">
          <View className="flex flex-col gap-5">
            <View>
              <Text className="text-lg text-neutral-2">{date}</Text>
              <Text className="text-lg text-neutral-2">{time}</Text>
            </View>
            <Text className="font-heading text-4xl font-bold text-neutral-1">
              {eventData.name}
            </Text>
            {eventData.location && (
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.location)}`}
              >
                <View className="flex-row items-center">
                  <MapPin size={16} color="#6b7280" />
                  <Text className="ml-1 text-neutral-2">
                    {eventData.location}
                  </Text>
                </View>
              </Link>
            )}
            {event.user && (
              <View className="flex-row items-center gap-2">
                {event.user.userImage ? (
                  <Image
                    source={{ uri: event.user.userImage }}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <User size={20} color="#627496" />
                )}
                <Text className="text-sm text-neutral-2">
                  @{event.user.username}
                </Text>
              </View>
            )}
          </View>
          <View className="my-8">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>
          {eventData.images?.[3] && (
            <View className="mb-4">
              {!imageLoaded && (
                <Animated.View
                  style={{
                    width: width - 32,
                    height: 400,
                    backgroundColor: "#DCE0E8",
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  }}
                />
              )}
              <Animated.View
                style={{
                  opacity: fadeAnim,
                }}
              >
                <AutoHeightImage
                  source={{ uri: eventData.images[3] }}
                  width={width - 32}
                  onLoad={() => setImageLoaded(true)}
                />
              </Animated.View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
