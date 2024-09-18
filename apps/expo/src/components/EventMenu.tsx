import type { LucideIcon } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Linking,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ContextMenu from "react-native-context-menu-view";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";
import * as Haptics from "expo-haptics";
import {
  CalendarPlus,
  Globe,
  Lock,
  Map,
  MinusCircle,
  MoreVertical,
  PenSquare,
  PlusCircle,
  ShareIcon,
  Trash2,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useCalendar } from "~/hooks/useCalendar";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import Config from "~/utils/config";
import { showToast } from "~/utils/toast";

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
  systemIcon: string;
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
    onMutate: () => {
      showToast("Deleting event...", "loading");
    },
    onSuccess: () => {
      void utils.event.invalidate();
      showToast("Event deleted successfully", "success");
    },
    onError: (error) => {
      showToast(`Failed to delete event: ${error.message}`, "error");
    },
  });

  const unfollowEventMutation = api.event.unfollow.useMutation({
    onMutate: () => {
      showToast("Unfollowing event...", "loading");
    },
    onSuccess: () => {
      void utils.event.invalidate();
      showToast("Event unfollowed", "success");
    },
    onError: (error) => {
      showToast(`Failed to unfollow event: ${error.message}`, "error");
    },
  });

  const followEventMutation = api.event.follow.useMutation({
    onMutate: () => {
      showToast("Following event...", "loading");
    },
    onSuccess: () => {
      void utils.event.invalidate();
      showToast("Event followed", "success");
    },
    onError: (error) => {
      showToast(`Failed to follow event: ${error.message}`, "error");
    },
  });

  const toggleVisibilityMutation = api.event.toggleVisibility.useMutation({
    onMutate: (variables) => {
      const action =
        variables.visibility === "public" ? "Adding to" : "Removing from";
      showToast(`${action} Discover...`, "loading");
    },
    onSuccess: (_, variables) => {
      void utils.event.invalidate();
      const action =
        variables.visibility === "public" ? "added to" : "removed from";
      showToast(`Event ${action} Discover`, "success");
    },
    onError: (error) => {
      showToast(`Failed to update event visibility: ${error.message}`, "error");
    },
  });

  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      {
        title: "Share",
        lucideIcon: ShareIcon,
        systemIcon: "square.and.arrow.up",
      },
      { title: "Directions", lucideIcon: Map, systemIcon: "map" },
      {
        title: "Add to Calendar",
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
              ? "Remove From Discover"
              : "Add to Discover",
          lucideIcon: event.visibility === "public" ? Lock : Globe,
          systemIcon: event.visibility === "public" ? "lock" : "globe",
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
        { title: "Follow", lucideIcon: PlusCircle, systemIcon: "plus.circle" },
        ...baseItems,
      ];
    } else {
      return [
        ...baseItems,
        {
          title: "Unfollow",
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
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(eventData.location)}`;
      void Linking.openURL(url);
    } else {
      console.log("No location available for directions");
    }
  };

  const handleEdit = () => {
    void Linking.openURL(`${Config.apiBaseUrl}/event/${event.id}/edit`);
  };

  const handleDelete = async () => {
    showToast("Deleting event...", "loading");
    try {
      if (onDelete) {
        await onDelete();
        showToast("Event deleted successfully", "success");
      } else {
        await deleteEventMutation.mutateAsync({ id: event.id });
      }
    } catch (error) {
      showToast(`Failed to delete event: ${(error as Error).message}`, "error");
    }
  };

  const handleUnfollow = async () => {
    showToast("Unfollowing event...", "loading");
    try {
      await unfollowEventMutation.mutateAsync({ id: event.id });
    } catch (error) {
      showToast(
        `Failed to unfollow event: ${(error as Error).message}`,
        "error",
      );
    }
  };

  const handleFollow = async () => {
    showToast("Following event...", "loading");
    try {
      await followEventMutation.mutateAsync({ id: event.id });
    } catch (error) {
      showToast(`Failed to follow event: ${(error as Error).message}`, "error");
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
    showToast(`${action} Discover...`, "loading");
    try {
      await toggleVisibilityMutation.mutateAsync({
        id: event.id,
        visibility: newVisibility,
      });
    } catch (error) {
      showToast(
        `Failed to update event visibility: ${(error as Error).message}`,
        "error",
      );
    }
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
      case "Add to Calendar":
        void handleAddToCal();
        break;
      case "Add to Discover":
      case "Remove From Discover": {
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
      case "Follow":
        void handleFollow();
        break;
      case "Unfollow":
        void handleUnfollow();
        break;
    }
  };

  if (menuType === "context") {
    return (
      <ContextMenu
        actions={getMenuItems().map((item) => ({
          title: item.title,
          systemIcon: item.systemIcon,
          destructive: item.destructive,
        }))}
        onPress={(e) => {
          const menuItems = getMenuItems();
          const selectedItem = menuItems[e.nativeEvent.index];
          if (selectedItem) {
            handleMenuSelect(selectedItem.title);
          }
        }}
      >
        {children}
      </ContextMenu>
    );
  } else {
    return (
      <Menu>
        <MenuTrigger
          customStyles={{
            TriggerTouchableComponent: TouchableOpacity,
            triggerTouchable: {
              activeOpacity: 0.6,
            },
          }}
        >
          <View className="rounded-full p-1">
            <MoreVertical size={20} color="#FFF" />
          </View>
        </MenuTrigger>
        <MenuOptions
          customStyles={{
            optionsContainer: {
              overflow: "hidden",
              marginTop: 8,
              marginHorizontal: 8,
              borderRadius: 14,
              minWidth: menuMinWidth,
              borderWidth: 1,
              borderColor: "#C7C7C7",
            },
          }}
        >
          {getMenuItems().map((item, index) => (
            <MenuOption
              key={index}
              onSelect={() => handleMenuSelect(item.title)}
              customStyles={{
                optionWrapper: {
                  padding: 0,
                  borderBottomWidth:
                    index < getMenuItems().length - 1 ? 0.5 : 0,
                  borderBottomColor: "#C7C7C7",
                },
              }}
            >
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text
                  className={cn("font-base text-xl", {
                    "text-[#FF3B30]": item.destructive,
                    "text-black": !item.destructive,
                  })}
                >
                  {item.title}
                </Text>
                <item.lucideIcon
                  size={20}
                  color={item.destructive ? "#FF3B30" : "#000000"}
                />
              </View>
            </MenuOption>
          ))}
        </MenuOptions>
      </Menu>
    );
  }
}
