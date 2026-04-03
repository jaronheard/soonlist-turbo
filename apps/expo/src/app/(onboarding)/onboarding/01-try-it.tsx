import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  SlideInUp,
  SlideOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { Event } from "~/components/UserEventsList";
import { QuestionContainer } from "~/components/QuestionContainer";
import { UserEventListItem } from "~/components/UserEventsList";
import { useOnboarding } from "~/hooks/useOnboarding";
import { usePendingFollowUsername } from "~/store";

interface SampleEvent {
  name: string;
  location: string;
  date: string;
  time: string;
  source: string;
}

const DEFAULT_EVENT: SampleEvent = {
  name: "Rooftop Sunset DJ Set",
  location: "The Hoxton, Portland",
  date: "Sat, Mar 22",
  time: "6:00 PM",
  source: "Instagram Story",
};

type Phase = "screenshot" | "parsing" | "result" | "notification";

function SampleScreenshot({ event }: { event: SampleEvent }) {
  return (
    <View className="mx-4 overflow-hidden rounded-2xl bg-white">
      <View className="bg-interactive-1 px-6 py-8">
        <Text className="text-center text-2xl font-bold text-white">
          {event.name}
        </Text>
        <Text className="mt-2 text-center text-lg text-white/80">
          {event.date}
        </Text>
      </View>
      <View className="px-6 py-4">
        <Text className="text-base text-gray-600">{event.time}</Text>
        <Text className="mt-1 text-base text-gray-600">{event.location}</Text>
        <Text className="mt-3 text-sm italic text-gray-400">
          Spotted on {event.source}
        </Text>
      </View>
    </View>
  );
}

function ParsingAnimation() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
      ),
      -1,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 items-center justify-center"
    >
      <Animated.View
        style={animatedStyle}
        className="h-20 w-20 items-center justify-center rounded-full bg-white/20"
      >
        <Text className="text-4xl">{"✨"}</Text>
      </Animated.View>
      <Text className="mt-4 text-lg font-medium text-white">
        Parsing your event...
      </Text>
      <Text className="mt-1 text-sm text-white/60">
        AI is reading the details
      </Text>
    </Animated.View>
  );
}

// Demo event data for the onboarding try-it flow. Cast as Event since
// this is synthetic data that doesn't come from the backend.
const DEMO_EVENT = {
  _id: "demo-1",
  _creationTime: Date.now(),
  id: "demo-1",
  userId: "demo-user",
  userName: "demo",
  event: {
    name: "Rooftop Sunset DJ Set",
    startDate: "2026-03-22",
    endDate: "2026-03-22",
    startTime: "18:00",
    endTime: "22:00",
    timeZone: "America/Los_Angeles",
    location: "The Hoxton, Portland",
    description: "Sunset vibes with live DJ sets on the rooftop",
    images: [],
  },
  eventMetadata: {
    category: "music",
    type: "social",
    source: "Instagram Story",
  },
  name: "Rooftop Sunset DJ Set",
  image: null,
  location: "The Hoxton, Portland",
  startDate: "2026-03-22",
  endDate: "2026-03-22",
  startTime: "18:00",
  endTime: "22:00",
  timeZone: "America/Los_Angeles",
  description: "Sunset vibes with live DJ sets on the rooftop",
  startDateTime: "2026-03-22T18:00:00-07:00",
  endDateTime: "2026-03-22T22:00:00-07:00",
  visibility: "public" as const,
  created_at: new Date().toISOString(),
  updatedAt: null,
  user: {
    id: "demo-user",
    username: "demouser",
    displayName: "You",
    userImage: "",
  },
  eventFollows: [],
  comments: [],
  eventToLists: [],
  lists: [],
} as unknown as Event;

function FakeNotificationBanner({
  event,
  onDismiss,
}: {
  event: SampleEvent;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Animated.View
      entering={SlideInUp.duration(400)}
      exiting={SlideOutUp.duration(300)}
      className="absolute left-4 right-4 top-16 z-50"
    >
      <View
        className="flex-row items-center rounded-2xl bg-white px-4 py-3"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-interactive-1">
          <Text className="text-lg font-bold text-white">S</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-500">Soonlist</Text>
          <Text className="text-sm font-medium text-gray-900">
            {event.name} saved!
          </Text>
          <Text className="text-xs text-gray-500">
            {event.date} at {event.time}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function TryItScreen() {
  const [phase, setPhase] = useState<Phase>("screenshot");
  const { saveStep } = useOnboarding();
  const pendingFollowUsername = usePendingFollowUsername();
  const [showNotification, setShowNotification] = useState(false);

  const totalSteps = pendingFollowUsername ? 6 : 5;
  const event = DEFAULT_EVENT;

  const handleCapture = useCallback(() => {
    setPhase("parsing");
    setTimeout(() => {
      setPhase("result");
      // Show fake notification after a brief delay
      setTimeout(() => {
        setShowNotification(true);
      }, 800);
    }, 1500);
  }, []);

  const handleDismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  const handleContinue = () => {
    saveStep(
      "tryIt",
      {},
      "/(onboarding)/onboarding/02-your-list",
    );
  };

  return (
    <QuestionContainer
      question={
        phase === "result"
          ? "That's it!"
          : phase === "parsing"
            ? "Capturing..."
            : "Capture any event screenshot"
      }
      subtitle={
        phase === "result"
          ? "Screenshots become organized events, automatically"
          : phase === "parsing"
            ? undefined
            : "We'll do the rest"
      }
      currentStep={1}
      totalSteps={totalSteps}
    >
      {showNotification && (
        <FakeNotificationBanner
          event={event}
          onDismiss={handleDismissNotification}
        />
      )}

      <View className="flex-1 justify-between">
        {phase === "parsing" ? (
          <ParsingAnimation />
        ) : phase === "result" ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            className="flex-1 justify-center"
          >
            <UserEventListItem
              event={DEMO_EVENT}
              showCreator="never"
              isSaved={false}
              demoMode={true}
              index={0}
            />
          </Animated.View>
        ) : (
          <View className="flex-1 justify-center">
            <SampleScreenshot event={event} />
          </View>
        )}

        {phase === "screenshot" && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable
              onPress={handleCapture}
              className="rounded-full bg-white py-4"
            >
              <Text className="text-center text-lg font-semibold text-interactive-1">
                {"📸"} Capture this event
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === "result" && (
          <Animated.View entering={FadeIn.delay(500).duration(300)}>
            <Pressable
              onPress={handleContinue}
              className="rounded-full bg-white py-4"
            >
              <Text className="text-center text-lg font-semibold text-interactive-1">
                Continue
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </QuestionContainer>
  );
}
