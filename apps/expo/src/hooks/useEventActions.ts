import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  optimisticallyUpdateValueInPaginatedQuery,
  useMutation,
} from "convex/react";
import { usePostHog } from "posthog-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { useToast } from "~/components/Toast";
import { useStableTimestamp } from "~/store";
import { AF_EVENTS, trackAFEvent } from "~/utils/appsflyerEvents";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";
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

  const checkDemoMode = () => {
    if (demoMode) {
      toast.warning("Demo mode: action disabled");
      return true;
    }
    return false;
  };

  const handleShare = async () => {
    if (!event || checkDemoMode()) return;
    void hapticSuccess();

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
    void hapticSuccess();
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
    void hapticSuccess();
    await addToCalendar(event);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
    if (!event || checkDemoMode() || !isOwner) return;
    void hapticSuccess();
    try {
      await toggleVisibilityMutation({
        id: event.id,
        visibility: newVisibility,
      });
    } catch (error) {
      toast.error("Failed to update visibility", (error as Error).message);
    }
  };

  const handleEdit = () => {
    if (!event || checkDemoMode() || !isOwner) return;
    void hapticSuccess();
    router.navigate(`/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
    if (!event || checkDemoMode() || !isOwner) return;
    void hapticSuccess();
    try {
      if (onDelete) {
        await onDelete();
      } else {
        await deleteEventMutation({ id: event.id });
      }
    } catch (error) {
      toast.error("Failed to delete event", (error as Error).message);
    }
  };

  const handleFollow = async () => {
    if (!event || checkDemoMode() || isOwner || isSaved) return;
    void hapticSuccess();
    try {
      await followEventMutation({ id: event.id });
    } catch (error) {
      toast.error("Failed to save event", (error as Error).message);
    }
  };

  const handleUnfollow = async () => {
    if (!event || checkDemoMode() || isOwner || !isSaved) return;
    void hapticSuccess();
    try {
      await unfollowEventMutation({ id: event.id });
    } catch (error) {
      toast.error("Failed to unsave event", (error as Error).message);
    }
  };

  const handleShowQR = () => {
    if (!event || checkDemoMode()) return;
    void hapticSuccess();
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
  initialIsSaved: boolean,
  options: { source?: string; demoMode?: boolean } = {},
) {
  const { source = "unknown", demoMode = false } = options;
  const { user } = useUser();
  const posthog = usePostHog();
  const toast = useToast();

  // Local state owns the UI. Seeded from prop. Updated synchronously on toggle.
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  // If the parent prop changes (e.g., query refetch) and no mutation is in flight,
  // sync the local state to match.
  useEffect(() => {
    if (!pendingRef.current) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved, eventId]);

  const followEventMutation = useMutation(
    api.events.follow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;
    if (!user?.username) return;
    const currentSavedIds = localStore.getQuery(api.events.getSavedIdsForUser, {
      userName: user.username,
    });
    if (currentSavedIds !== undefined) {
      const updatedSavedIds = [...currentSavedIds, { id }];
      localStore.setQuery(
        api.events.getSavedIdsForUser,
        { userName: user.username },
        updatedSavedIds,
      );
    }
  });

  const unfollowEventMutation = useMutation(
    api.events.unfollow,
  ).withOptimisticUpdate((localStore, args) => {
    const { id } = args;
    if (!user?.username) return;
    const currentSavedIds = localStore.getQuery(api.events.getSavedIdsForUser, {
      userName: user.username,
    });
    if (currentSavedIds !== undefined) {
      const updatedSavedIds = currentSavedIds.filter(
        (savedEvent) => savedEvent.id !== id,
      );
      localStore.setQuery(
        api.events.getSavedIdsForUser,
        { userName: user.username },
        updatedSavedIds,
      );
    }
  });

  const openShareSheet = useCallback(
    async (via: "save_toast" | "event_detail" | "event_card") => {
      try {
        posthog.capture("share_event_initiated", {
          event_id: eventId,
          source,
          is_saved: true,
          via,
        });

        const result = await Share.share({
          url: `${Config.apiBaseUrl}/event/${eventId}`,
        });

        if (result.action === Share.sharedAction) {
          posthog.capture("share_event_completed", {
            event_id: eventId,
            source,
            is_saved: true,
            via,
          });
        } else if (result.action === Share.dismissedAction) {
          posthog.capture("share_event_dismissed", {
            event_id: eventId,
            source,
            is_saved: true,
            via,
          });
        }
      } catch (error) {
        posthog.capture("share_event_error", {
          event_id: eventId,
          source,
          via,
          error_message: (error as Error).message,
        });
        logError("Error sharing event", error);
      }
    },
    [eventId, source, posthog],
  );

  const runSave = useCallback(async () => {
    pendingRef.current = true;
    setIsPending(true);
    try {
      await followEventMutation({ id: eventId });
      posthog.capture("event_saved", { event_id: eventId, source });
    } catch (error) {
      // Revert local state on error
      setIsSaved(false);
      posthog.capture("event_save_failed", {
        event_id: eventId,
        source,
        error_message: (error as Error).message,
      });
      toast.show({
        message: "Couldn't save event",
        action: {
          label: "Retry",
          onPress: () => {
            setIsSaved(true);
            void runSave();
          },
        },
        variant: "error",
      });
      logError("Error saving event", error);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, [eventId, followEventMutation, source, posthog, toast]);

  const runUnsave = useCallback(async () => {
    pendingRef.current = true;
    setIsPending(true);
    try {
      await unfollowEventMutation({ id: eventId });
      posthog.capture("event_unsaved", { event_id: eventId, source });
    } catch (error) {
      // Revert local state on error
      setIsSaved(true);
      toast.show({
        message: "Couldn't unsave event",
        action: {
          label: "Retry",
          onPress: () => {
            setIsSaved(false);
            void runUnsave();
          },
        },
        variant: "error",
      });
      logError("Error unsaving event", error);
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, [eventId, unfollowEventMutation, source, posthog, toast]);

  const toggle = useCallback(() => {
    if (pendingRef.current) return;
    if (demoMode) {
      toast.show({
        message: "Demo mode: action disabled",
        variant: "error",
      });
      return;
    }

    if (isSaved) {
      // Unsave: silent (no toast, no haptic per spec).
      setIsSaved(false);
      void runUnsave();
    } else {
      // Save: instant UI flip, light haptic, success toast with Share action.
      setIsSaved(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toast.show({
        message: "Saved to your list",
        action: {
          label: "Share",
          onPress: () => {
            posthog.capture("save_toast_share_clicked", {
              event_id: eventId,
              source,
            });
            void openShareSheet("save_toast");
          },
        },
      });
      void runSave();
    }
  }, [
    demoMode,
    isSaved,
    runSave,
    runUnsave,
    toast,
    openShareSheet,
    posthog,
    eventId,
    source,
  ]);

  return {
    isSaved,
    isPending,
    toggle,
    openShareSheet,
  };
}
