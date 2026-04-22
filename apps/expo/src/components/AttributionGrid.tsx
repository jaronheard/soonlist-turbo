import React, { useState } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  List as ListIcon,
} from "~/components/icons";
import { UserAvatar } from "~/components/UserAvatar";
import { navigateToUser } from "~/utils/navigateToUser";

/** At this many people (4+), compact inline mode uses a collapsed avatar stack. */
const MIN_PEOPLE_FOR_STACK = 4;

/**
 * Avatars shown in the overlapping stack before the +N circle (3 faces + 1
 * count chip matches common iOS group rows).
 */
const STACK_FACE_COUNT = 5;

/** How far each subsequent avatar / +N chip overlaps the previous (px). */
const AVATAR_STACK_OVERLAP = 8;

const ROW_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 } as const;

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
  const [peopleExpanded, setPeopleExpanded] = useState(false);

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
    const prefix = creatorBadgeLabel === "owner" ? "Owned by" : "Captured by";
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
          {prefix}{" "}
          <Text className="font-semibold text-neutral-1">
            {creator.displayName || creator.username}
          </Text>
        </Text>
      </TouchableOpacity>
    );
  }

  const needsPeopleStack =
    isCompact && people.length >= MIN_PEOPLE_FOR_STACK;
  const stackOverflowCount = needsPeopleStack
    ? people.length - STACK_FACE_COUNT
    : 0;

  const avatarSize = isCompact ? 32 : 44;
  const rowPaddingY = isCompact ? "py-2" : "py-2.5";
  const containerPadding = isCompact ? "px-3 pb-2 pt-2" : "px-4 pb-3 pt-3";
  const labelMargin = isCompact ? "mb-1" : "mb-2";
  const chevronColor = "#8F7AD6";

  const bgClass = background === "white" ? "bg-white" : "bg-interactive-3/60";
  const containerClass = `rounded-2xl ${bgClass} ${containerPadding}`;

  const addListRowNodes = (out: React.ReactNode[]) => {
    visibleLists.forEach((list) => {
      const iconSize = isCompact ? 32 : 44;
      const listIcon = (
        <View
          className="items-center justify-center rounded-full bg-interactive-3"
          style={{ width: iconSize, height: iconSize }}
        >
          <ListIcon size={isCompact ? 16 : 20} color="#5A32FB" />
        </View>
      );
      const listLabel = (
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
        out.push(
          <TouchableOpacity
            key={`list-${list.id}`}
            onPress={() => handleListPress(list)}
            className={`flex-row items-center ${rowPaddingY}`}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Open list ${list.name}`}
          >
            {listIcon}
            {listLabel}
            <ChevronRight size={16} color={chevronColor} />
          </TouchableOpacity>,
        );
      } else {
        out.push(
          <View
            key={`list-${list.id}`}
            className={`flex-row items-center ${rowPaddingY}`}
          >
            {listIcon}
            {listLabel}
          </View>,
        );
      }
    });
  };

  const rows: React.ReactNode[] = [];

  const pushPersonRow = (user: UserForDisplay) => {
    const isCreator = user.id === creator.id;
    rows.push(
      <TouchableOpacity
        key={`user-${user.id}`}
        onPress={() => handleUserPress(user)}
        className={`flex-row items-center overflow-visible ${rowPaddingY}`}
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
  };

  if (needsPeopleStack && !peopleExpanded) {
    rows.push(
      <Pressable
        key="people-avatar-stack"
        onPress={() => setPeopleExpanded(true)}
        hitSlop={ROW_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`${people.length} people. Show full list.`}
        className="w-full flex-row items-center justify-between pr-0"
        style={{ paddingTop: 6, paddingBottom: 6 }}
      >
        <View className="min-w-0 flex-1 flex-row items-center">
          {people.slice(0, STACK_FACE_COUNT).map((user, index) => (
            <View
              key={user.id}
              className="rounded-full bg-white"
              style={{
                marginLeft: index === 0 ? 0 : -AVATAR_STACK_OVERLAP,
                zIndex: index + 1,
                elevation: index + 1,
              }}
            >
              <UserAvatar user={user} size={avatarSize} />
            </View>
          ))}
          {stackOverflowCount > 0 ? (
            <View
              className="items-center justify-center rounded-full border border-white bg-interactive-2"
              style={{
                width: avatarSize,
                height: avatarSize,
                marginLeft: -AVATAR_STACK_OVERLAP,
                zIndex: STACK_FACE_COUNT + 1,
                elevation: STACK_FACE_COUNT + 1,
              }}
            >
              <Text
                className="text-sm font-bold text-interactive-1"
                maxFontSizeMultiplier={1.25}
              >
                +{stackOverflowCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="pl-1">
          <ChevronDown
            size={isCompact ? 20 : 22}
            color={chevronColor}
          />
        </View>
      </Pressable>,
    );
  } else {
    if (needsPeopleStack && peopleExpanded) {
      people.forEach((user) => {
        pushPersonRow(user);
      });
      rows.push(
        <Pressable
          key="show-less-people"
          onPress={() => setPeopleExpanded(false)}
          hitSlop={ROW_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Show fewer people"
          className="w-full flex-row items-center justify-between"
          style={{ paddingTop: 6, paddingBottom: 6 }}
        >
          <Text
            className={
              isCompact
                ? "text-sm font-semibold text-interactive-1"
                : "text-base font-semibold text-interactive-1"
            }
          >
            Show less
          </Text>
          <ChevronUp
            size={isCompact ? 20 : 22}
            color={chevronColor}
          />
        </Pressable>,
      );
    } else {
      people.forEach((user) => {
        pushPersonRow(user);
      });
    }
  }

  addListRowNodes(rows);

  if (rows.length === 0) return null;

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
