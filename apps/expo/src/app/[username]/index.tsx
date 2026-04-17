import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, User } from "~/components/icons";
import SaveShareButton from "~/components/SaveShareButton";
import {
  sceneCardShadow,
  ScenePreviewThreeUp,
} from "~/components/ScenePreviewThreeUp";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

function isPersonalSystemList(list: Doc<"lists">): boolean {
  return list.isSystemList === true && list.systemListType === "personal";
}

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

type ListWithCount = Doc<"lists"> & { followerCount: number };

function OptOutCheckboxVisual({ checked }: { checked: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      className={`h-6 w-6 items-center justify-center rounded-md ${
        checked ? "bg-interactive-1" : "border-2 border-neutral-4 bg-white"
      }`}
    >
      {checked ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
    </View>
  );
}

/** Compact centered sheet: Follow all + checkboxes to opt out (X-style). */
function FollowSceneModal({
  visible,
  onClose,
  packLists,
  followingIds,
  followListMutation,
}: {
  visible: boolean;
  onClose: () => void;
  packLists: ListWithCount[];
  followingIds: Set<string>;
  followListMutation: (args: { listId: string }) => Promise<unknown>;
}) {
  const [includedIds, setIncludedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIncludedIds(new Set(packLists.map((l) => l.id)));
  }, [visible, packLists]);

  const toggleIncluded = useCallback((listId: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  }, []);

  const handleFollowAll = useCallback(async () => {
    const toFollow = packLists.filter(
      (l) => includedIds.has(l.id) && !followingIds.has(l.id),
    );
    if (toFollow.length === 0) {
      const anySelected = packLists.some((l) => includedIds.has(l.id));
      if (!anySelected) {
        toast.warning("Select at least one list");
      } else {
        void hapticSuccess();
      }
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      for (const l of toFollow) {
        await followListMutation({ listId: l.id });
      }
      void hapticSuccess();
      onClose();
    } catch (error) {
      logError("Follow scene batch", error);
      toast.error("Couldn’t complete follows");
    } finally {
      setIsSubmitting(false);
    }
  }, [packLists, includedIds, followingIds, followListMutation, onClose]);

  if (packLists.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/35 px-6"
          onPress={onClose}
        >
          <Pressable
            className="w-full max-w-sm rounded-3xl bg-white px-5 py-5"
            onPress={(e) => e.stopPropagation()}
            style={sceneCardShadow}
          >
            <Text className="text-center text-base font-semibold text-neutral-1">
              No lists in this scene yet
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="mt-4 items-center rounded-full bg-neutral-4 py-3"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold text-neutral-2">
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/35 px-5"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-sm rounded-3xl bg-white px-5 py-5"
          onPress={(e) => e.stopPropagation()}
          style={sceneCardShadow}
        >
          <Text className="text-lg font-bold text-neutral-1">Follow scene</Text>
          <Text className="mt-1 text-sm leading-5 text-neutral-2">
            You’ll follow every list below. Uncheck any you want to skip.
          </Text>

          <ScrollView
            className="mt-4 max-h-64"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {packLists.map((list) => {
              const included = includedIds.has(list.id);
              return (
                <TouchableOpacity
                  key={list.id}
                  className="mb-3 flex-row items-center gap-3 py-1"
                  onPress={() => toggleIncluded(list.id)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: included }}
                >
                  <OptOutCheckboxVisual checked={included} />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-base font-semibold text-neutral-1"
                      numberOfLines={2}
                    >
                      {list.name}
                    </Text>
                    {followingIds.has(list.id) ? (
                      <Text className="text-xs text-neutral-2">
                        Already following
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={() => void handleFollowAll()}
            disabled={isSubmitting}
            className="mt-2 items-center rounded-full bg-interactive-1 py-3.5"
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Follow all
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="mt-2 items-center py-2"
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-interactive-1">
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const stableTimestamp = useStableTimestamp();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [scenePackOpen, setScenePackOpen] = useState(false);

  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  const currentUser = useQuery(api.users.getCurrentUser);

  const userLists = useQuery(
    api.lists.getListsForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
  );

  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
  );

  const followListMutation = useMutation(api.lists.followList);

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && currentUser?.username
      ? { userName: currentUser.username }
      : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getPublicUserFeed,
    username
      ? {
          username: username,
          filter: "upcoming" as const,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  const filteredEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events.filter((event) => {
      const eventEndTime = new Date(event.endDateTime).getTime();
      return eventEndTime >= currentTime;
    });
  }, [events, stableTimestamp]);

  const scenePreviewImageUris = useMemo((): (string | null)[] => {
    const urls: string[] = [];
    for (const e of filteredEvents) {
      const url = e.image;
      if (typeof url === "string" && url.length > 0) {
        urls.push(url);
        if (urls.length >= 3) break;
      }
    }
    return [urls[0] ?? null, urls[1] ?? null, urls[2] ?? null];
  }, [filteredEvents]);

  const sceneLists = useMemo((): ListWithCount[] => {
    if (!userLists) return [];
    return userLists.filter((list) => !isPersonalSystemList(list));
  }, [userLists]);

  const personalListFollowerCount = useMemo(() => {
    if (!personalList || !userLists) return 0;
    const row = userLists.find((l) => l.id === personalList.id);
    return row?.followerCount ?? 0;
  }, [personalList, userLists]);

  const packLists = useMemo((): ListWithCount[] => {
    const out: ListWithCount[] = [];
    if (personalList) {
      out.push({
        ...personalList,
        followerCount: personalListFollowerCount,
      });
    }
    out.push(...sceneLists);
    return out;
  }, [personalList, personalListFollowerCount, sceneLists]);

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  };

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );
  const followingIds = useMemo(
    () => new Set(followedLists?.map((l: Doc<"lists">) => l.id) ?? []),
    [followedLists],
  );

  const openScenePack = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }
    setScenePackOpen(true);
  }, [isAuthenticated, router]);

  const isUserLoading = targetUser === undefined;
  const userNotFound = targetUser === null;
  const isOwnProfile = currentUser?.id === targetUser?.id;

  const screenTitle =
    targetUser?.displayName || targetUser?.username || "Profile";

  const sceneSourceCount = sceneLists.length;
  const moreEventsBeyondPreview = Math.max(0, filteredEvents.length - 3);
  const sceneStatsLine = useMemo(() => {
    const n = filteredEvents.length;
    if (n === 0) {
      return "No upcoming events in this feed yet.";
    }
    const sources =
      sceneSourceCount > 0
        ? `${sceneSourceCount} source${sceneSourceCount === 1 ? "" : "s"}`
        : "their picks";
    if (moreEventsBeyondPreview <= 0) {
      return `${n} event${n === 1 ? "" : "s"} from ${sources}`;
    }
    return `${moreEventsBeyondPreview} more event${moreEventsBeyondPreview === 1 ? "" : "s"} from ${sources}`;
  }, [filteredEvents.length, moreEventsBeyondPreview, sceneSourceCount]);

  const listHeader = useMemo(() => {
    if (!targetUser) {
      return <></>;
    }
    const upcomingCount = filteredEvents.length;

    return (
      <>
        <ProfileIdentityHeader
          user={targetUser}
          upcomingEventCount={upcomingCount}
        />

        <View className="px-4 pb-2">
          <Text className="mb-1 text-base font-medium text-neutral-1">
            {isOwnProfile ? "Your scene" : "Their scene"}
          </Text>
          <TouchableOpacity
            onPress={
              isOwnProfile
                ? undefined
                : packLists.length > 0
                  ? openScenePack
                  : undefined
            }
            disabled={isOwnProfile || packLists.length === 0}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${isOwnProfile ? "Your" : "Their"} scene: follow lists`}
          >
            <View className="flex-row items-center gap-3">
              <ScenePreviewThreeUp
                imageUris={scenePreviewImageUris}
                align="start"
              />
              <View className="min-w-0 flex-1">
                <Text className="text-sm leading-5 text-neutral-2">
                  {sceneStatsLine}
                </Text>
                {!isOwnProfile && packLists.length > 0 ? (
                  <View className="mt-1.5 self-start rounded-full bg-interactive-1 px-4 py-1.5">
                    <Text className="text-sm font-semibold text-white">
                      Follow scene
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-4 pb-2">
          <Text className="text-base font-medium text-neutral-1">
            {isOwnProfile ? "From your Soonlist" : "From their Soonlist"}
          </Text>
        </View>
      </>
    );
  }, [
    targetUser,
    isOwnProfile,
    scenePreviewImageUris,
    sceneStatsLine,
    openScenePack,
    packLists.length,
    filteredEvents.length,
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

  function ProfileSaveShareButtonWrapper({
    event,
  }: {
    event: { id: string; userId: string };
  }) {
    if (!isAuthenticated || !currentUser) {
      return null;
    }
    const isOwnEvent = event.userId === currentUser.id;
    const isSaved = savedEventIds.has(event.id);
    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={isSaved}
        isOwnEvent={isOwnEvent}
        source="user_profile"
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: "#5A32FB" },
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerTintColor: "#5A32FB",
          headerTitleStyle: {
            color: "#5A32FB",
          },
          headerRight: () => null,
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          events={filteredEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          isLoadingFirstPage={status === "LoadingFirstPage"}
          showCreator="never"
          isDiscoverFeed={false}
          primaryAction={isOwnProfile ? "addToCalendar" : "save"}
          ActionButton={ProfileSaveShareButtonWrapper}
          savedEventIds={savedEventIds}
          HeaderComponent={() => listHeader}
        />
        {!isOwnProfile ? (
          <FollowSceneModal
            visible={scenePackOpen}
            onClose={() => setScenePackOpen(false)}
            packLists={packLists}
            followingIds={followingIds}
            followListMutation={followListMutation}
          />
        ) : null}
      </View>
    </>
  );
}

interface ProfileIdentityHeaderProps {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    userImage?: string | null;
    publicMetadata?: unknown;
  };
  upcomingEventCount: number;
}

/** Left-aligned identity row: avatar + metadata (matches My Soonlist list header rhythm). */
function ProfileIdentityHeader({
  user,
  upcomingEventCount,
}: ProfileIdentityHeaderProps) {
  const locationLine = profileLocationFromUser(user);
  const displayName = user.displayName || user.username;
  const showAndroidTitle = Platform.OS === "android";

  return (
    <View className="px-4 pb-2">
      <View className="flex-row items-center gap-3">
        <UserProfileFlair username={user.username} size="lg">
          {user.userImage ? (
            <Image
              source={{ uri: user.userImage }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-neutral-4">
              <User size={28} color="#627496" />
            </View>
          )}
        </UserProfileFlair>
        <View className="min-w-0 flex-1">
          {showAndroidTitle ? (
            <Text
              className="text-xl font-bold text-neutral-1"
              numberOfLines={2}
            >
              {displayName}
            </Text>
          ) : null}
          <Text
            className={`text-sm text-neutral-2 ${showAndroidTitle ? "mt-0.5" : ""}`}
          >
            {upcomingEventCount}{" "}
            {upcomingEventCount === 1 ? "upcoming event" : "upcoming events"}
          </Text>
          {locationLine ? (
            <Text className="text-sm text-neutral-2" numberOfLines={1}>
              {locationLine}
            </Text>
          ) : null}
          <Text className="text-sm text-neutral-2">@{user.username}</Text>
        </View>
      </View>
    </View>
  );
}

export { ErrorBoundary } from "expo-router";
