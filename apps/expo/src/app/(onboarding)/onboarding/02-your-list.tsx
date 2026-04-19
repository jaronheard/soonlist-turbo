import type { ImageSource } from "expo-image";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import type { EventWithSimilarity } from "~/utils/similarEvents";
import {
  EventDetailSticker,
  SubscribeSticker,
} from "~/components/onboarding-stickers";
import { QuestionContainer } from "~/components/QuestionContainer";
import UserEventsList from "~/components/UserEventsList";
import { useOnboarding } from "~/hooks/useOnboarding";
import { usePendingFollowUsername } from "~/store";
import { hapticLight, hapticMedium } from "~/utils/feedback";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const lloydMallCrawlImage: ImageSource = require("../../../assets/demo-lloyd-mall-crawl.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const jamieXxImage: ImageSource = require("../../../assets/demo-jamie-xx.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const sharpieSmileImage: ImageSource = require("../../../assets/demo-sharpie-smile.webp");

// Demo curator handle used on screen 02's fake URL bar. Chosen to match
// the Portland-area demo events (Lloyd Center, Pioneer Courthouse Square).
const DEMO_CURATOR_HANDLE = "soonlist.com/portland";

function makeDemoEvent(
  id: string,
  name: string,
  startDate: string,
  startTime: string,
  endTime: string,
  location: string,
  category: string,
  image?: ImageSource,
): EventWithSimilarity {
  const startDateTime = `${startDate}T${startTime}:00`;
  const endDateTime = `${startDate}T${endTime}:00`;
  // Demo events use mock data that doesn't fully match Convex branded types
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    event: {
      _id: id,
      _creationTime: Date.now(),
      id,
      userId: "demo-user",
      userName: "you",
      event: {
        name,
        startDate,
        endDate: startDate,
        startTime,
        endTime,
        timeZone: "America/Los_Angeles",
        location,
        images: image ? [null, null, null, image] : [],
      },
      eventMetadata: { category },
      name,
      image: null,
      location,
      startDate,
      endDate: startDate,
      startTime,
      endTime,
      timeZone: "America/Los_Angeles",
      startDateTime,
      endDateTime,
      visibility: "public",
      created_at: new Date().toISOString(),
      updatedAt: null,
      user: {
        id: "demo-user",
        username: "you",
        displayName: "You",
        userImage: null,
      },
      eventFollows: [],
      comments: [],
      eventToLists: [],
      lists: [],
    },
    similarEvents: [],
  } as unknown as EventWithSimilarity;
}

// Generate demo dates relative to today so the onboarding preview never goes stale.
function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDemoEvents(): EventWithSimilarity[] {
  const today = new Date();
  return [
    makeDemoEvent(
      "demo-1",
      "Lloyd Mall Crawl",
      addDays(today, 7),
      "12:00",
      "17:00",
      "Lloyd Center",
      "community",
      lloydMallCrawlImage,
    ),
    makeDemoEvent(
      "demo-2",
      "Jamie XX",
      addDays(today, 21),
      "19:00",
      "22:00",
      "Pioneer Courthouse Square",
      "music",
      jamieXxImage,
    ),
    makeDemoEvent(
      "demo-3",
      "Sharpie Smile",
      addDays(today, 28),
      "19:00",
      "22:00",
      "Holocene, Portland, OR",
      "music",
      sharpieSmileImage,
    ),
  ];
}

type Phase = "meet" | "subscribed";

export default function YourListScreen() {
  const pendingFollowUsername = usePendingFollowUsername();
  const { saveStep } = useOnboarding();
  const totalSteps = pendingFollowUsername ? 7 : 6;
  const groupedEvents = useMemo(() => getDemoEvents(), []);
  const [phase, setPhase] = useState<Phase>("meet");

  const handleContinue = () => {
    void hapticLight();
    saveStep("yourList", {}, "/(onboarding)/onboarding/03-notifications");
  };

  const handleSubscribe = () => {
    void hapticMedium();
    setPhase("subscribed");
  };

  const isSubscribed = phase === "subscribed";

  return (
    <QuestionContainer
      question={isSubscribed ? "Subscribed ✓" : "Meet a Soonlist"}
      subtitle={
        isSubscribed
          ? "Tap any event to see details."
          : "Subscribe to follow a curator's events."
      }
      currentStep={2}
      totalSteps={totalSteps}
    >
      <View className="flex-1 justify-between">
        <View
          className="-mx-2 flex-1 overflow-hidden rounded-2xl bg-interactive-3"
          style={{
            borderWidth: 3,
            borderColor: "#FFFFFF",
          }}
        >
          {/* URL bar */}
          <View className="flex-row items-center justify-between bg-interactive-2 px-4 py-2">
            <Text className="text-sm font-semibold text-interactive-1">
              {DEMO_CURATOR_HANDLE}
            </Text>
            {isSubscribed ? (
              <View className="rounded-full bg-interactive-1 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-white">
                  ✓ subscribed
                </Text>
              </View>
            ) : (
              <SymbolView
                name="square.and.arrow.up"
                size={16}
                tintColor="#5A32FB"
              />
            )}
          </View>

          {/* Demo Subscribe button / confirmation */}
          <View className="px-4 py-3">
            {isSubscribed ? (
              <View className="rounded-full border border-interactive-1/30 bg-white/70 py-2.5">
                <Text className="text-center text-base font-semibold text-interactive-1">
                  Subscribed ✓
                </Text>
              </View>
            ) : (
              <View style={{ position: "relative" }}>
                <Pressable
                  onPress={handleSubscribe}
                  className="rounded-full bg-interactive-1 py-2.5 active:scale-[0.98]"
                  accessibilityRole="button"
                  accessibilityLabel="Subscribe"
                >
                  <Text className="text-center text-base font-semibold text-white">
                    + Subscribe
                  </Text>
                </Pressable>
                <SubscribeSticker style={{ top: -54, right: 0 }} />
              </View>
            )}
          </View>

          <View
            style={{ marginLeft: -6, marginRight: 6, position: "relative" }}
            className="flex-1"
          >
            <UserEventsList
              groupedEvents={groupedEvents}
              demoMode={true}
              showCreator="never"
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onEndReached={() => {}}
              isFetchingNextPage={false}
            />
            {isSubscribed && (
              <EventDetailSticker style={{ top: -24, left: 16 }} />
            )}
          </View>
        </View>

        <View className="h-4" />

        {/* Referral follow note */}
        {pendingFollowUsername && (
          <Text className="mb-2 text-center text-sm font-medium text-white/80">
            You'll follow @{pendingFollowUsername}'s events after sign-up
          </Text>
        )}

        <Pressable
          onPress={handleContinue}
          className="rounded-full bg-white py-4 active:scale-[0.98] active:bg-neutral-100"
        >
          <Text className="text-center text-lg font-semibold text-interactive-1">
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}
