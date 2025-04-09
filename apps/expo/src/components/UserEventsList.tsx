import type { ImageSource } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
import { MapPin, PlusCircle } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { formatEventDateRange } from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { logError } from "../utils/errorLogging";
import { EventListItemSkeleton } from "./EventListItemSkeleton";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";

type Event = RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];

interface ActionButtonProps {
  event: Event;
}

interface PromoCardProps {
  type: "addEvents";
}

interface UserEventListItemProps {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  isSaved: boolean;
  demoMode?: boolean;
  itemWidth: number;
}

export function UserEventListItem(props: UserEventListItemProps) {
  const { event, isSaved, demoMode, itemWidth } = props;
  const { fontScale } = useWindowDimensions();
  const id = event.id;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const e = event.event as AddToCalendarButtonPropsRestricted;

  const dateString = formatEventDateRange(
    e.startDate || "",
    e.startTime,
    e.endTime,
    e.timeZone || "",
  );

  const { user: currentUser } = useUser();
  const isOwner = demoMode || currentUser?.id === event.userId;

  const iconSize = 14 * fontScale;
  const imageHeight = itemWidth * (16 / 9);

  // Use the first image, or a fallback if none exist
  const mainImageUri = e.images?.[0]
    ? `${e.images[0]}?w=${Math.round(itemWidth * 2)}&h=${Math.round(imageHeight * 2)}&fit=cover&f=webp&q=80`
    : null;

  return (
    <View style={{ width: itemWidth }} className="mx-1.5 mb-3">
      <EventMenu
        event={event}
        isOwner={isOwner}
        isSaved={isSaved}
        menuType="context"
        demoMode={demoMode}
      >
        <Pressable
          onPress={() => {
            // Short press → navigate
            const isDemoEvent = id.startsWith("demo-");
            if (isDemoEvent) {
              router.push(`/onboarding/demo-event/${id}`);
            } else {
              router.push(`/event/${id}`);
            }
          }}
          onLongPress={(e) => {
            // Long press → stop native press so menu can open without navigation
            e.stopPropagation();
          }}
          delayLongPress={350}
          className="overflow-hidden rounded-xl border-4 border-interactive-3"
        >
          <View
            className="relative"
            style={{ width: itemWidth, height: imageHeight }}
          >
            {/* Background Image */}
            {mainImageUri ? (
              <Image
                source={{ uri: mainImageUri }}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                }}
                contentFit="cover"
                cachePolicy="disk"
                transition={100}
              />
            ) : (
              // Simple fallback background
              <View className="absolute h-full w-full bg-neutral-3" />
            )}

            {/* Simplified Overlay Content at the bottom */}
            <View className="absolute bottom-0 left-0 right-0 bg-interactive-3 p-2">
              {/* Text color updated */}
              <Text
                className="text-sm font-semibold text-black"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {dateString.date}
              </Text>
              <Text
                className="text-sm font-semibold text-black"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {dateString.time}
              </Text>
              {e.location ? (
                <View className="flex-shrink flex-row items-center gap-1">
                  {/* Icon color updated */}
                  <MapPin size={iconSize * 0.9} color="black" />
                  {/* Text color updated */}
                  <Text
                    className="text-xs text-black"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {e.location}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </EventMenu>
    </View>
  );
}

function PromoCard({ type }: PromoCardProps) {
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const handlePress = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      useAppStore.setState({
        hasMediaPermission: status === MediaLibrary.PermissionStatus.GRANTED,
      });
    } catch (error) {
      logError("Error requesting media permissions", error);
    }
    router.push("/new");
  };

  if (type === "addEvents") {
    return (
      <TouchableOpacity onPress={handlePress}>
        <View className="mx-4 rounded-2xl bg-accent-yellow/80 p-4">
          <Text className="mb-1 text-lg font-semibold text-neutral-1">
            Add more events
          </Text>
          <View className="flex-row items-center">
            <Text className="text-base text-neutral-2">
              Tap the{" "}
              <PlusCircle size={iconSize} color="#4B5563" className="-mb-0.5" />{" "}
              button below to add more.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}

interface UserEventsListProps {
  events: Event[];
  isRefetching: boolean;
  onRefresh: () => Promise<void>;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  stats?: {
    capturesThisWeek: number;
    weeklyGoal: number;
    upcomingEvents: number;
    allTimeEvents: number;
  };
  promoCard?: PromoCardProps;
  demoMode?: boolean;
  hasUnlimited?: boolean;
}

export default function UserEventsList(props: UserEventsListProps) {
  const {
    events,
    isRefetching,
    onRefresh,
    onEndReached,
    isFetchingNextPage,
    stats,
    promoCard,
    demoMode,
    hasUnlimited = false,
  } = props;
  const { user } = useUser();
  const queryClient = useQueryClient();
  const username = user?.username || "";
  const { width: screenWidth } = useWindowDimensions();

  const numColumns = 2;
  const listPadding = 6;
  const itemMargin = 6;
  const totalHorizontalSpacing =
    listPadding * 2 + itemMargin * 2 * (numColumns - 1);
  const itemWidth = (screenWidth - totalHorizontalSpacing) / numColumns;

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  const collapsedEvents = collapseSimilarEvents(events, user?.id);

  const pendingAIMutations = useMutationState(
    {
      filters: {
        mutationKey: [["ai"]],
      },
      select: (mutation) => mutation.state.status,
    },
    queryClient,
  );
  const isAddingEvent =
    pendingAIMutations.filter((mutation) => mutation === "pending").length > 0;

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      logError("Error presenting Intercom", error);
    }
  };

  const renderEmptyState = () => {
    if ((isAddingEvent || isRefetching) && collapsedEvents.length === 0) {
      return (
        <View className="flex-1">
          <EventListItemSkeleton />
        </View>
      );
    }

    if (!hasUnlimited) {
      return (
        <View className="flex-1 items-center justify-center px-6">
          <Image
            source={require("../assets/icon.png") as ImageSource}
            style={{
              width: 64,
              height: 64,
              marginBottom: 16,
              borderRadius: 8,
            }}
            contentFit="contain"
            cachePolicy="disk"
            transition={100}
          />
          <Text className="mb-2 rounded-lg text-center text-2xl font-bold text-neutral-1">
            Try free now
          </Text>
          <Pressable
            className="mb-4 text-center text-base text-neutral-2"
            onPress={presentIntercom}
          >
            <Text className="text-neutral-2">
              Funds an issue?{" "}
              <Text className="text-interactive-1">Message us</Text>
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("../assets/icon.png") as ImageSource}
          style={{
            width: 64,
            height: 64,
            marginBottom: 16,
            borderRadius: 8,
          }}
          contentFit="contain"
          cachePolicy="disk"
          transition={100}
        />
        <Text className="mb-2 rounded-lg text-center text-2xl font-bold text-neutral-1">
          Save events instantly
        </Text>
        <Text className="text-center text-base text-neutral-2">
          Tap the plus button to add your first event.
        </Text>
      </View>
    );
  };

  const renderFooter = () => (
    <>
      {isFetchingNextPage ? (
        <View className="py-4">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      ) : null}
      {events.length >= 1 && promoCard ? (
        <View className="mb-4 mt-2">
          <PromoCard {...promoCard} />
        </View>
      ) : null}
    </>
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isRefetching && isRefreshing) {
      setIsRefreshing(false);
    }
  }, [isRefetching, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
  };

  const renderHeader = () => (stats ? <EventStats {...stats} /> : null);

  return (
    <>
      <FlatList
        data={collapsedEvents}
        numColumns={numColumns}
        keyExtractor={(item) => item.event.id}
        columnWrapperStyle={{ justifyContent: "flex-start" }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index: _index }) => {
          const isSaved =
            savedIdsQuery.data?.some(
              (savedEvent) => savedEvent.id === item.event.id,
            ) ?? false;

          return (
            <UserEventListItem
              event={item.event}
              isSaved={isSaved}
              demoMode={demoMode}
              itemWidth={itemWidth}
            />
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#5A32FB"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{
          paddingBottom: 120,
          flexGrow: collapsedEvents.length === 0 ? 1 : 0,
          paddingTop: 10,
          paddingHorizontal: listPadding,
        }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
