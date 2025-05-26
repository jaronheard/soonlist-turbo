import type { FunctionReturnType } from "convex/server";
import { Linking, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { getPlanStatusFromUser } from "~/utils/plan";
import { useCalendar } from "./useCalendar";

interface UseEventActionsProps {
  event: NonNullable<FunctionReturnType<typeof api.events.get>>;
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
  const isOwner = demoMode || user?.id === event.user?.id;
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;

  const deleteEventMutation = useMutation(api.events.deleteEvent);
  const unfollowEventMutation = useMutation(api.events.unfollow);
  const followEventMutation = useMutation(api.events.follow);

  // Use optimistic updates for visibility toggle
  const toggleVisibilityMutation = useMutation(
    api.events.toggleVisibility,
  ).withOptimisticUpdate((localStore, args) => {
    const { id, visibility } = args;

    // Update the single event query if it's loaded
    const currentEvent = localStore.getQuery(api.events.get, { eventId: id });
    if (currentEvent !== undefined && currentEvent !== null) {
      localStore.setQuery(
        api.events.get,
        { eventId: id },
        {
          ...currentEvent,
          visibility,
        },
      );
    }

    // Update user events queries if they're loaded and the user owns the event
    if (user?.username && event.user?.username === user.username) {
      // Update upcoming events for user
      const upcomingEvents = localStore.getQuery(
        api.events.getUpcomingForUser,
        {
          userName: user.username,
        },
      );
      if (upcomingEvents !== undefined) {
        const updatedUpcomingEvents = upcomingEvents.map((evt) =>
          evt.id === id ? { ...evt, visibility } : evt,
        );
        localStore.setQuery(
          api.events.getUpcomingForUser,
          {
            userName: user.username,
          },
          updatedUpcomingEvents,
        );
      }

      // Update created events for user
      const createdEvents = localStore.getQuery(api.events.getCreatedForUser, {
        userName: user.username,
      });
      if (createdEvents !== undefined) {
        const updatedCreatedEvents = createdEvents.map((evt) =>
          evt.id === id ? { ...evt, visibility } : evt,
        );
        localStore.setQuery(
          api.events.getCreatedForUser,
          {
            userName: user.username,
          },
          updatedCreatedEvents,
        );
      }

      // Update events for user
      const userEvents = localStore.getQuery(api.events.getForUser, {
        userName: user.username,
      });
      if (userEvents !== undefined) {
        const updatedUserEvents = userEvents.map((evt) =>
          evt.id === id ? { ...evt, visibility } : evt,
        );
        localStore.setQuery(
          api.events.getForUser,
          {
            userName: user.username,
          },
          updatedUserEvents,
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

  const handleShare = async () => {
    if (checkDemoMode()) return;
    triggerHaptic();
    try {
      await Share.share({
        url: `${Config.apiBaseUrl}/event/${event.id}`,
      });
    } catch (error) {
      logError("Error sharing event", error);
    }
  };

  const handleDirections = () => {
    if (checkDemoMode()) return;
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
    if (checkDemoMode()) return;
    triggerHaptic();
    await addToCalendar(event);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
    if (checkDemoMode() || !isOwner) return;
    triggerHaptic();
    const action = newVisibility === "public" ? "Adding to" : "Removing from";
    const loadingToastId = toast.loading(`${action} Discover...`);
    try {
      await toggleVisibilityMutation({
        id: event.id,
        visibility: newVisibility,
      });
      toast.dismiss(loadingToastId);
      const actionCompleted =
        newVisibility === "public" ? "added to" : "removed from";
      toast.success(`Event ${actionCompleted} Discover`);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(
        `Failed to update event visibility: ${(error as Error).message}`,
      );
    }
  };

  const handleEdit = () => {
    if (checkDemoMode() || !isOwner) return;
    triggerHaptic();
    router.push(`/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
    if (checkDemoMode() || !isOwner) return;
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
    if (checkDemoMode() || isOwner || isSaved) return;
    triggerHaptic();
    const loadingToastId = toast.loading("Following event...");
    try {
      await followEventMutation({ id: event.id });
      toast.dismiss(loadingToastId);
      toast.success("Event followed");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to follow event: ${(error as Error).message}`);
    }
  };

  const handleUnfollow = async () => {
    if (checkDemoMode() || isOwner || !isSaved) return;
    triggerHaptic();
    const loadingToastId = toast.loading("Unfollowing event...");
    try {
      await unfollowEventMutation({ id: event.id });
      toast.dismiss(loadingToastId);
      toast.success("Event unfollowed");
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Failed to unfollow event: ${(error as Error).message}`);
    }
  };

  const handleShowQR = () => {
    if (checkDemoMode()) return;
    triggerHaptic();
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
