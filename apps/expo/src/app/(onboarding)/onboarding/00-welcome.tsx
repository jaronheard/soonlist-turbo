import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { router, Stack } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Logo } from "~/components/Logo";
import { usePendingFollowUsername, useSetHasSeenOnboarding } from "~/store";
import { hapticLight, hapticMedium } from "~/utils/feedback";

const AnimatedView = Animated.createAnimatedComponent(View);

function ReferrerEventRow({
  name,
  date,
  location,
}: {
  name: string;
  date: string;
  location?: string | null;
}) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-interactive-1/10">
        <Text className="text-lg">{"📅"}</Text>
      </View>
      <View className="flex-1">
        <Text
          className="text-base font-semibold text-gray-700"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="text-sm text-gray-400" numberOfLines={1}>
          {date}
          {location ? ` · ${location}` : ""}
        </Text>
      </View>
    </View>
  );
}

function ReferralWelcome({ username }: { username: string }) {
  const userData = useQuery(api.users.getByUsername, { userName: username });

  const feedData = useQuery(api.feeds.getPublicUserFeed, {
    username,
    paginationOpts: { numItems: 3, cursor: null },
    filter: "upcoming",
  });

  const displayName = userData?.displayName ?? `@${username}`;
  const avatarUrl = userData?.userImage;
  const events = feedData?.page ?? [];

  return (
    <AnimatedView
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center"
      layout={Layout.duration(400)}
    >
      {/* Referrer identity */}
      <View className="mb-4 items-center">
        {avatarUrl ? (
          <ExpoImage
            source={{ uri: avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-interactive-2">
            <Text className="text-2xl font-bold text-interactive-1">
              {username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="mt-3 text-center font-heading text-2xl font-bold text-gray-700">
          {displayName} wants you to see what's coming up
        </Text>
      </View>

      {/* Upcoming events card */}
      {events.length > 0 && (
        <View className="mx-2 overflow-hidden rounded-2xl bg-white">
          {events.slice(0, 3).map((event, index) => {
            const dateStr = new Date(event.startDateTime).toLocaleDateString(
              "en-US",
              { weekday: "short", month: "short", day: "numeric" },
            );
            return (
              <ReferrerEventRow
                key={event._id ?? index}
                name={event.name ?? "Untitled Event"}
                date={dateStr}
                location={event.location}
              />
            );
          })}
        </View>
      )}
    </AnimatedView>
  );
}

function OrganicWelcome() {
  return (
    <AnimatedView
      layout={Layout.duration(400)}
      className="flex-1 justify-center"
    >
      <ExpoImage
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
        source={require("../../../assets/feed.png")}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        cachePolicy="disk"
        transition={100}
      />
    </AnimatedView>
  );
}

export default function WelcomeScreen() {
  const pendingFollowUsername = usePendingFollowUsername();

  const handleGetStarted = () => {
    void hapticMedium();
    router.navigate("/(onboarding)/onboarding/01-try-it");
  };

  const setHasSeenOnboarding = useSetHasSeenOnboarding();

  const handleSignIn = () => {
    void hapticLight();
    // Mark as seen onboarding so they skip it after sign-in
    setHasSeenOnboarding(true);

    // Navigate to sign-in screen
    router.navigate("/sign-in");
  };


  return (
    <View className="flex-1 bg-interactive-3">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-4 pb-8 pt-24">
        <AnimatedView className="flex-1" layout={Layout.duration(400)}>
          <View className="shrink-0">
            <AnimatedView
              className="mb-4 items-center"
              layout={Layout.duration(400)}
            >
              <Logo className="h-10 w-40" variant="hidePreview" />
            </AnimatedView>
            {!pendingFollowUsername && (
              <AnimatedView
                className="items-center"
                layout={Layout.duration(400)}
              >
                <Text className="mb-2 text-center font-heading text-4xl font-bold text-gray-700">
                  Turn screenshots into{" "}
                  <Text className="text-interactive-1">plans</Text>
                </Text>
                <Text className="mb-2 text-center text-lg text-gray-500">
                  Save events in one tap, all in one shareable list
                </Text>
              </AnimatedView>
            )}
          </View>

          {pendingFollowUsername ? (
            <ReferralWelcome username={pendingFollowUsername} />
          ) : (
            <OrganicWelcome />
          )}

          <AnimatedView
            className="relative mt-4 w-full shrink-0"
            layout={Layout.duration(400)}
          >
            {/* Get Started Button */}
            <Pressable
              onPress={handleGetStarted}
              className="mb-3 rounded-full bg-interactive-1 py-4 active:scale-[0.98] active:bg-interactive-1/90"
            >
              <Text className="text-center text-lg font-semibold text-white">
                Get Started
              </Text>
            </Pressable>

            {/* Simple sign in link */}
            <Pressable onPress={handleSignIn} className="py-3">
              <Text className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Text className="font-semibold text-interactive-1">
                  Sign in
                </Text>
              </Text>
            </Pressable>

          </AnimatedView>
        </AnimatedView>
      </View>

    </View>
  );
}
