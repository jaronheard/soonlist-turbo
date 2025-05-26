import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  usePaginatedQuery,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import { ConvexAuthExample } from "~/components/ConvexAuthExample";
import LoadingSpinner from "~/components/LoadingSpinner";
import SaveButton from "~/components/SaveButton";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { getPlanStatusFromUser } from "~/utils/plan";

// Type adapter to transform Convex data to match component expectations
function transformConvexEvent(convexEvent: any) {
  return {
    ...convexEvent,
    startDateTime: new Date(convexEvent.startDateTime),
    endDateTime: new Date(convexEvent.endDateTime),
    createdAt: new Date(convexEvent.createdAt),
    updatedAt: convexEvent.updatedAt ? new Date(convexEvent.updatedAt) : null,
    user: convexEvent.user
      ? {
          ...convexEvent.user,
          createdAt: new Date(convexEvent.user.createdAt),
          updatedAt: convexEvent.user.updatedAt
            ? new Date(convexEvent.user.updatedAt)
            : null,
          onboardingCompletedAt: convexEvent.user.onboardingCompletedAt
            ? new Date(convexEvent.user.onboardingCompletedAt)
            : null,
        }
      : convexEvent.user,
    comments:
      convexEvent.comments?.map((comment: any) => ({
        ...comment,
        createdAt: new Date(comment.createdAt),
        updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : null,
      })) || [],
  };
}

function DiscoverContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const {
    results: events,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.events.getDiscoverPaginated,
    {},
    {
      initialNumItems: 20,
    },
  );

  const savedEventIdsQuery = useQuery(api.events.getSavedIdsForUser, {
    userName: user?.username ?? "",
  });

  const onRefresh = useCallback(async () => {
    // Convex queries are automatically reactive, so we don't need manual refresh
    // The usePaginatedQuery will automatically update when data changes
  }, []);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  // Check if user has access to discover feature after all hooks
  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const { showDiscover } = getPlanStatusFromUser(user);

  if (!showDiscover) {
    return <Redirect href="/feed" />;
  }

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  function SaveButtonWrapper({ event }: { event: { id: string } }) {
    return (
      <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ConvexAuthExample />
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            isRefetching={status === "LoadingMore"}
            onRefresh={onRefresh}
            onEndReached={handleLoadMore}
            isFetchingNextPage={status === "LoadingMore"}
            ActionButton={SaveButtonWrapper}
            showCreator="always"
            hasUnlimited={hasUnlimited}
            hideDiscoverableButton={true}
          />
          <AddEventButton showChevron={false} />
        </View>
      )}
    </View>
  );
}

export default function Page() {
  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        <Redirect href="/sign-in" />
      </Unauthenticated>

      <Authenticated>
        <DiscoverContent />
      </Authenticated>
    </>
  );
}
