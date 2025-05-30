import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import SaveButton from "~/components/SaveButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useStableTimestamp } from "~/store";
import { getPlanStatusFromUser } from "~/utils/plan";

function DiscoverContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  const {
    results: events,
    status,
    loadMore,
    isLoading,
  } = useStablePaginatedQuery(
    api.events.getDiscoverPaginated,
    { beforeThisDateTime: stableTimestamp },
    {
      initialNumItems: 20,
    },
  );

  // Memoize saved events query args to prevent unnecessary re-renders
  const savedEventsQueryArgs = useMemo(() => {
    if (!user?.username) return "skip";
    return { userName: user.username };
  }, [user?.username]);

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    savedEventsQueryArgs,
  );

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
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
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
        <View className="flex-1 bg-white"></View>
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
