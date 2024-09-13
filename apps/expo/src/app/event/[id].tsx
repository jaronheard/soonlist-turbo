import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import AutoHeightImage from "react-native-auto-height-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Link,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Globe, Lock, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { EventMenu } from "~/components/EventMenu";
import LoadingSpinner from "~/components/LoadingSpinner";
import ShareButton from "~/components/ShareButton";
import { api } from "~/utils/api";
import { getDateTimeInfo, timeFormatDateInfo } from "~/utils/dates";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const utils = api.useUtils();
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const username = currentUser?.username || "";
  const eventQuery = api.event.get.useQuery({ eventId: id });
  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
      router.replace("/");
    },
  });

  const handleDelete = useCallback(async () => {
    if (id && typeof id === "string") {
      await deleteEventMutation.mutateAsync({ id });
    }
  }, [deleteEventMutation, id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void eventQuery.refetch().then(() => setRefreshing(false));
  }, [eventQuery]);

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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="-mr-4 flex-row items-center gap-2">
          <EventMenu
            event={
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              eventQuery.data as RouterOutputs["event"]["getUpcomingForUser"][number]
            }
            isOwner={eventQuery.data?.userId === currentUser?.id}
            isSaved={
              savedIdsQuery.data?.some(
                (savedEvent) => savedEvent.id === eventQuery.data?.id,
              ) ?? false
            }
            menuType="popup"
            onDelete={handleDelete}
          />
          <ShareButton webPath={`/event/${id}`} />
        </View>
      ),
    });
  }, [
    navigation,
    eventQuery.data,
    savedIdsQuery.data,
    currentUser?.id,
    id,
    handleDelete,
  ]);

  if (!id || typeof id !== "string") {
    return (
      <View className="flex-1 bg-white">
        <Text>Invalid or missing event id</Text>
      </View>
    );
  }

  if (eventQuery.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <LoadingSpinner />
      </View>
    );
  }

  if (!eventQuery.data) {
    return (
      <View className="flex-1 bg-white">
        <Text>Event not found</Text>
      </View>
    );
  }

  const event = eventQuery.data;
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const isCurrentUserEvent = currentUser?.id === event.userId;

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
              asChild
            >
              <Pressable>
                <View className="flex-row items-center">
                  <MapPin size={16} color="#6b7280" />
                  <Text className="ml-1 text-neutral-2">
                    {eventData.location}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )}
          {isCurrentUserEvent ? (
            <View className="flex-row items-center gap-2">
              {event.visibility === "public" ? (
                <Globe size={16} color="#627496" />
              ) : (
                <Lock size={16} color="#627496" />
              )}
              <Text className="text-sm text-neutral-2">
                {event.visibility === "public"
                  ? "Your event is on Discover"
                  : "Your event is unlisted"}
              </Text>
            </View>
          ) : (
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
    </ScrollView>
  );
}
