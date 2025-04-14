import { Linking, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { getPlanStatusFromUser } from "~/utils/plan";
import { useCalendar } from "./useCalendar";

interface UseEventActionsProps {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
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
  const utils = api.useUtils();
  const { handleAddToCal: addToCalendar } = useCalendar();
  const { user } = useUser();
  const isOwner = demoMode || user?.id === event.user?.id;
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;

  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const unfollowEventMutation = api.event.unfollow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const followEventMutation = api.event.follow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const toggleVisibilityMutation = api.event.toggleVisibility.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
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
      await toggleVisibilityMutation.mutateAsync({
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
        await deleteEventMutation.mutateAsync({ id: event.id });
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
      await followEventMutation.mutateAsync({ id: event.id });
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
      await unfollowEventMutation.mutateAsync({ id: event.id });
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
