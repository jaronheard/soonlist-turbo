import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  FadeIn,
  SlideInUp,
  SlideOutUp,
} from "react-native-reanimated";

import type { Event } from "~/components/UserEventsList";
import { PlusIcon } from "~/components/icons";
import { NotificationBanner } from "~/components/NotificationBanner";
import { QuestionContainer } from "~/components/QuestionContainer";
import { UserEventListItem } from "~/components/UserEventsList";
import { useOnboarding } from "~/hooks/useOnboarding";
import { usePendingFollowUsername } from "~/store";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const lloydMallCrawlImage = require("../../../assets/demo-lloyd-mall-crawl.webp");

type Phase = "screenshot" | "parsing" | "result" | "notification";

function SampleScreenshot() {
  return (
    <View className="mx-4 flex-1 overflow-hidden rounded-2xl">
      <ExpoImage
        source={lloydMallCrawlImage}
        style={{ flex: 1 }}
        contentFit="cover"
      />
    </View>
  );
}

function ParsingAnimation() {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="flex-1 items-center justify-center"
    >
      <ActivityIndicator size="large" color="white" />
      <Text className="mt-4 text-lg font-medium text-white">Capturing</Text>
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
    name: "Lloyd Mall Crawl",
    startDate: "2026-07-12",
    endDate: "2026-07-12",
    startTime: "12:00",
    endTime: "17:00",
    timeZone: "America/Los_Angeles",
    location: "Lloyd Center",
    description: "A mall crawl featuring local shops, organizations, nerdy fun, and family activities. Attendees can expect deals, games, art, food, and animals.",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    images: [null, null, null, lloydMallCrawlImage],
  },
  eventMetadata: {
    category: "community",
    type: "social",
    source: "Instagram",
  },
  name: "Lloyd Mall Crawl",
  image: null,
  location: "Lloyd Center",
  startDate: "2026-07-12",
  endDate: "2026-07-12",
  startTime: "12:00",
  endTime: "17:00",
  timeZone: "America/Los_Angeles",
  description: "A mall crawl featuring local shops, organizations, nerdy fun, and family activities. Attendees can expect deals, games, art, food, and animals.",
  startDateTime: "2026-07-12T19:00:00.000Z",
  endDateTime: "2026-07-13T00:00:00.000Z",
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

function FakeNotificationBanner({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Animated.View
      entering={SlideInUp.duration(400)}
      exiting={SlideOutUp.duration(300)}
      className="absolute left-0 right-0 top-0 z-50"
    >
      <NotificationBanner
        title="Soonlist"
        subtitle="Lloyd Mall Crawl saved!"
        body="Sat, Jul 12 at 12:00 PM"
        onPress={onDismiss}
      />
    </Animated.View>
  );
}

export default function TryItScreen() {
  const [phase, setPhase] = useState<Phase>("screenshot");
  const { saveStep } = useOnboarding();
  const pendingFollowUsername = usePendingFollowUsername();
  const [showNotification, setShowNotification] = useState(false);

  const totalSteps = pendingFollowUsername ? 6 : 5;

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
            : "Capture any event"
      }
      subtitle={
        phase === "result"
          ? "Screenshots become organized events, automatically"
          : phase === "parsing"
            ? undefined
            : "Screenshots, pictures of flyers, and links"
      }
      currentStep={1}
      totalSteps={totalSteps}
    >
      {showNotification && (
        <FakeNotificationBanner onDismiss={handleDismissNotification} />
      )}

      <View className="flex-1 justify-between">
        {phase === "parsing" ? (
          <ParsingAnimation />
        ) : phase === "result" ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            className="-mx-2 flex-1 justify-center"
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
            <SampleScreenshot />
          </View>
        )}

        {phase === "screenshot" && (
          <Animated.View entering={FadeIn.duration(300)} className="mt-4">
            <Pressable
              onPress={handleCapture}
              className="rounded-full bg-white py-4"
            >
              <View className="flex-row items-center justify-center">
                <PlusIcon size={24} color="#5A32FB" strokeWidth={2} />
                <Text className="ml-1 text-lg font-semibold text-interactive-1">
                  Capture this event
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {phase === "result" && (
          <Animated.View entering={FadeIn.delay(500).duration(300)} className="mt-4">
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
