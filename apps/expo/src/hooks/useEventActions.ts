import type { FunctionReturnType } from "convex/server";
import { Linking, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useSegments } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  optimisticallyUpdateValueInPaginatedQuery,
  useMutation,
} from "convex/react";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { useStableTimestamp } from "~/store";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { getPlanStatusFromUser } from "~/utils/plan";
import { useCalendar } from "./useCalendar";
import { trackEvent } from "~/utils/analytics";

interface UseEventActionsProps {
  event: FunctionReturnType<typeof api.events.get> | undefined;
  isSaved: boolean;
  demoMode?: boolean;
  onDelete?: () => Promise<void>;
}

export function useEventActions({
  event,
  isSaved,
  demoMode = false,
  onDelete,
}: UseEventActionsProps) {
  const { handleAddToCal: addToCalendar } = useCalendar();
  const { user } = useUser();
  const isOwner = demoMode || (event && user?.id === event.user?.id);
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const stableTimestamp = useStableTimestamp();

  const deleteEventMutation = useMutation(api.events.deleteEvent);
  const unfollowEventMutation = useMutation(api.events.unfollow);
  const followEventMutation = useMutation(api.events.follow);

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

  // Retrieve the current navigation segments so we can attribute events to the correct screen
  const segments = useSegments();
  const screen = segments.join("/");

  const handleShare = async () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    trackEvent({
      name: "event_share",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    try {
      await Share.share({
        url: `${Config.apiBaseUrl}/event/${event.id}`,
      });
    } catch (error) {
      logError("Error sharing event", error);
    }
  };

  const handleDirections = () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    trackEvent({
      name: "event_get_directions",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
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
    trackEvent({
      name: "event_add_to_calendar",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    await addToCalendar(event);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
    if (!event || checkDemoMode() || !isOwner) return;
    triggerHaptic();
    trackEvent({
      name: "event_toggle_visibility",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
        newVisibility,
      },
    });
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
    trackEvent({
      name: "event_edit",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    router.push(`/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
    if (!event || checkDemoMode() || !isOwner) return;
    triggerHaptic();
    trackEvent({
      name: "event_delete_attempt",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    const loadingToastId = toast.loading("Deleting event...");
    try {
      if (onDelete) {
        await onDelete();
      } else {
        await deleteEventMutation({ id: event.id });
      }
      trackEvent({
        name: "event_delete_success",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
        },
      });
      toast.dismiss(loadingToastId);
      toast.success("Event deleted successfully");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to delete event: ${(error as Error).message}`);
      trackEvent({
        name: "event_delete_error",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
          error: (error as Error).message,
        },
      });
    }
  };

  const handleFollow = async () => {
    if (!event || checkDemoMode() || isOwner || isSaved) return;
    triggerHaptic();
    trackEvent({
      name: "event_follow_attempt",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    const loadingToastId = toast.loading("Following event...");
    try {
      await followEventMutation({ id: event.id });
      toast.dismiss(loadingToastId);
      toast.success("Event followed");
      trackEvent({
        name: "event_follow_success",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
        },
      });
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to follow event: ${(error as Error).message}`);
      trackEvent({
        name: "event_follow_error",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
          error: (error as Error).message,
        },
      });
    }
  };

  const handleUnfollow = async () => {
    if (!event || checkDemoMode() || isOwner || !isSaved) return;
    triggerHaptic();
    trackEvent({
      name: "event_unfollow_attempt",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    const loadingToastId = toast.loading("Unfollowing event...");
    try {
      await unfollowEventMutation({ id: event.id });
      toast.dismiss(loadingToastId);
      toast.success("Event unfollowed");
      trackEvent({
        name: "event_unfollow_success",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
        },
      });
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to unfollow event: ${(error as Error).message}`);
      trackEvent({
        name: "event_unfollow_error",
        properties: {
          component: "useEventActions",
          screen,
          eventId: event.id,
          error: (error as Error).message,
        },
      });
    }
  };

  const handleShowQR = () => {
    if (!event || checkDemoMode()) return;
    triggerHaptic();
    trackEvent({
      name: "event_show_qr",
      properties: {
        component: "useEventActions",
        screen,
        eventId: event.id,
      },
    });
    router.push(`/event/${event.id}/qr`);
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
  const unfollowEventMutation = useMutation(api.events.unfollow);
  const followEventMutation = useMutation(api.events.follow);

  // Retrieve navigation segments for this hook as well (used below in helper hook)
  const segmentsSave = useSegments();
  const screenSave = segmentsSave.join("/");

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
    trackEvent({
      name: "event_follow_attempt",
      properties: {
        component: "useEventSaveActions",
        screen: screenSave,
        eventId: eventId,
      },
    });
    const loadingToastId = toast.loading("Following event...");
    try {
      await followEventMutation({ id: eventId });
      toast.dismiss(loadingToastId);
      toast.success("Event followed");
      trackEvent({
        name: "event_follow_success",
        properties: {
          component: "useEventSaveActions",
          screen: screenSave,
          eventId: eventId,
        },
      });
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to follow event: ${(error as Error).message}`);
      trackEvent({
        name: "event_follow_error",
        properties: {
          component: "useEventSaveActions",
          screen: screenSave,
          eventId: eventId,
          error: (error as Error).message,
        },
      });
    }
  };

  const handleUnfollow = async () => {
    if (checkDemoMode() || !isSaved) return;
    triggerHaptic();
    trackEvent({
      name: "event_unfollow_attempt",
      properties: {
        component: "useEventSaveActions",
        screen: screenSave,
        eventId: eventId,
      },
    });
    const loadingToastId = toast.loading("Unfollowing event...");
    try {
      await unfollowEventMutation({ id: eventId });
      toast.dismiss(loadingToastId);
      toast.success("Event unfollowed");
      trackEvent({
        name: "event_unfollow_success",
        properties: {
          component: "useEventSaveActions",
          screen: screenSave,
          eventId: eventId,
        },
      });
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to unfollow event: ${(error as Error).message}`);
      trackEvent({
        name: "event_unfollow_error",
        properties: {
          component: "useEventSaveActions",
          screen: screenSave,
          eventId: eventId,
          error: (error as Error).message,
        },
      });
    }
  };

  return {
    handleFollow,
    handleUnfollow,
  };
}
