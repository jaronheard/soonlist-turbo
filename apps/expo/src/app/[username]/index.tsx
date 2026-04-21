import type { FunctionReturnType } from "convex/server";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import {
  Globe,
  Instagram,
  Mail,
  Phone,
  User,
} from "~/components/icons";
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

function formatMemberSince(createdAtIso: string): string {
  const d = new Date(createdAtIso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days <= 30) {
    return "New member";
  }
  return `Joined ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
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

function SegmentedControlFallback({
  selectedSegment,
  onSegmentChange,
}: {
  selectedSegment: ProfileSegment;
  onSegmentChange: (segment: ProfileSegment) => void;
}) {
  return (
    <View className="flex-row rounded-lg bg-gray-100 p-1">
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("upcoming")}
      >
        <Text
          className={
            selectedSegment === "upcoming"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("past")}
      >
        <Text
          className={
            selectedSegment === "past"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const PROFILE_CONTACT_ICON_SIZE = 16;
const PROFILE_CONTACT_ICON_COLOR = "#5A32FB";

function ProfileContactIconButton({
  accessibilityLabel,
  onPress,
  children,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className="h-8 w-8 items-center justify-center rounded-full bg-neutral-4/70 active:opacity-70"
    >
      {children}
    </Pressable>
  );
}

type ProfileUser = NonNullable<
  FunctionReturnType<typeof api.users.getByUsername>
>;

function formatLastUpdated(addedAtMs: number | null | undefined): string {
  if (addedAtMs === null || addedAtMs === undefined) return "";
  const now = Date.now();
  const diffMs = Math.max(0, now - addedAtMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Last updated just now";
  if (minutes < 60) {
    return `Last updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Last updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Last updated ${days} day${days === 1 ? "" : "s"} ago`;
  }
  const d = new Date(addedAtMs);
  return `Last updated ${d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })}`;
}

function ProfileHeroAndSoonlist({
  user,
  listTitle,
  lastUpdatedAt,
  selectedSegment,
  onSegmentChange,
}: {
  user: ProfileUser;
  listTitle: string;
  lastUpdatedAt: number | null | undefined;
  selectedSegment: ProfileSegment;
  onSegmentChange: (s: ProfileSegment) => void;
}) {
  const memberLine = formatMemberSince(user.created_at);

  const emailTrimmed = user.publicEmail?.trim() ?? "";
  const phoneTrimmed = user.publicPhone?.trim() ?? "";
  const instaTrimmed = user.publicInsta?.trim() ?? "";
  const instaHandle = instaTrimmed.replace(/^@/, "");
  const websiteTrimmed = user.publicWebsite?.trim() ?? "";
  const hasContact =
    Boolean(emailTrimmed) ||
    Boolean(phoneTrimmed) ||
    Boolean(instaTrimmed) ||
    Boolean(websiteTrimmed);

  const lastUpdatedLine =
    lastUpdatedAt === undefined
      ? "…"
      : formatLastUpdated(lastUpdatedAt);

  return (
    <View className="px-4 pb-2 pt-2">
      <Text
        className="text-3xl font-bold leading-tight text-interactive-1"
        numberOfLines={2}
      >
        {listTitle}
      </Text>

      {/* Byline: avatar + @username + joined + contact icons */}
      <View className="mt-3 flex-row items-center gap-3">
        <UserProfileFlair username={user.username} size="sm">
          {user.userImage ? (
            <Image
              source={{ uri: user.userImage }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-4">
              <User size={20} color="#627496" />
            </View>
          )}
        </UserProfileFlair>

        <View className="min-w-0 flex-1">
          <Text
            className="text-sm font-semibold text-neutral-1"
            numberOfLines={1}
            accessibilityLabel={
              user.displayName?.trim()
                ? `${user.displayName.trim()}, @${user.username}`
                : `@${user.username}`
            }
          >
            @{user.username}
          </Text>
          {memberLine ? (
            <Text className="text-xs text-neutral-2" numberOfLines={1}>
              {memberLine}
            </Text>
          ) : null}
        </View>

        {hasContact ? (
          <View className="flex-row items-center gap-1.5">
            {emailTrimmed ? (
              <ProfileContactIconButton
                accessibilityLabel={`Email ${emailTrimmed}`}
                onPress={() => {
                  void Linking.openURL(
                    `mailto:${encodeURIComponent(emailTrimmed)}`,
                  );
                }}
              >
                <Mail
                  size={PROFILE_CONTACT_ICON_SIZE}
                  color={PROFILE_CONTACT_ICON_COLOR}
                />
              </ProfileContactIconButton>
            ) : null}
            {phoneTrimmed ? (
              <ProfileContactIconButton
                accessibilityLabel={`Call ${phoneTrimmed}`}
                onPress={() => {
                  const n = phoneTrimmed.replace(/[^\d+]/g, "");
                  void Linking.openURL(`tel:${n}`);
                }}
              >
                <Phone
                  size={PROFILE_CONTACT_ICON_SIZE}
                  color={PROFILE_CONTACT_ICON_COLOR}
                />
              </ProfileContactIconButton>
            ) : null}
            {instaTrimmed ? (
              <ProfileContactIconButton
                accessibilityLabel={`Instagram @${instaHandle}`}
                onPress={() => {
                  void Linking.openURL(instaHref(instaTrimmed));
                }}
              >
                <Instagram
                  size={PROFILE_CONTACT_ICON_SIZE}
                  color={PROFILE_CONTACT_ICON_COLOR}
                />
              </ProfileContactIconButton>
            ) : null}
            {websiteTrimmed ? (
              <ProfileContactIconButton
                accessibilityLabel={`Website ${websiteTrimmed}`}
                onPress={() => {
                  void Linking.openURL(websiteHref(websiteTrimmed));
                }}
              >
                <Globe
                  size={PROFILE_CONTACT_ICON_SIZE}
                  color={PROFILE_CONTACT_ICON_COLOR}
                />
              </ProfileContactIconButton>
            ) : null}
          </View>
        ) : null}
      </View>

      <Text className="mt-2 text-sm text-neutral-2">{lastUpdatedLine}</Text>

      <View className="mt-3" style={{ width: 260 }}>
        {Platform.OS === "ios" ? (
          <Host matchContents>
            <Picker
              selection={selectedSegment}
              onSelectionChange={(value) => {
                onSegmentChange(value as ProfileSegment);
              }}
              modifiers={[pickerStyle("segmented")]}
            >
              <SwiftUIText modifiers={[tag("upcoming")]}>
                Upcoming
              </SwiftUIText>
              <SwiftUIText modifiers={[tag("past")]}>Past</SwiftUIText>
            </Picker>
          </Host>
        ) : (
          <SegmentedControlFallback
            selectedSegment={selectedSegment}
            onSegmentChange={onSegmentChange}
          />
        )}
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

  const lastUpdatedAt = useQuery(
    api.feeds.getPublicUserFeedLastUpdated,
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
        lastUpdatedAt={lastUpdatedAt}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
      />
    );
  }, [
    targetUser,
    listTitle,
    lastUpdatedAt,
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
