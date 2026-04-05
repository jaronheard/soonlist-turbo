import type { ImageSource } from "expo-image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";

import type { Event } from "~/components/UserEventsList";
import { PlusIcon } from "~/components/icons";
import { QuestionContainer } from "~/components/QuestionContainer";
import { UserEventListItem } from "~/components/UserEventsList";
import { useOnboarding } from "~/hooks/useOnboarding";
import { usePendingFollowUsername } from "~/store";
import {
  hapticHeavy,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "~/utils/feedback";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const lloydMallCrawlImage: ImageSource = require("../../../assets/demo-lloyd-mall-crawl.webp");

type Phase = "screenshot" | "parsing" | "result";

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
// this is synthetic data that doesn't come from the backend. Dates are
// generated relative to today so the demo never shows as a past event.
function getDemoEvent(): Event {
  const today = new Date();
  const demoDay = new Date(today);
  demoDay.setDate(demoDay.getDate() + 7);
  const year = demoDay.getFullYear();
  const month = String(demoDay.getMonth() + 1).padStart(2, "0");
  const day = String(demoDay.getDate()).padStart(2, "0");
  const startDate = `${year}-${month}-${day}`;
  const startDateTime = new Date(`${startDate}T12:00:00`).toISOString();
  const endDateTime = new Date(`${startDate}T17:00:00`).toISOString();

  return {
    _id: "demo-1",
    _creationTime: Date.now(),
    id: "demo-1",
    userId: "demo-user",
    userName: "demo",
    event: {
      name: "Lloyd Mall Crawl",
      startDate,
      endDate: startDate,
      startTime: "12:00",
      endTime: "17:00",
      timeZone: "America/Los_Angeles",
      location: "Lloyd Center",
      description:
        "A mall crawl featuring local shops, organizations, nerdy fun, and family activities. Attendees can expect deals, games, art, food, and animals.",

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
    startDate,
    endDate: startDate,
    startTime: "12:00",
    endTime: "17:00",
    timeZone: "America/Los_Angeles",
    description:
      "A mall crawl featuring local shops, organizations, nerdy fun, and family activities. Attendees can expect deals, games, art, food, and animals.",
    startDateTime,
    endDateTime,
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
}

export default function TryItScreen() {
  const [phase, setPhase] = useState<Phase>("screenshot");
  const { saveStep } = useOnboarding();
  const pendingFollowUsername = usePendingFollowUsername();
  const demoEvent = useMemo(() => getDemoEvent(), []);

  const totalSteps = pendingFollowUsername ? 7 : 6;

  // Escalating haptic pattern during "capturing" phase
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCapturingHaptics = useCallback(() => {
    let step = 0;
    const styles = [
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Heavy,
      Haptics.ImpactFeedbackStyle.Heavy,
    ];
    hapticIntervalRef.current = setInterval(() => {
      const style = styles[Math.min(step, styles.length - 1)];
      if (style !== undefined) {
        void Haptics.impactAsync(style);
      }
      step++;
    }, 250);
  }, []);

  const stopCapturingHaptics = useCallback(() => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => stopCapturingHaptics();
  }, [stopCapturingHaptics]);

  const handleCapture = useCallback(() => {
    void hapticMedium();
    setPhase("parsing");
    startCapturingHaptics();
    setTimeout(() => {
      stopCapturingHaptics();
      void hapticHeavy();
      setTimeout(() => void hapticSuccess(), 100);
      setPhase("result");
    }, 1500);
  }, [startCapturingHaptics, stopCapturingHaptics]);

  const handleContinue = () => {
    void hapticLight();
    saveStep("tryIt", {}, "/(onboarding)/onboarding/02-your-list");
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
      <View className="flex-1 justify-between">
        {phase === "parsing" ? (
          <ParsingAnimation />
        ) : phase === "result" ? (
          <Animated.View
            entering={FadeIn.duration(500)}
            className="-mx-2 flex-1 justify-center"
          >
            <UserEventListItem
              event={demoEvent}
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
              className="rounded-full bg-white py-4 active:scale-[0.98] active:bg-neutral-100"
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
          <Animated.View
            entering={FadeIn.delay(500).duration(300)}
            className="mt-4"
          >
            <Pressable
              onPress={handleContinue}
              className="rounded-full bg-white py-4 active:scale-[0.98] active:bg-neutral-100"
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
