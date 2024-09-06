import type { LucideIcon } from "lucide-react-native";
import React from "react";
import { Linking, Share, Text, TouchableOpacity, View } from "react-native";
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
  Share2,
  Trash2,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import Config from "~/utils/config";

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
      { title: "Share", lucideIcon: Share2, systemIcon: "square.and.arrow.up" },
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
    if (onDelete) {
      await onDelete();
    } else {
      await deleteEventMutation.mutateAsync({ id: event.id });
      // We remove the navigation here, as it should be handled by the parent component
    }
  };

  const handleUnfollow = async () => {
    await unfollowEventMutation.mutateAsync({ id: event.id });
  };

  const handleFollow = async () => {
    await followEventMutation.mutateAsync({ id: event.id });
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

  const handleAddToCal = () => {
    // Implement calendar functionality
    console.log("Add to calendar:", event.id);
  };

  const handleToggleVisibility = async (
    newVisibility: "public" | "private",
  ) => {
    await toggleVisibilityMutation.mutateAsync({
      id: event.id,
      visibility: newVisibility,
    });
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
        handleAddToCal();
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
            <MoreVertical size={20} color="#5A32FB" />
          </View>
        </MenuTrigger>
        <MenuOptions
          customStyles={{
            optionsContainer: {
              backgroundColor: "white",
              borderRadius: 8,
              padding: 8,
            },
          }}
        >
          {getMenuItems().map((item, index) => (
            <MenuOption
              key={index}
              onSelect={() => handleMenuSelect(item.title)}
            >
              <View className="flex-row items-center py-2">
                <item.lucideIcon
                  size={20}
                  color={item.destructive ? "#BA2727" : "#5A32FB"}
                />
                <Text
                  className={cn("ml-3 font-medium", {
                    "text-[#BA2727]": item.destructive,
                    "text-base": !item.destructive,
                  })}
                >
                  {item.title}
                </Text>
              </View>
            </MenuOption>
          ))}
        </MenuOptions>
      </Menu>
    );
  }
}
