import React, { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Instagram } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";

export default function InstagramUsernameScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { isSignedIn } = useUser();

  const sourceInfo = useQuery(
    api.instagramSources.getByUsername,
    isSignedIn && username ? { username } : "skip",
  );

  const events = useQuery(
    api.instagramSources.getEventsForSource,
    isSignedIn && username ? { username } : "skip",
  );

  const ensureSourceMutation = useMutation(api.instagramSources.ensureSource);
  const trackMutation = useMutation(api.instagramSources.track);
  const untrackMutation = useMutation(api.instagramSources.untrack);

  // Auto-track: create source on first visit if it doesn't exist
  useEffect(() => {
    if (isSignedIn && sourceInfo && !sourceInfo.found && username) {
      void ensureSourceMutation({ username });
    }
  }, [isSignedIn, sourceInfo, username, ensureSourceMutation]);

  const isFollowing = sourceInfo?.found ? sourceInfo.isFollowing : false;

  const handleFollow = async () => {
    if (username) {
      await trackMutation({ username });
    }
  };

  const handleUnfollow = async () => {
    if (username) {
      await untrackMutation({ username });
    }
  };

  if (!isSignedIn) {
    return (
      <>
        <Stack.Screen options={{ title: `@${username ?? ""}` }} />
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Instagram color="#5A32FB" size={48} />
          <Text className="text-xl font-bold">@{username}</Text>
          <Text className="text-neutral-2">
            Please sign in to view Instagram events.
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `@${username ?? ""}` }} />
      <ScrollView className="flex-1 bg-white" contentContainerClassName="p-4 gap-4">
        {/* Profile Card */}
        <View className="rounded-xl border border-neutral-3 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Instagram color="#000" size={32} />
              <View>
                <Text className="text-lg font-bold">@{username}</Text>
                <Pressable
                  onPress={() =>
                    void Linking.openURL(
                      `https://instagram.com/${username ?? ""}`,
                    )
                  }
                >
                  <Text className="text-sm text-interactive-1">
                    View on Instagram
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              className={`rounded-lg px-4 py-2 ${
                isFollowing ? "border border-neutral-3" : "bg-interactive-1"
              }`}
              onPress={isFollowing ? handleUnfollow : handleFollow}
            >
              <Text
                className={`font-semibold ${
                  isFollowing ? "text-neutral-1" : "text-white"
                }`}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Text>
            </Pressable>
          </View>
          {sourceInfo?.found && (
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-xs text-neutral-2">
                {sourceInfo.source.followerCount}{" "}
                {sourceInfo.source.followerCount === 1
                  ? "follower"
                  : "followers"}
              </Text>
              <Text className="text-xs text-neutral-2">·</Text>
              <Text className="text-xs text-neutral-2">
                {sourceInfo.source.eventsFound} events found
              </Text>
            </View>
          )}
        </View>

        {/* Events */}
        {events === undefined ? (
          <View className="items-center py-8">
            <LoadingSpinner />
          </View>
        ) : events.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-center text-neutral-2">
              We're scanning recent posts — events will appear here soon.
            </Text>
            <Text className="text-center text-xs text-neutral-3">
              New events are checked every few hours.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="font-semibold">
              Events ({events.length})
            </Text>
            {events.map((event) => (
              <Link key={event._id} href={`/event/${event.id}`} asChild>
                <Pressable className="rounded-xl border border-neutral-3 bg-white p-4">
                  <Text className="font-semibold text-neutral-1">
                    {event.name}
                  </Text>
                  <Text className="text-sm text-neutral-2">
                    {event.startDate}
                    {event.startTime ? ` at ${event.startTime}` : ""}
                  </Text>
                  {event.location && (
                    <Text className="text-sm text-neutral-2">
                      {event.location}
                    </Text>
                  )}
                  {event.description && (
                    <Text
                      className="mt-1 text-sm text-neutral-3"
                      numberOfLines={2}
                    >
                      {event.description}
                    </Text>
                  )}
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}
