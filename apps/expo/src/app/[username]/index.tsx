import type { FunctionReturnType } from "convex/server";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Share, Text, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import type { SoonlistHeroSegment } from "~/components/SoonlistHero";
import { FloatingShareButton } from "~/components/FloatingShareButton";
import { Globe, Instagram, Mail, Phone, User } from "~/components/icons";
import {
  SOONLIST_HERO_CONTACT_ICON_COLOR,
  SOONLIST_HERO_CONTACT_ICON_SIZE,
  SoonlistHero,
  SoonlistHeroBylineRow,
  SoonlistHeroContactButton,
} from "~/components/SoonlistHero";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useLoadMoreHandler } from "~/hooks/useUpcomingFeed";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";

type ProfileSegment = SoonlistHeroSegment;

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

type ProfileUser = NonNullable<
  FunctionReturnType<typeof api.users.getByUsername>
>;

function ProfileBylineRow({ user }: { user: ProfileUser }) {
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

  return (
    <SoonlistHeroBylineRow
      avatar={
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
      }
      primaryText={`@${user.username}`}
      primaryAccessibilityLabel={
        user.displayName.trim()
          ? `${user.displayName.trim()}, @${user.username}`
          : `@${user.username}`
      }
      secondaryText={memberLine || undefined}
      contacts={
        hasContact ? (
          <>
            {emailTrimmed ? (
              <SoonlistHeroContactButton
                accessibilityLabel={`Email ${emailTrimmed}`}
                onPress={() => {
                  void Linking.openURL(
                    `mailto:${encodeURIComponent(emailTrimmed)}`,
                  );
                }}
              >
                <Mail
                  size={SOONLIST_HERO_CONTACT_ICON_SIZE}
                  color={SOONLIST_HERO_CONTACT_ICON_COLOR}
                />
              </SoonlistHeroContactButton>
            ) : null}
            {phoneTrimmed ? (
              <SoonlistHeroContactButton
                accessibilityLabel={`Call ${phoneTrimmed}`}
                onPress={() => {
                  const n = phoneTrimmed.replace(/[^\d+]/g, "");
                  void Linking.openURL(`tel:${n}`);
                }}
              >
                <Phone
                  size={SOONLIST_HERO_CONTACT_ICON_SIZE}
                  color={SOONLIST_HERO_CONTACT_ICON_COLOR}
                />
              </SoonlistHeroContactButton>
            ) : null}
            {instaTrimmed ? (
              <SoonlistHeroContactButton
                accessibilityLabel={`Instagram @${instaHandle}`}
                onPress={() => {
                  void Linking.openURL(instaHref(instaTrimmed));
                }}
              >
                <Instagram
                  size={SOONLIST_HERO_CONTACT_ICON_SIZE}
                  color={SOONLIST_HERO_CONTACT_ICON_COLOR}
                />
              </SoonlistHeroContactButton>
            ) : null}
            {websiteTrimmed ? (
              <SoonlistHeroContactButton
                accessibilityLabel={`Website ${websiteTrimmed}`}
                onPress={() => {
                  void Linking.openURL(websiteHref(websiteTrimmed));
                }}
              >
                <Globe
                  size={SOONLIST_HERO_CONTACT_ICON_SIZE}
                  color={SOONLIST_HERO_CONTACT_ICON_COLOR}
                />
              </SoonlistHeroContactButton>
            ) : null}
          </>
        ) : null
      }
    />
  );
}

export default function UserProfilePage() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = typeof params.username === "string" ? params.username : "";
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

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
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

  const handleShareProfile = useCallback(async () => {
    if (!targetUser) return;
    try {
      await Share.share({
        message: `Check out ${
          targetUser.displayName.trim() || targetUser.username
        }'s Soonlist`,
        url: `https://soonlist.com/${targetUser.username}`,
      });
    } catch (error) {
      logError("Error sharing profile", error);
    }
  }, [targetUser]);

  const renderListHeader = useCallback(() => {
    if (!targetUser) {
      return null;
    }
    return (
      <SoonlistHero
        title={listTitle}
        subtitle={<ProfileBylineRow user={targetUser} />}
        lastUpdatedAt={lastUpdatedAt}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
      />
    );
  }, [targetUser, listTitle, lastUpdatedAt, selectedSegment]);

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
        <FloatingShareButton
          onPress={() => void handleShareProfile()}
          accessibilityLabel={`Share ${
            targetUser.displayName.trim() || targetUser.username
          }'s Soonlist`}
        />
      </View>
    </>
  );
}

export { ErrorBoundary } from "expo-router";
