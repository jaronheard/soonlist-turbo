import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import { ChevronRight, List as ListIcon } from "~/components/icons";
import { UserAvatar } from "~/components/UserAvatar";
import { navigateToUser } from "~/utils/navigateToUser";

interface AttributionGridProps {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  lists: Doc<"lists">[];
  currentUserId?: string;
  /** Called before navigating, e.g. to dismiss an enclosing modal. */
  onNavigate?: () => void;
  /**
   * - "card": padded card with label + dividers (used in the modal body).
   * - "compact": tighter, borderless, tinted card for inline use.
   */
  variant?: "card" | "compact";
  /** Whether to show the section label. */
  showLabel?: boolean;
  /** Override the section label. Defaults to "From these Soonlists:". */
  label?: string;
  /**
   * Override the pill label shown next to the creator row. Defaults to
   * "captured" (event-detail semantics). List detail uses "owner".
   */
  creatorBadgeLabel?: string;
  /**
   * Card background tone.
   * - "tint" (default): muted-brand wash — used on event detail + modals
   *   where the card sits on the app's white canvas and needs to feel
   *   attached to the item it describes.
   * - "white": crisp white — used in list detail, where the card itself
   *   sits on the tinted hero background and needs contrast the other way.
   */
  background?: "tint" | "white";
}

export function AttributionGrid({
  creator,
  savers,
  lists,
  currentUserId,
  onNavigate,
  variant = "card",
  showLabel = true,
  label = "From these Soonlists:",
  creatorBadgeLabel = "captured",
  background = "tint",
}: AttributionGridProps) {
  // People: creator first, then savers, deduped.
  const people: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!people.some((u) => u.id === saver.id)) {
      people.push(saver);
    }
  }

  // Private-list access is enforced on the SERVER (see feeds.ts
  // `queryFeed`/`queryGroupedFeed`, which filter `event.lists` through
  // `getViewableListIds`). Here we only strip system/personal lists, which
  // are an implementation detail and not meaningful attribution.
  const visibleLists = lists.filter((list) => !list.isSystemList);

  const handleUserPress = (user: UserForDisplay) => {
    onNavigate?.();
    navigateToUser(user, currentUserId);
  };

  const handleListPress = (list: Doc<"lists">) => {
    if (!list.slug) return;
    onNavigate?.();
    router.push(`/list/${list.slug}`);
  };

  const isCompact = variant === "compact";

  // Degenerate case (compact only): just the creator, no other savers and no
  // lists. The full card is over-chrome for "one person captured this" — drop
  // to a one-liner in the same visual language (avatar + "captured" concept).
  const isSingleCreator =
    isCompact && people.length === 1 && visibleLists.length === 0;

  if (isSingleCreator) {
    return (
      <TouchableOpacity
        onPress={() => handleUserPress(creator)}
        className="flex-row items-center"
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${
          creator.displayName || creator.username || "user"
        }'s Soonlist`}
      >
        <UserAvatar user={creator} size={24} />
        <Text className="ml-2 text-sm text-neutral-2" numberOfLines={1}>
          Captured by{" "}
          <Text className="font-semibold text-neutral-1">
            {creator.displayName || creator.username}
          </Text>
        </Text>
      </TouchableOpacity>
    );
  }

  const avatarSize = isCompact ? 32 : 44;
  const rowPaddingY = isCompact ? "py-2" : "py-2.5";
  const containerPadding = isCompact ? "px-3 pb-2 pt-2" : "px-4 pb-3 pt-3";
  const labelMargin = isCompact ? "mb-1" : "mb-2";
  // Both variants share the same visual language: tinted card, no dividers
  // between rows, muted-brand chevron. Rows are grouped by the tint + row
  // padding, not by lines. The card variant is simply the compact design
  // scaled up.
  const chevronColor = "#8F7AD6";

  const rows: React.ReactNode[] = [];

  people.forEach((user) => {
    const isCreator = user.id === creator.id;
    rows.push(
      <TouchableOpacity
        key={`user-${user.id}`}
        onPress={() => handleUserPress(user)}
        className={`flex-row items-center ${rowPaddingY}`}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${
          user.displayName || user.username || "user"
        }'s Soonlist`}
      >
        <UserAvatar user={user} size={avatarSize} />
        <View className="ml-3 flex-1 flex-row items-center">
          <Text
            className={`shrink ${
              isCompact ? "text-sm" : "text-base"
            } font-semibold text-neutral-1`}
            numberOfLines={1}
          >
            {user.displayName || user.username}
          </Text>
          {isCreator ? (
            <View className="ml-2 shrink-0 rounded-full bg-accent-yellow px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-neutral-1">
                {creatorBadgeLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={16} color={chevronColor} />
      </TouchableOpacity>,
    );
  });

  visibleLists.forEach((list) => {
    const iconSize = isCompact ? 32 : 44;
    const icon = (
      <View
        className="items-center justify-center rounded-full bg-interactive-3"
        style={{ width: iconSize, height: iconSize }}
      >
        <ListIcon size={isCompact ? 16 : 20} color="#5A32FB" />
      </View>
    );
    const label = (
      <View className="ml-3 flex-1">
        <Text
          className={`${
            isCompact ? "text-sm" : "text-base"
          } font-semibold text-neutral-1`}
          numberOfLines={1}
        >
          {list.name}
        </Text>
      </View>
    );

    if (list.slug) {
      rows.push(
        <TouchableOpacity
          key={`list-${list.id}`}
          onPress={() => handleListPress(list)}
          className={`flex-row items-center ${rowPaddingY}`}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open list ${list.name}`}
        >
          {icon}
          {label}
          <ChevronRight size={16} color={chevronColor} />
        </TouchableOpacity>,
      );
    } else {
      rows.push(
        <View
          key={`list-${list.id}`}
          className={`flex-row items-center ${rowPaddingY}`}
        >
          {icon}
          {label}
        </View>,
      );
    }
  });

  if (rows.length === 0) return null;

  // Both variants share the same tinted, borderless card. The card variant
  // is simply the compact design scaled up for use in the modal / +N more
  // detail view.
  const bgClass = background === "white" ? "bg-white" : "bg-interactive-3/60";
  const containerClass = `rounded-2xl ${bgClass} ${containerPadding}`;

  return (
    <View className={containerClass}>
      {showLabel ? (
        <Text
          className={`${labelMargin} ${
            isCompact ? "text-xs" : "text-sm"
          } text-neutral-2`}
        >
          {label}
        </Text>
      ) : null}
      {rows}
    </View>
  );
}
