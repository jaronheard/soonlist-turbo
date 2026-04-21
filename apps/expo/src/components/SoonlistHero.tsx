import React from "react";
import {
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

export type SoonlistHeroSegment = "upcoming" | "past";

interface SoonlistHeroProps {
  title: string;
  /**
   * Content between the title and the last-updated / tabs rows.
   *
   * - User profile: a full `SoonlistHeroBylineRow` (avatar + @handle +
   *   secondary line + contact icons).
   * - List detail: a simple "by <owner>" subtitle text.
   *
   * Rendered as-is so each screen can shape its own byline.
   */
  subtitle?: React.ReactNode;
  /** Rendered as "Last updated X ago". Omit to hide. */
  lastUpdatedAt?: number | null | undefined;
  /**
   * Upcoming / Past segmented control. Both are required to render the
   * control; omit either to hide it.
   */
  selectedSegment?: SoonlistHeroSegment;
  onSegmentChange?: (s: SoonlistHeroSegment) => void;
  /**
   * Optional block rendered below the tabs. List detail uses this for a
   * `FromTheseSoonlists` card showing owner + contributors.
   */
  footer?: React.ReactNode;
}

/**
 * Shared hero for user profile (`[username]/index.tsx`) and list detail
 * (`list/[slug].tsx`). Enforces consistent spacing, typography, and the
 * big-purple title treatment across both screens.
 */
export function SoonlistHero({
  title,
  subtitle,
  lastUpdatedAt,
  selectedSegment,
  onSegmentChange,
  footer,
}: SoonlistHeroProps) {
  const hasTabs =
    selectedSegment !== undefined && onSegmentChange !== undefined;
  const lastUpdatedLine =
    lastUpdatedAt === undefined ? null : formatLastUpdated(lastUpdatedAt);

  return (
    <View className="px-4 pb-2 pt-2">
      <Text
        className="text-3xl font-bold leading-tight text-interactive-1"
        numberOfLines={2}
      >
        {title}
      </Text>

      {subtitle ? <View className="mt-3">{subtitle}</View> : null}

      {lastUpdatedLine !== null ? (
        <Text className="mt-2 text-sm text-neutral-2">
          {lastUpdatedLine === "" ? "…" : lastUpdatedLine}
        </Text>
      ) : null}

      {hasTabs ? (
        <View className="mt-3" style={{ width: 260 }}>
          <UpcomingPastSegmentedControl
            selectedSegment={selectedSegment}
            onSegmentChange={onSegmentChange}
          />
        </View>
      ) : null}

      {footer ? <View className="mt-4">{footer}</View> : null}
    </View>
  );
}

interface ContactLinkButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}

const BYLINE_CONTACT_ICON_SIZE = 16;
const BYLINE_CONTACT_ICON_COLOR = "#5A32FB";

/**
 * Single circular contact-icon chip used in the hero byline row. Exported so
 * callers can compose their own icon sets (Mail/Phone/Instagram/Globe).
 */
export function SoonlistHeroContactButton({
  accessibilityLabel,
  onPress,
  children,
}: ContactLinkButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      className="h-8 w-8 items-center justify-center rounded-full bg-neutral-4/70 active:opacity-70"
    >
      {children}
    </Pressable>
  );
}

export const SOONLIST_HERO_CONTACT_ICON_SIZE = BYLINE_CONTACT_ICON_SIZE;
export const SOONLIST_HERO_CONTACT_ICON_COLOR = BYLINE_CONTACT_ICON_COLOR;

interface BylineRowProps {
  avatar: React.ReactNode;
  primaryText: string;
  primaryAccessibilityLabel?: string;
  secondaryText?: string;
  /** Trailing contact icon chips — use `SoonlistHeroContactButton`. */
  contacts?: React.ReactNode;
}

/**
 * Standard hero byline: avatar + primary text (`@handle`) + optional
 * secondary line + optional trailing contact icon chips. Used by user
 * profile. List detail uses a plain "by <owner>" subtitle instead.
 */
export function SoonlistHeroBylineRow({
  avatar,
  primaryText,
  primaryAccessibilityLabel,
  secondaryText,
  contacts,
}: BylineRowProps) {
  return (
    <View className="flex-row items-center gap-3">
      {avatar}

      <View className="min-w-0 flex-1">
        <Text
          className="text-sm font-semibold text-neutral-1"
          numberOfLines={1}
          accessibilityLabel={primaryAccessibilityLabel}
        >
          {primaryText}
        </Text>
        {secondaryText ? (
          <Text className="text-xs text-neutral-2" numberOfLines={1}>
            {secondaryText}
          </Text>
        ) : null}
      </View>

      {contacts ? (
        <View className="flex-row items-center gap-1.5">{contacts}</View>
      ) : null}
    </View>
  );
}

function UpcomingPastSegmentedControl({
  selectedSegment,
  onSegmentChange,
}: {
  selectedSegment: SoonlistHeroSegment;
  onSegmentChange: (s: SoonlistHeroSegment) => void;
}) {
  if (Platform.OS === "ios") {
    return (
      <Host matchContents>
        <Picker
          selection={selectedSegment}
          onSelectionChange={onSegmentChange}
          modifiers={[pickerStyle("segmented")]}
        >
          <SwiftUIText modifiers={[tag("upcoming")]}>Upcoming</SwiftUIText>
          <SwiftUIText modifiers={[tag("past")]}>Past</SwiftUIText>
        </Picker>
      </Host>
    );
  }

  return (
    <View className="flex-row rounded-lg bg-gray-100 p-1">
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("upcoming")}
      >
        <Text
          className={
            selectedSegment === "upcoming"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("past")}
      >
        <Text
          className={
            selectedSegment === "past"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function formatLastUpdated(addedAtMs: number | null | undefined): string {
  if (addedAtMs === null || addedAtMs === undefined) return "";
  const now = Date.now();
  const diffMs = Math.max(0, now - addedAtMs);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Last updated just now";
  if (minutes < 60) {
    return `Last updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Last updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Last updated ${days} day${days === 1 ? "" : "s"} ago`;
  }
  const d = new Date(addedAtMs);
  return `Last updated ${d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })}`;
}
