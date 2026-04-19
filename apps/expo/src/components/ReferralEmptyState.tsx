import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { DefaultEmptyState } from "~/components/DefaultEmptyState";
import { User } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import ScenePreviewThreeUp from "~/components/ScenePreviewThreeUp";
import { UsernameEntryModal } from "~/components/UsernameEntryModal";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticLight, toast } from "~/utils/feedback";

interface ReferralEmptyStateProps {
  hasFollowings: boolean;
  followedEventCount: number;
  hasMoreFollowedEvents: boolean;
  followedLists: Doc<"lists">[] | undefined;
  onExitToFeed: () => void;
}

export function ReferralEmptyState({
  hasFollowings,
  followedEventCount,
  hasMoreFollowedEvents,
  followedLists,
  onExitToFeed,
}: ReferralEmptyStateProps) {
  const { user: clerkUser } = useUser();
  const stableTimestamp = useStableTimestamp();

  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const isMutatingRef = useRef(false);

  // Look up the pending referral target.
  const targetUser = useQuery(
    api.users.getByUsername,
    pendingFollowUsername ? { userName: pendingFollowUsername } : "skip",
  );

  // Look up the target's personal list so we can call the same
  // `followList` mutation + optimistic update pattern FeaturedListRow uses.
  const targetUserFound = targetUser !== null && targetUser !== undefined;
  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUserFound ? { userId: targetUser.id } : "skip",
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

  // Look up the current authenticated user by their Clerk username so we can
  // detect the self-share case.
  const currentUserRecord = useQuery(
    api.users.getByUsername,
    clerkUser?.username ? { userName: clerkUser.username } : "skip",
  );
  const currentUserId = currentUserRecord?.id;

  // Pull a preview feed for the target user (mirrors FeaturedListRow).
  const previewUsername = targetUserFound ? pendingFollowUsername : null;
  const { results: events, status: feedStatus } = useStablePaginatedQuery(
    api.feeds.getPublicUserFeed,
    previewUsername
      ? { username: previewUsername, filter: "upcoming" as const }
      : "skip",
    { initialNumItems: 50 },
  );

  const { imageUris, upcomingCount, hasMoreUpcoming } = useMemo((): {
    imageUris: (string | null)[];
    upcomingCount: number;
    hasMoreUpcoming: boolean;
  } => {
    const currentTime = new Date(stableTimestamp).getTime();
    const upcoming = events.filter(
      (e) => new Date(e.endDateTime).getTime() >= currentTime,
    );
    const urls: string[] = [];
    for (const e of upcoming) {
      if (typeof e.image === "string" && e.image.length > 0) {
        urls.push(e.image);
        if (urls.length >= 3) break;
      }
    }
    return {
      imageUris: [urls[0] ?? null, urls[1] ?? null, urls[2] ?? null],
      upcomingCount: upcoming.length,
      hasMoreUpcoming: feedStatus === "CanLoadMore",
    };
  }, [events, stableTimestamp, feedStatus]);

  // Fallback handling: if the referral target doesn't exist or resolves to
  // the current user, clear the pending state and fall back to the default
  // empty state. The Clerk-username check is sync/cached, so it catches the
  // self-share case even before the convex `currentUserRecord` query resolves.
  const clerkUsernameLower = clerkUser?.username?.toLowerCase() ?? null;
  const pendingUsernameLower = pendingFollowUsername?.toLowerCase() ?? null;
  const isSelfReferral =
    clerkUsernameLower != null &&
    pendingUsernameLower != null &&
    clerkUsernameLower === pendingUsernameLower;

  const shouldFallback =
    pendingFollowUsername != null &&
    (isSelfReferral ||
      // Target lookup resolved with null (user doesn't exist)
      targetUser === null ||
      // OR target is the current signed-in user (confirmed via convex lookup)
      (targetUserFound &&
        currentUserId !== undefined &&
        targetUser.id === currentUserId));

  useEffect(() => {
    if (shouldFallback) {
      setPendingFollowUsername(null);
    }
  }, [shouldFallback, setPendingFollowUsername]);

  const handleSubscribe = useCallback(() => {
    if (!personalList || isMutatingRef.current) return;
    // Defense in depth: if the Clerk username matches the pending username, a
    // tap between `targetUser` resolving and `currentUserRecord` resolving would
    // otherwise follow the user's own list. The fallback effect will also clear
    // pending; bail out so we never call the mutation for the self-share case.
    if (isSelfReferral) return;
    isMutatingRef.current = true;
    void hapticLight();
    followListMutation({ listId: personalList.id })
      .then(() => {
        // Clear pending on confirmed success. If the mutation had failed, the
        // optimistic revert would drop hasFollowings back to false and the
        // parent's latch effect would re-show this referral empty state so
        // the user can retry.
        setPendingFollowUsername(null);
      })
      .catch((error: unknown) => {
        logError("Error subscribing from referral empty state", error, {
          listId: personalList.id,
        });
        toast.error("Something went wrong. Please try again.");
      })
      .finally(() => {
        isMutatingRef.current = false;
      });
    // Optimistic dismiss: the optimistic update flips hasFollowings to true,
    // so dismissing the empty state here shows the populated feed immediately.
    onExitToFeed();
  }, [
    personalList,
    isSelfReferral,
    followListMutation,
    setPendingFollowUsername,
    onExitToFeed,
  ]);

  // If pending was cleared (e.g., by fallback effect), render default. The
  // `targetUser === null` clause is logically redundant with `shouldFallback`
  // but is required here so TypeScript can narrow `targetUser` below — TS
  // cannot see through the `shouldFallback` composition.
  if (!pendingFollowUsername || shouldFallback || targetUser === null) {
    return (
      <DefaultEmptyState
        hasFollowings={hasFollowings}
        followedEventCount={followedEventCount}
        hasMoreFollowedEvents={hasMoreFollowedEvents}
        followedLists={followedLists}
        onExitToFeed={onExitToFeed}
      />
    );
  }

  // Still loading the target user — avoid flashing the default state.
  if (targetUser === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F4F1FF" }}>
        <LoadingSpinner />
      </View>
    );
  }

  // From here on, `targetUser` is a resolved, non-null user doc.

  const displayName =
    targetUser.displayName && targetUser.displayName.length > 0
      ? targetUser.displayName
      : `@${pendingFollowUsername}`;

  const upcomingLabel =
    upcomingCount === 0
      ? "No upcoming events yet"
      : upcomingCount === 1
        ? "1 upcoming event"
        : `${upcomingCount}${hasMoreUpcoming ? "+" : ""} upcoming events`;

  return (
    <>
      <UsernameEntryModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubscribeSuccess={onExitToFeed}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 80,
        }}
      >
        <View className="px-3 pb-2" style={{ marginTop: -4 }}>
          <Text
            className="mb-1 text-base font-medium text-neutral-2"
            style={{ paddingLeft: 6 }}
          >
            Events from lists I subscribe to
          </Text>
        </View>

        <View className="px-6 pt-6">
          {/* Hero block */}
          <View className="mb-4 flex-row items-center gap-3">
            {targetUser.userImage ? (
              <Image
                source={{ uri: targetUser.userImage }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-4">
                <User size={24} color="#627496" />
              </View>
            )}
            <Text
              className="flex-1 text-2xl font-bold text-neutral-1"
              style={{ lineHeight: 30 }}
            >
              {displayName} shared with you
            </Text>
          </View>

          {/* Preview card */}
          <View className="mb-6 flex-row items-center gap-3">
            <ScenePreviewThreeUp imageUris={imageUris} align="start" />
            <View className="min-w-0 flex-1">
              <Text
                className="text-base font-semibold text-neutral-1"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
                {"'"}s list
              </Text>
              <Text
                className="text-sm text-neutral-2"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {upcomingLabel}
              </Text>
            </View>
          </View>

          {/* Primary CTA — fire-and-forget with optimistic update, matching
              the FeaturedListRow subscribe pattern. */}
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={!personalList}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Subscribe to ${displayName}`}
            className={`mb-4 w-full rounded-full py-4 ${
              !personalList ? "bg-gray-400" : "bg-interactive-1"
            }`}
          >
            <Text className="text-center text-base font-semibold text-white">
              Subscribe to {displayName}
            </Text>
          </TouchableOpacity>

          {/* Secondary: find someone else */}
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-neutral-2">Not them?</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Find someone else"
              className="px-1 py-1"
            >
              <Text className="text-sm font-semibold text-interactive-1">
                Find someone else
              </Text>
            </TouchableOpacity>
          </View>

          {hasFollowings ? (
            <View className="mt-6 items-center">
              <Text className="mb-1 text-sm text-neutral-2">
                {followedEventCount === 1
                  ? "1 event added to My Scene"
                  : `${followedEventCount}${
                      hasMoreFollowedEvents ? "+" : ""
                    } events added to My Scene`}
              </Text>
              <TouchableOpacity
                onPress={onExitToFeed}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View My Scene"
                className="px-2 py-2"
              >
                <Text className="text-base font-semibold text-interactive-1">
                  View My Scene →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
