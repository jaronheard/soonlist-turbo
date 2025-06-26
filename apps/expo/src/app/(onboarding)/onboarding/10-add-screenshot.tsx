import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import UserEventsList from "~/components/UserEventsList";
import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { FlatList } from "react-native";


// Ghost event component that matches UserEventListItem styling exactly
function GhostEvent({ title, subtitle, emoji, index }: { title: string; subtitle: string; emoji: string; index: number }) {
  const imageWidth = 90;
  const imageHeight = (imageWidth * 16) / 9;
  const imageRotation = index % 2 === 0 ? "10deg" : "-10deg";
  
  return (
    <View className="relative mb-6 px-4 opacity-30">
      {/* Fake image placeholder */}
      <View
        style={{
          position: "absolute",
          right: 10,
          top: -5,
          zIndex: 10,
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 1.5,
          elevation: 3,
          transform: [{ rotate: imageRotation }],
          backgroundColor: "transparent",
        }}
      >
        <View
          className="bg-accent-purple/20"
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: "white",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        </View>
      </View>
      
      {/* Event card */}
      <View 
        className="my-1 mt-4 p-3"
        style={{
          paddingRight: imageWidth * 1.1,
          borderRadius: 20,
          borderWidth: 3,
          borderColor: "white",
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2.5,
          elevation: 2,
          backgroundColor: "white",
        }}
      >
        <View className="mb-1">
          <Text className="text-sm font-medium text-neutral-2">
            {subtitle}
          </Text>
        </View>
        <Text className="mb-1 text-lg font-bold text-neutral-1" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-sm text-neutral-2" numberOfLines={1}>
          San Francisco, CA
        </Text>
      </View>
    </View>
  );
}

export default function AddScreenshotScreen() {
  const { user } = useUser();
  const [hasAddedEvent, setHasAddedEvent] = useState(false);
  const [initialEventCount, setInitialEventCount] = useState<number | null>(null);
  const stableTimestamp = useStableTimestamp();
  
  // Query for user's events (similar to feed)
  const queryArgs = useMemo(() => {
    if (!user?.username) return "skip";
    return {
      userName: user.username,
      filter: "upcoming" as const,
      beforeThisDateTime: stableTimestamp,
    };
  }, [user?.username, stableTimestamp]);

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.events.getEventsForUserPaginated, queryArgs, {
    initialNumItems: 5,
  });

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(5);
    }
  }, [status, loadMore]);

  // Track initial event count
  useEffect(() => {
    if (initialEventCount === null && events.length >= 0) {
      setInitialEventCount(events.length);
    }
  }, [events.length, initialEventCount]);

  // Listen for new events being added
  useEffect(() => {
    if (initialEventCount !== null && events.length > initialEventCount && !hasAddedEvent) {
      setHasAddedEvent(true);
      toast.success("Event saved!");
    }
  }, [events.length, initialEventCount, hasAddedEvent]);

  const handleContinue = () => {
    router.push("/(onboarding)/onboarding/11-success");
  };


  // Ghost events data that look like real events
  const ghostEvents = [
    { title: "Concert at The Fillmore", subtitle: "Sat, Dec 28 • 8:00 PM", emoji: "🎸" },
    { title: "Art Gallery Opening", subtitle: "Thu, Jan 2 • 6:00 PM", emoji: "🎨" }, 
    { title: "Comedy Show Tonight", subtitle: "Fri, Jan 3 • 9:00 PM", emoji: "😂" },
    { title: "Food Festival Weekend", subtitle: "Sat, Jan 4 • 11:00 AM", emoji: "🍔" },
  ];

  return (
    <QuestionContainer
      question={hasAddedEvent ? "Event saved!" : "Add it to your Soonlist"}
      subtitle={hasAddedEvent ? "Your event has been added" : "Tap + to add the event screenshot"}
      currentStep={10}
      totalSteps={TOTAL_ONBOARDING_STEPS}
      safeAreaEdges={["top", "left", "right"]}
    >
      <View className="flex-1 bg-white" style={{ marginHorizontal: -24 }}>
        <View className="flex-1">
          {events.length === 0 && !hasAddedEvent ? (
            // Empty state with ghost events
            <FlatList
              data={ghostEvents}
              keyExtractor={(item, index) => `ghost-${index}`}
              renderItem={({ item, index }) => <GhostEvent title={item.title} subtitle={item.subtitle} emoji={item.emoji} index={index} />}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 200 }}
              style={{ backgroundColor: "#F4F1FF" }}
            />
          ) : (
            // Show real events list
            <UserEventsList
              events={events}
              onEndReached={handleLoadMore}
              isFetchingNextPage={status === "LoadingMore"}
              showCreator="never"
              stats={undefined}
            />
          )}
        </View>

          {/* Add button - no pulsing, just like feed */}
          {!hasAddedEvent && (
            <AddEventButton stats={undefined} showChevron={false} />
          )}

          {/* Bottom section after event is added */}
          {hasAddedEvent && (
            <Animated.View 
              entering={FadeIn.delay(300).duration(600)}
              className="px-6 pb-8"
            >
              <View className="p-6 bg-white/10 rounded-2xl mb-4">
                <Text className="text-white text-center">
                  You have 47 screenshots that might be events – let's organize them all!
                </Text>
              </View>
              
              <Pressable
                onPress={handleContinue}
                className="bg-white py-4 rounded-full"
              >
                <Text className="text-interactive-1 text-center font-semibold text-lg">
                  Continue
                </Text>
              </Pressable>
            </Animated.View>
          )}

      </View>
    </QuestionContainer>
  );
}