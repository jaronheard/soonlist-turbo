import React from "react";
import { Dimensions, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { toast } from "sonner-native";

import type { LucideIcon } from "~/components/icons";
import type { RouterOutputs } from "~/utils/api";
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
} from "~/components/icons";
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
  DropdownMenuItemIcon,
  DropdownMenuItemTitle,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu-primitives";
import { useEventActions } from "~/hooks/useEventActions";

const screenWidth = Dimensions.get("window").width;
const menuMinWidth = screenWidth * 0.6;

interface EventMenuProps {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
  isOwner: boolean;
  isSaved: boolean;
  menuType: "context" | "popup";
  demoMode?: boolean;
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
    | "minus.circle";
  destructive?: boolean;
}

export function EventMenu({
  event,
  isOwner,
  isSaved,
  menuType,
  demoMode = false,
  children,
  onDelete,
}: EventMenuProps) {
  const {
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
  } = useEventActions({ event, isSaved, demoMode, onDelete });

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
        title: "Get directions",
        lucideIcon: Map,
        systemIcon: "map",
      },
      {
        title: "Add to calendar",
        lucideIcon: CalendarPlus,
        systemIcon: "calendar.badge.plus",
      },
    ];

    if (showDiscover && isOwner) {
      baseItems.push({
        title:
          event.visibility === "public"
            ? "Make not discoverable"
            : "Make discoverable",
        lucideIcon: event.visibility === "public" ? EyeOff : Globe2,
        systemIcon: event.visibility === "public" ? "eye.slash" : "globe",
      });
    }

    if (isOwner) {
      return [
        ...baseItems,
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

  const handleMenuSelect = (title: string) => {
    if (demoMode) {
      toast("Demo mode: action disabled");
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    switch (title) {
      case "Share":
        void handleShare();
        break;
      case "Get directions":
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
              key={`context_menu_${item.title}_${index}`}
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
        side="bottom"
        align="center"
      >
        {getMenuItems().map((item, index) => (
          <DropdownMenuItem
            key={`dropdown_menu_${item.title}_${index}`}
            textValue={item.title}
            destructive={item.destructive}
            onSelect={() => handleMenuSelect(item.title)}
          >
            <DropdownMenuItemTitle
              style={{
                fontSize: 16,
                color: item.destructive ? "#FF3B30" : "#000",
              }}
            >
              {item.title}
            </DropdownMenuItemTitle>
            <DropdownMenuItemIcon ios={{ name: item.systemIcon }}>
              <item.lucideIcon
                size={20}
                color={item.destructive ? "#FF3B30" : "#000"}
              />
            </DropdownMenuItemIcon>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
