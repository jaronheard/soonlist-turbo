import type { FunctionReturnType } from "convex/server";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { User } from "~/components/icons";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useLoadMoreHandler } from "~/hooks/useUpcomingFeed";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

type ProfileSegment = "upcoming" | "past";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function profileLocationFromUser(user: {
  publicMetadata?: unknown;
}): string | null {
  const meta = user.publicMetadata;
  if (!isRecord(meta)) return null;
  for (const key of ["location", "city", "hometown"] as const) {
    const v = meta[key];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

function formatMemberSince(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days <= 30) {
    return "New member";
  }
  return `Since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

function websiteHref(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }
  return `https://${t}`;
}

function instaHref(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return t;
  }
  const handle = t.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

function ProfileSegmentToggle({
  selected,
  onChange,
}: {
  selected: ProfileSegment;
  onChange: (s: ProfileSegment) => void;
}) {
  return (
    <View className="mt-3 flex-row rounded-lg bg-neutral-4/40 p-1">
      <TouchableOpacity
        className={`flex-1 items-center rounded-md py-2 ${
          selected === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onChange("upcoming")}
        accessibilityRole="button"
        accessibilityState={{ selected: selected === "upcoming" }}
        accessibilityLabel="Upcoming events"
      >
        <Text
          className={
            selected === "upcoming"
              ? "font-semibold text-neutral-1"
              : "text-neutral-2"
          }
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 items-center rounded-md py-2 ${
          selected === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onChange("past")}
        accessibilityRole="button"
        accessibilityState={{ selected: selected === "past" }}
        accessibilityLabel="Past events"
      >
        <Text
          className={
            selected === "past"
              ? "font-semibold text-neutral-1"
              : "text-neutral-2"
          }
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileLinkRow({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className="mt-1 active:opacity-70"
    >
      <Text className="text-sm font-medium text-interactive-1" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

type ProfileUser = NonNullable<
  FunctionReturnType<typeof api.users.getByUsername>
>;

type PublicFeedCountPart = { count: number; capped: boolean };

/** Matches `PUBLIC_FEED_COUNT_CAP` in `packages/backend/convex/feeds.ts`. */
const PUBLIC_FEED_COUNT_CAP = 50;

function formatPublicFeedCount(part: PublicFeedCountPart): string {
  return part.capped ? `${PUBLIC_FEED_COUNT_CAP}+` : String(part.count);
}

/** Exact sum when known; round "50+" if either segment hits the cap. */
function publicFeedAllTimeLabel(
  upcoming: PublicFeedCountPart,
  past: PublicFeedCountPart,
): string {
  if (!upcoming.capped && !past.capped) {
    return String(upcoming.count + past.count);
  }
  return `${PUBLIC_FEED_COUNT_CAP}+`;
}

function ProfileHeroAndSoonlist({
  user,
  listTitle,
  feedCounts,
  selectedSegment,
  onSegmentChange,
}: {
  user: ProfileUser;
  listTitle: string;
  feedCounts:
    | { upcoming: PublicFeedCountPart; past: PublicFeedCountPart }
    | undefined;
  selectedSegment: ProfileSegment;
  onSegmentChange: (s: ProfileSegment) => void;
}) {
  const locationLine = profileLocationFromUser(user);
  const memberLine = formatMemberSince(user.created_at);
  const totalPublicLabel =
    feedCounts !== undefined
      ? publicFeedAllTimeLabel(feedCounts.upcoming, feedCounts.past)
      : null;

  const displayName =
    user.displayName?.trim() || `@${user.username}`;

  return (
    <View className="px-4 pb-2 pt-2">
      <View className="flex-row gap-4">
        <UserProfileFlair username={user.username} size="lg">
          {user.userImage ? (
            <Image
              source={{ uri: user.userImage }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-neutral-4">
              <User size={40} color="#627496" />
            </View>
          )}
        </UserProfileFlair>

        <View className="min-w-0 flex-1">
          <Text
            className="text-xl font-bold text-neutral-1"
            numberOfLines={2}
          >
            {displayName}
          </Text>
          <Text className="text-sm text-neutral-2">@{user.username}</Text>

          {user.bio?.trim() ? (
            <Text className="mt-2 text-sm leading-5 text-neutral-1">
              {user.bio.trim()}
            </Text>
          ) : null}

          {locationLine ? (
            <Text
              className="mt-2 text-sm text-neutral-2"
              numberOfLines={2}
            >
              {locationLine}
            </Text>
          ) : null}

          {memberLine ? (
            <Text className="mt-1 text-sm text-neutral-2">{memberLine}</Text>
          ) : null}

          {user.publicEmail?.trim() ? (
            <ProfileLinkRow
              label={user.publicEmail.trim()}
              onPress={() => {
                void Linking.openURL(
                  `mailto:${encodeURIComponent(user.publicEmail!.trim())}`,
                );
              }}
            />
          ) : null}

          {user.publicPhone?.trim() ? (
            <ProfileLinkRow
              label={user.publicPhone.trim()}
              onPress={() => {
                const n = user.publicPhone!.replace(/[^\d+]/g, "");
                void Linking.openURL(`tel:${n}`);
              }}
            />
          ) : null}

          {user.publicInsta?.trim() ? (
            <ProfileLinkRow
              label={`Instagram: @${user.publicInsta.trim().replace(/^@/, "")}`}
              onPress={() => {
                void Linking.openURL(instaHref(user.publicInsta!));
              }}
            />
          ) : null}

          {user.publicWebsite?.trim() ? (
            <ProfileLinkRow
              label={user.publicWebsite.trim()}
              onPress={() => {
                void Linking.openURL(websiteHref(user.publicWebsite!));
              }}
            />
          ) : null}
        </View>
      </View>

      <View className="mt-5 border-t border-neutral-4/80 pt-4">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-2">
          Soonlist
        </Text>
        <Text
          className="mt-1 text-lg font-bold text-interactive-1"
          numberOfLines={2}
        >
          {listTitle}
        </Text>
        <Text className="mt-1 text-sm text-neutral-2">
          {feedCounts !== undefined ? (
            <>
              {formatPublicFeedCount(feedCounts.upcoming)} upcoming
              {totalPublicLabel !== null
                ? ` · ${totalPublicLabel} events all-time`
                : ""}
            </>
          ) : (
            "…"
          )}
        </Text>
        <ProfileSegmentToggle
          selected={selectedSegment}
          onChange={onSegmentChange}
        />
      </View>
    </View>
  );
}

export default function UserProfilePage() {
  const params = useLocalSearchParams<{ username: string }>();
  const username =
    typeof params.username === "string" ? params.username : "";
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [selectedSegment, setSelectedSegment] =
    useState<ProfileSegment>("upcoming");
  const stableTimestamp = useStableTimestamp();

  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  const currentUser = useQuery(api.users.getCurrentUser);

  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
  );

  const feedCounts = useQuery(
    api.feeds.getPublicUserFeedCounts,
    targetUser ? { username } : "skip",
  );

  const followListMutation = useMutation(
    api.lists.followList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined || !personalList) return;
    if (current.some((l) => l.id === args.listId)) return;
    localStore.setQuery(api.lists.getFollowedLists, {}, [
      ...current,
      personalList,
    ]);
  });

  const unfollowListMutation = useMutation(
    api.lists.unfollowList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined) return;
    localStore.setQuery(
      api.lists.getFollowedLists,
      {},
      current.filter((l) => l.id !== args.listId),
    );
  });

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && currentUser?.username
      ? { userName: currentUser.username }
      : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  const feedQueryArgs = useMemo(
    () =>
      username
        ? {
            username,
            filter: selectedSegment,
          }
        : "skip",
    [username, selectedSegment],
  );

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getPublicUserFeed, feedQueryArgs, {
    initialNumItems: 50,
  });

  const displayEvents = useMemo(() => {
    const stableMs = new Date(stableTimestamp).getTime();
    return events.filter((e) =>
      eventMatchesFeedSegment(e.endDateTime, selectedSegment, stableMs),
    );
  }, [events, selectedSegment, stableTimestamp]);

  const handleLoadMore = useLoadMoreHandler(status, loadMore);

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );
  const followingIds = useMemo(
    () => new Set(followedLists?.map((l: Doc<"lists">) => l.id) ?? []),
    [followedLists],
  );

  const isUserLoading = targetUser === undefined;
  const userNotFound = targetUser === null;
  const isOwnProfile = currentUser?.id === targetUser?.id;

  const screenTitle =
    targetUser?.displayName || targetUser?.username || "Profile";

  const isFollowingPersonalList = personalList
    ? followingIds.has(personalList.id)
    : false;

  const listTitle = useMemo(() => {
    if (!targetUser) return "";
    const fromList = personalList?.name?.trim();
    const fromUser = targetUser.publicListName?.trim();
    const fallback = `${targetUser.displayName?.trim() || targetUser.username}'s Soonlist`;
    return fromList || fromUser || fallback;
  }, [targetUser, personalList]);

  const handleFollowListPress = useCallback(() => {
    if (!personalList) return;
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }
    const run = isFollowingPersonalList
      ? unfollowListMutation
      : followListMutation;
    run({ listId: personalList.id }).catch((error: unknown) => {
      logError("Toggle follow personal list", error);
      toast.error("Couldn't update subscription");
    });
  }, [
    personalList,
    isAuthenticated,
    isFollowingPersonalList,
    followListMutation,
    unfollowListMutation,
    router,
  ]);

  const renderListHeader = useCallback(() => {
    if (!targetUser) {
      return null;
    }
    return (
      <ProfileHeroAndSoonlist
        user={targetUser}
        listTitle={listTitle}
        feedCounts={feedCounts}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
      />
    );
  }, [
    targetUser,
    listTitle,
    feedCounts,
    selectedSegment,
  ]);

  if (isUserLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: undefined,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (userNotFound) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: undefined,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg text-neutral-2">User not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLargeTitle: false,
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerTintColor: "#5A32FB",
          headerTitleStyle: {
            color: "#5A32FB",
          },
          unstable_headerRightItems:
            isOwnProfile || !personalList
              ? undefined
              : () => [
                  {
                    type: "custom",
                    element: (
                      <SubscribeButton
                        isSubscribed={isFollowingPersonalList}
                        onPress={handleFollowListPress}
                      />
                    ),
                    hidesSharedBackground: true,
                  },
                ],
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          events={displayEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          listBodyLoading={status === "LoadingFirstPage"}
          showCreator="never"
          primaryAction={isOwnProfile ? "addToCalendar" : "save"}
          savedEventIds={savedEventIds}
          source="user_profile"
          HeaderComponent={renderListHeader}
        />
      </View>
    </>
  );
}

export { ErrorBoundary } from "expo-router";
