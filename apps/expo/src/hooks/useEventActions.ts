import type { FunctionReturnType } from "convex/server";
import { Linking, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  optimisticallyUpdateValueInPaginatedQuery,
  useMutation,
} from "convex/react";
import { usePostHog } from "posthog-react-native";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { useStableTimestamp } from "~/store";
import { AF_EVENTS, trackAFEvent } from "~/utils/appsflyerEvents";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { getPlanStatusFromUser } from "~/utils/plan";
import { useCalendar } from "./useCalendar";

interface UseEventActionsProps {
  event: FunctionReturnType<typeof api.events.get> | undefined;
  isSaved: boolean;
  demoMode?: boolean;
  onDelete?: () => Promise<void>;
  source?: string;
}

export function useEventActions({
  event,
  isSaved,
  demoMode = false,
  onDelete,
  source,
}: UseEventActionsProps) {
  const { handleAddToCal: addToCalendar } = useCalendar();
  const { user } = useUser();
  const isOwner = demoMode || (event && user?.id === event.user?.id);
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const stableTimestamp = useStableTimestamp();
  const posthog = usePostHog();

  const deleteEventMutation = useMutation(api.events.deleteEvent);

  const unfollowEventMutation = useMutation(
    api.events.unfollow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;

    // Update the saved event IDs query if loaded
    if (user?.username) {
      const currentSavedIds = localStore.getQuery(
        api.events.getSavedIdsForUser,
        {
          userName: user.username,
        },
      );

      if (currentSavedIds !== undefined) {
        // Remove the event from saved IDs
        const updatedSavedIds = currentSavedIds.filter(
          (savedEvent) => savedEvent.id !== id,
        );
        localStore.setQuery(
          api.events.getSavedIdsForUser,
          { userName: user.username },
          updatedSavedIds,
        );
      }
    }
  });

  const followEventMutation = useMutation(
    api.events.follow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;

    // Update the saved event IDs query if loaded
    if (user?.username) {
      const currentSavedIds = localStore.getQuery(
        api.events.getSavedIdsForUser,
        {
          userName: user.username,
        },
      );

      if (currentSavedIds !== undefined) {
        // Add the event to saved IDs
        const updatedSavedIds = [...currentSavedIds, { id }];
        localStore.setQuery(
          api.events.getSavedIdsForUser,
          { userName: user.username },
          updatedSavedIds,
        );
      }
    }
  });

  // Use optimistic updates for visibility toggle
  const toggleVisibilityMutation = useMutation(
    api.events.toggleVisibility,
  ).withOptimisticUpdate((localStore, args) => {
    const { id, visibility } = args;

    // Update user events queries if they're loaded and the user owns the event
    if (user?.username && event?.user?.username === user.username) {
      // Update paginated events for user (used in feed)
      optimisticallyUpdateValueInPaginatedQuery(
        localStore,
        api.events.getEventsForUserPaginated,
        {
          userName: user.username,
          filter: "upcoming",
          beforeThisDateTime: stableTimestamp,
        },
        (currentValue) => {
          if (currentValue.id === id) {
            return {
              ...currentValue,
              visibility,
            };
          }
          return currentValue;
        },
      );
      optimisticallyUpdateValueInPaginatedQuery(
        localStore,
        api.events.getEventsForUserPaginated,
        {
          userName: user.username,
          filter: "past",
          beforeThisDateTime: stableTimestamp,
        },
        (currentValue) => {
          if (currentValue.id === id) {
            return {
              ...currentValue,
              visibility,
            };
          }
          return currentValue;
        },
      );
    }
  });

  const triggerHaptic = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const checkDemoMode = () => {
    if (demoMode) {
      toast("Demo mode: action disabled");
      return true;
    }
    return false;
  };

  const handleShare = async () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();

    const eventData = event.event as AddToCalendarButtonPropsRestricted;

    try {
      // Track share initiated
      posthog.capture("share_event_initiated", {
        event_id: event.id,
        event_title: eventData.name ?? "Unknown",
        source: source ?? "event_detail",
        is_owner: Boolean(isOwner),
        is_saved: Boolean(isSaved),
        has_location: !!eventData.location,
      });

      const result = await Share.share({
        url: `${Config.apiBaseUrl}/event/${event.id}`,
      });

      // Track share completed if user didn't dismiss
      if (result.action === Share.sharedAction) {
        posthog.capture("share_event_completed", {
          event_id: event.id,
          event_title: eventData.name ?? "Unknown",
          source: source ?? "event_detail",
          is_owner: Boolean(isOwner),
          is_saved: Boolean(isSaved),
        });
        trackAFEvent(AF_EVENTS.SHARE, {
          af_content_id: event.id,
          af_content_type: "event",
        });
      } else if (result.action === Share.dismissedAction) {
        posthog.capture("share_event_dismissed", {
          event_id: event.id,
          event_title: eventData.name ?? "Unknown",
          source: source ?? "event_detail",
          is_owner: Boolean(isOwner),
          is_saved: Boolean(isSaved),
        });
      }
    } catch (error) {
      posthog.capture("share_event_error", {
        event_id: event.id,
        source: source ?? "event_detail",
        error_message: (error as Error).message,
      });
      logError("Error sharing event", error);
    }
  };

  const handleDirections = () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    if (eventData.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        eventData.location,
      )}`;
      void Linking.openURL(url);
    } else {
      logError(
        "No location available for directions",
        new Error("No location data"),
      );
    }
  };

  const handleAddToCal = async () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    await addToCalendar(event);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
    if (!event || checkDemoMode() || !isOwner) return;
    triggerHaptic();
    try {
      await toggleVisibilityMutation({
        id: event.id,
        visibility: newVisibility,
      });
    } catch (error) {
      toast.error(
        `Failed to update event visibility: ${(error as Error).message}`,
      );
    }
  };

  const handleEdit = () => {
    if (!event || checkDemoMode() || !isOwner) return;
    triggerHaptic();
    router.navigate(`/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
    if (!event || checkDemoMode() || !isOwner) return;
    triggerHaptic();
    const loadingToastId = toast.loading("Deleting event...");
    try {
      if (onDelete) {
        await onDelete();
      } else {
        await deleteEventMutation({ id: event.id });
      }
      toast.dismiss(loadingToastId);
      toast.success("Event deleted successfully");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to delete event: ${(error as Error).message}`);
    }
  };

  const handleFollow = async () => {
    if (!event || checkDemoMode() || isOwner || isSaved) return;
    triggerHaptic();
    try {
      await followEventMutation({ id: event.id });
      toast.success("Event saved");
    } catch (error) {
      toast.error(`Failed to save event: ${(error as Error).message}`);
    }
  };

  const handleUnfollow = async () => {
    if (!event || checkDemoMode() || isOwner || !isSaved) return;
    triggerHaptic();
    try {
      await unfollowEventMutation({ id: event.id });
      toast.success("Event unsaved");
    } catch (error) {
      toast.error(`Failed to unsave event: ${(error as Error).message}`);
    }
  };

  const handleShowQR = () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    router.navigate(`/event/${event.id}/qr`);
  };

  return {
    handleShare,
    handleDirections,
    handleAddToCal,
    handleToggleVisibility,
    handleEdit,
    handleDelete,
    handleFollow,
    handleUnfollow,
    handleShowQR,
    showDiscover,
  };
}

// Simplified hook for save/follow actions that doesn't require the full event object
export function useEventSaveActions(
  eventId: string,
  isSaved: boolean,
  demoMode = false,
) {
  const { user } = useUser();

  const unfollowEventMutation = useMutation(
    api.events.unfollow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;

    // Update the saved event IDs query if loaded
    if (user?.username) {
      const currentSavedIds = localStore.getQuery(
        api.events.getSavedIdsForUser,
        {
          userName: user.username,
        },
      );

      if (currentSavedIds !== undefined) {
        // Remove the event from saved IDs
        const updatedSavedIds = currentSavedIds.filter(
          (savedEvent) => savedEvent.id !== id,
        );
        localStore.setQuery(
          api.events.getSavedIdsForUser,
          { userName: user.username },
          updatedSavedIds,
        );
      }
    }
  });

  const followEventMutation = useMutation(
    api.events.follow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;

    // Update the saved event IDs query if loaded
    if (user?.username) {
      const currentSavedIds = localStore.getQuery(
        api.events.getSavedIdsForUser,
        {
          userName: user.username,
        },
      );

      if (currentSavedIds !== undefined) {
        // Add the event to saved IDs
        const updatedSavedIds = [...currentSavedIds, { id }];
        localStore.setQuery(
          api.events.getSavedIdsForUser,
          { userName: user.username },
          updatedSavedIds,
        );
      }
    }
  });

  const triggerHaptic = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const checkDemoMode = () => {
    if (demoMode) {
      toast("Demo mode: action disabled");
      return true;
    }
    return false;
  };

  const handleFollow = async () => {
    if (checkDemoMode() || isSaved) return;
    triggerHaptic();
    try {
      await followEventMutation({ id: eventId });
      toast.success("Event saved");
    } catch (error) {
      toast.error(`Failed to save event: ${(error as Error).message}`);
    }
  };

  const handleUnfollow = async () => {
    if (checkDemoMode() || !isSaved) return;
    triggerHaptic();
    try {
      await unfollowEventMutation({ id: eventId });
      toast.success("Event unsaved");
    } catch (error) {
      toast.error(`Failed to unsave event: ${(error as Error).message}`);
    }
  };

  return {
    handleFollow,
    handleUnfollow,
  };
}
