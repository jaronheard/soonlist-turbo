import type { LucideIcon } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Linking,
  Share,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  CalendarPlus,
  EyeOff,
  Globe2,
  Map,
  MinusCircle,
  MoreVertical,
  PenSquare,
  PlusCircle,
  QrCode,
  ShareIcon,
  Trash2,
} from "lucide-react-native";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemIcon,
  ContextMenuItemTitle,
  ContextMenuRoot,
  ContextMenuTrigger,
} from "~/components/ui/context-menu-primitives";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu-primitives";
import { useCalendar } from "~/hooks/useCalendar";
import { api } from "~/utils/api";
import Config from "~/utils/config";

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.6; // 60% of screen width

interface EventMenuProps {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
  isOwner: boolean;
  isSaved: boolean;
  menuType: "context" | "popup";
  children?: React.ReactNode;
  onDelete?: () => Promise<void>;
}

interface MenuItem {
  title: string;
  lucideIcon: LucideIcon;
  systemIcon:
    | "square.and.arrow.up"
    | "qrcode"
    | "map"
    | "calendar.badge.plus"
    | "eye.slash"
    | "globe"
    | "square.and.pencil"
    | "trash"
    | "plus.circle"
    | "minus.circle"; // Valid SF Symbols
  destructive?: boolean;
}

export function EventMenu({
  event,
  isOwner,
  isSaved,
  menuType,
  children,
  onDelete,
}: EventMenuProps) {
  const utils = api.useUtils();
  const { handleAddToCal: addToCalendar } = useCalendar();

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

  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      {
        title: "Share",
        lucideIcon: ShareIcon,
        systemIcon: "square.and.arrow.up",
      },
      {
        title: "Show QR",
        lucideIcon: QrCode,
        systemIcon: "qrcode",
      },
      {
        title: "Directions",
        lucideIcon: Map,
        systemIcon: "map",
      },
      {
        title: "Add to calendar",
        lucideIcon: CalendarPlus,
        systemIcon: "calendar.badge.plus",
      },
    ];

    if (isOwner) {
      return [
        ...baseItems,
        {
          title:
            event.visibility === "public"
              ? "Make not discoverable"
              : "Make discoverable",
          lucideIcon: event.visibility === "public" ? EyeOff : Globe2,
          systemIcon: event.visibility === "public" ? "eye.slash" : "globe",
        },
        {
          title: "Edit",
          lucideIcon: PenSquare,
          systemIcon: "square.and.pencil",
        },
        {
          title: "Delete",
          lucideIcon: Trash2,
          systemIcon: "trash",
          destructive: true,
        },
      ];
    } else if (!isSaved) {
      return [
        {
          title: "Add to My Feed",
          lucideIcon: PlusCircle,
          systemIcon: "plus.circle",
        },
        ...baseItems,
      ];
    } else {
      return [
        ...baseItems,
        {
          title: "Remove from My Feed",
          lucideIcon: MinusCircle,
          systemIcon: "minus.circle",
          destructive: true,
        },
      ];
    }
  };

  const handleDirections = () => {
    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    if (eventData.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        eventData.location,
      )}`;
      void Linking.openURL(url);
    } else {
      console.error("No location available for directions");
    }
  };

  const handleEdit = () => {
    void Linking.openURL(`${Config.apiBaseUrl}/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
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

  const handleUnfollow = async () => {
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

  const handleFollow = async () => {
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

  const handleShare = async () => {
    try {
      await Share.share({
        url: `${Config.apiBaseUrl}/event/${event.id}`,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };

  const handleAddToCal = async () => {
    await addToCalendar(event);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
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

  const handleShowQR = () => {
    router.push(`/event/${event.id}/qr`);
  };

  const handleMenuSelect = (title: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    switch (title) {
      case "Share":
        void handleShare();
        break;
      case "Directions":
        handleDirections();
        break;
      case "Add to calendar":
        void handleAddToCal();
        break;
      case "Make not discoverable":
      case "Make discoverable": {
        const newVisibility =
          event.visibility === "public" ? "private" : "public";
        void handleToggleVisibility(newVisibility);
        break;
      }
      case "Edit":
        handleEdit();
        break;
      case "Delete":
        void handleDelete();
        break;
      case "Add to My Feed":
        void handleFollow();
        break;
      case "Remove from My Feed":
        void handleUnfollow();
        break;
      case "Show QR":
        handleShowQR();
        break;
    }
  };

  // RENDER: if context menu
  if (menuType === "context") {
    return (
      <ContextMenuRoot>
        <ContextMenuTrigger asChild>
          {children ?? (
            <TouchableOpacity activeOpacity={0.6}>
              <View className="rounded-full p-1">
                <MoreVertical size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}
        </ContextMenuTrigger>

        <ContextMenuContent
          style={{
            minWidth: menuMinWidth,
            borderWidth: 1,
            borderColor: "#C7C7C7",
            borderRadius: 14,
            margin: 8,
          }}
        >
          {getMenuItems().map((item, index) => (
            <ContextMenuItem
              key={`${item.title}_${index}`}
              textValue={item.title}
              destructive={item.destructive}
              onSelect={() => handleMenuSelect(item.title)}
            >
              <ContextMenuItemTitle>{item.title}</ContextMenuItemTitle>
              <ContextMenuItemIcon ios={{ name: item.systemIcon }}>
                <item.lucideIcon
                  size={20}
                  color={item.destructive ? "#FF3B30" : "#000000"}
                />
              </ContextMenuItemIcon>
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenuRoot>
    );
  }

  // RENDER: if popup menu
  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <TouchableOpacity activeOpacity={0.6}>
            <View className="rounded-full p-1">
              <MoreVertical size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        style={{
          minWidth: menuMinWidth,
          borderWidth: 1,
          borderColor: "#C7C7C7",
          borderRadius: 14,
          margin: 8,
        }}
      >
        {getMenuItems().map((item, index) => (
          <DropdownMenuItem
            key={`${item.title}_${index}`}
            textValue={item.title}
            destructive={item.destructive}
            onSelect={() => handleMenuSelect(item.title)}
          >
            <View className="flex-row items-center justify-between px-4 py-3">
              <DropdownMenuItemTitle
                style={{
                  fontSize: 16,
                  color: item.destructive ? "#FF3B30" : "#000",
                }}
              >
                {item.title}
              </DropdownMenuItemTitle>
              <item.lucideIcon
                size={20}
                color={item.destructive ? "#FF3B30" : "#000"}
              />
            </View>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
