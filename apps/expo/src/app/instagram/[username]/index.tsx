import React, { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";

import type { EventMetadata } from "@soonlist/cal";
import { api } from "@soonlist/backend/convex/_generated/api";

import { Instagram } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";

function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Less than an hour ago";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function InstagramUsernamePage() {
  const { username } = useLocalSearchParams<{ username: string }>();

  const sourceInfo = useQuery(api.instagramSources.getByUsername, {
    username: username || "",
  });
  const status = useQuery(api.instagramSources.getStatus, {
    username: username || "",
  });
  const events = useQuery(api.instagramSources.getEventsForSource, {
    username: username || "",
  });

  const ensureSource = useMutation(api.instagramSources.ensureSource);
  const trackMutation = useMutation(api.instagramSources.track);
  const untrackMutation = useMutation(api.instagramSources.untrack);

  // Auto-track: create source on first visit if it doesn't exist
  useEffect(() => {
    if (sourceInfo && !sourceInfo.exists && username) {
      void ensureSource({ username });
    }
  }, [sourceInfo, username, ensureSource]);

  const isTracked = sourceInfo?.exists ? sourceInfo.isTracked : false;

  const handleFollowToggle = async () => {
    if (!username) return;
    if (isTracked) {
      await untrackMutation({ username });
    } else {
      await trackMutation({ username });
    }
  };

  if (!username) return null;

  return (
    <>
      <Stack.Screen options={{ title: `@${username}` }} />
      <ScrollView className="flex-1 bg-white px-4 pt-4">
        {/* Profile Link Card */}
        <View className="rounded-lg border border-neutral-3 p-4">
          <View className="flex-row items-center gap-2">
            <Instagram width={20} height={20} />
            <Text className="text-xl font-bold text-neutral-1">
              @{username}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              void Linking.openURL(`https://instagram.com/${username}`)
            }
            className="mt-2"
          >
            <Text className="text-sm text-interactive-1">
              View on Instagram →
            </Text>
          </Pressable>
        </View>

        {/* Follow/Unfollow button */}
        <View className="mt-4 flex-row items-center gap-3">
          <Pressable
            onPress={handleFollowToggle}
            className={`rounded-lg px-4 py-2 ${
              isTracked ? "bg-red-500" : "bg-interactive-1"
            }`}
          >
            <Text className="font-semibold text-white">
              {isTracked ? "Unfollow" : "Follow"}
            </Text>
          </Pressable>
          {status && (
            <Text className="text-sm text-neutral-2">
              {status.followerCount}{" "}
              {status.followerCount === 1 ? "follower" : "followers"} ·{" "}
              {status.eventsFound} events
            </Text>
          )}
        </View>

        {/* Events */}
        <View className="mt-8">
          <Text className="text-lg font-semibold text-neutral-1">Events</Text>
          {events === undefined ? (
            <View className="mt-4 items-center">
              <LoadingSpinner />
            </View>
          ) : events.length === 0 ? (
            <Text className="mt-4 text-neutral-2">
              We&apos;re scanning recent posts — events will appear here soon.
            </Text>
          ) : (
            <View className="mt-4 gap-3">
              {events.map((event) => {
                const metadata = event.eventMetadata as
                  | EventMetadata
                  | undefined;
                const sourceUrls = metadata?.sourceUrls || [];

                return (
                  <Link key={event.id} href={`/event/${event.id}`} asChild>
                    <Pressable className="rounded-lg border border-neutral-3 p-4">
                      <Text className="text-lg font-semibold text-interactive-1">
                        {event.name || "Untitled Event"}
                      </Text>
                      <Text className="mt-1 text-sm text-neutral-2">
                        {new Date(event.startDateTime).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                      {event.location && (
                        <Text className="mt-1 text-sm text-neutral-2">
                          {event.location}
                        </Text>
                      )}
                      {sourceUrls.length > 0 && (
                        <Pressable
                          onPress={() => void Linking.openURL(sourceUrls[0]!)}
                          className="mt-2"
                        >
                          <Text className="text-xs text-interactive-1">
                            View original post
                          </Text>
                        </Pressable>
                      )}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          )}
        </View>

        {/* Status info */}
        {status && (
          <View className="mb-8 mt-6">
            <Text className="text-xs text-neutral-2">
              Last checked: {formatTimeAgo(status.lastCheckedAt)} ·{" "}
              {status.postsChecked} posts scanned
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
