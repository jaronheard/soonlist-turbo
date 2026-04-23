import type { StyleProp, TextStyle } from "react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import { List } from "~/components/icons";
import { OverflowPill } from "~/components/OverflowPill";
import { SavedByModal } from "~/components/SavedByModal";
import { UserAvatar } from "~/components/UserAvatar";
import { navigateToUser } from "~/utils/navigateToUser";

export type EventAttributionVariant =
  | "list-primary"
  | "people-primary"
  | "people-only";

interface EventAttributionRowProps {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  currentUserId?: string;
  sourceListName?: string;
  sourceListSlug?: string;
  additionalSourceCount?: number;
  lists?: Doc<"lists">[];
  variant?: EventAttributionVariant;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 } as const;
// Wider right side for the "+N" chip at the end of the row; the row has
// 12px horizontal padding so this stays inside the card.
const OVERFLOW_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 12 } as const;

// Handoff spec values that don't map to existing Tailwind tokens.
const ROW_HEIGHT = 28;
const ROW_FONT_SIZE = 12.5;
const AVATAR_OVERLAP = -6;

// Hex forms of design tokens for imperative color props (SVG icon color,
// shadowColor) that don't accept className.
const INTERACTIVE_1_HEX = "#5A32FB"; // --interactive-1
const NEUTRAL_0_HEX = "#162135"; // --neutral-0

function displayName(user: UserForDisplay) {
  return user.displayName || user.username;
}

function combineUsers(creator: UserForDisplay, savers: UserForDisplay[]) {
  const out: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!out.some((u) => u.id === saver.id)) {
      out.push(saver);
    }
  }
  return out;
}

function RowWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View className="mt-0.5 px-3">
      <View
        className="flex-row items-center"
        style={{ minHeight: ROW_HEIGHT, columnGap: 7 }}
      >
        {children}
      </View>
    </View>
  );
}

function RowText({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={1}
      className={className}
      style={[{ fontSize: ROW_FONT_SIZE }, style]}
    >
      {children}
    </Text>
  );
}

function StackAvatar({
  user,
  size,
  isFirst,
}: {
  user: UserForDisplay;
  size: number;
  isFirst: boolean;
}) {
  const inner = Math.max(size - 4, 1);
  return (
    <View
      className="items-center justify-center rounded-full bg-white"
      style={{
        width: size,
        height: size,
        marginLeft: isFirst ? 0 : AVATAR_OVERLAP,
      }}
    >
      <UserAvatar user={user} size={inner} />
    </View>
  );
}

function CapturerAvatar({
  user,
  size,
  isFirst = true,
}: {
  user: UserForDisplay;
  size: number;
  isFirst?: boolean;
}) {
  const halo = size + 5;
  const inner = Math.max(size - 4, 1);
  return (
    <View
      className="items-center justify-center rounded-full bg-accent-yellow"
      style={{
        width: halo,
        height: halo,
        marginLeft: isFirst ? 0 : AVATAR_OVERLAP,
        shadowColor: NEUTRAL_0_HEX,
        shadowOpacity: 0.06,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      <UserAvatar user={user} size={inner} />
    </View>
  );
}

function AvatarStack({
  users,
  size,
  capturerId,
  onPress,
}: {
  users: UserForDisplay[];
  size: number;
  capturerId?: string;
  onPress?: () => void;
}) {
  if (users.length === 0) return null;
  const content = (
    <View className="flex-row items-center">
      {users.map((user, i) =>
        user.id === capturerId ? (
          <CapturerAvatar
            key={user.id}
            user={user}
            size={size}
            isFirst={i === 0}
          />
        ) : (
          <StackAvatar
            key={user.id}
            user={user}
            size={size}
            isFirst={i === 0}
          />
        ),
      )}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} hitSlop={HIT_SLOP}>
      {content}
    </Pressable>
  );
}

// Names render inside a single shrinking Text so ellipsis kicks in before the
// row overflows. The "+N" stays pinned outside the truncating Text.
function NameList({
  users,
  extraCount,
  maxNames,
  currentUserId,
  onOverflowPress,
}: {
  users: UserForDisplay[];
  extraCount: number;
  maxNames: number;
  currentUserId?: string;
  onOverflowPress?: () => void;
}) {
  const nameUsers = users.slice(0, maxNames);
  if (nameUsers.length === 0 && extraCount === 0) return null;
  return (
    <View
      className="flex-row items-center"
      style={{ flexShrink: 1, minWidth: 0, columnGap: 4 }}
    >
      {nameUsers.length > 0 ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="font-medium text-neutral-1"
          style={{ flexShrink: 1, minWidth: 0, fontSize: ROW_FONT_SIZE }}
        >
          {nameUsers.map((user, i) => (
            <Text
              key={user.id}
              onPress={() => navigateToUser(user, currentUserId)}
            >
              {displayName(user)}
              {i < nameUsers.length - 1 ? ", " : ""}
            </Text>
          ))}
        </Text>
      ) : null}
      {extraCount > 0 ? (
        <Pressable
          onPress={onOverflowPress}
          hitSlop={OVERFLOW_HIT_SLOP}
          accessibilityLabel="View everyone who saved this"
        >
          <Text className="text-neutral-2" style={{ fontSize: ROW_FONT_SIZE }}>
            +{extraCount}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ListChip({
  name,
  slug,
  size,
}: {
  name?: string;
  slug?: string;
  size: number;
}) {
  const shrink = { flexShrink: 1, minWidth: 0 } as const;
  const content = (
    <View className="flex-row items-center" style={{ columnGap: 5, ...shrink }}>
      <List size={size} color={INTERACTIVE_1_HEX} strokeWidth={1.75} />
      {name ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="font-semibold text-interactive-1"
          style={{ ...shrink, fontSize: ROW_FONT_SIZE }}
        >
          {name}
        </Text>
      ) : null}
    </View>
  );
  if (slug) {
    return (
      <Pressable
        onPress={() => router.push(`/list/${slug}`)}
        hitSlop={HIT_SLOP}
        accessibilityLabel={name ? `Open list ${name}` : "Open list"}
        style={shrink}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

function ListChipLegacy({ name, slug }: { name?: string; slug?: string }) {
  const content = (
    <>
      <List size={13} color={INTERACTIVE_1_HEX} />
      {name ? (
        <Text
          className={
            slug
              ? "text-xs font-semibold text-interactive-1"
              : "text-xs text-neutral-2"
          }
        >
          {name}
        </Text>
      ) : null}
    </>
  );
  if (slug) {
    return (
      <Pressable
        onPress={() => router.push(`/list/${slug}`)}
        hitSlop={HIT_SLOP}
        accessibilityLabel={name ? `Open list ${name}` : "Open list"}
        className="flex-row items-center gap-1"
      >
        {content}
      </Pressable>
    );
  }
  return <View className="flex-row items-center gap-1">{content}</View>;
}

export function EventAttributionRow({
  creator,
  savers,
  iconSize,
  currentUserId,
  sourceListName,
  sourceListSlug,
  additionalSourceCount,
  lists,
  variant = "people-primary",
}: EventAttributionRowProps) {
  if (variant === "people-only") {
    return (
      <MySoonlistRow
        creator={creator}
        savers={savers}
        iconSize={iconSize}
        currentUserId={currentUserId}
      />
    );
  }

  if (variant === "list-primary" && sourceListSlug) {
    return (
      <MySceneRow
        creator={creator}
        savers={savers}
        iconSize={iconSize}
        currentUserId={currentUserId}
        sourceListName={sourceListName}
        sourceListSlug={sourceListSlug}
        additionalSourceCount={additionalSourceCount}
        lists={lists}
      />
    );
  }

  return (
    <PeoplePrimaryRow
      creator={creator}
      savers={savers}
      iconSize={iconSize}
      currentUserId={currentUserId}
      sourceListName={sourceListName}
      sourceListSlug={sourceListSlug}
      additionalSourceCount={additionalSourceCount}
      lists={lists}
    />
  );
}

function MySoonlistRow({
  creator,
  savers,
  iconSize,
  currentUserId,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  currentUserId?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const isOwnEvent = currentUserId === creator.id;
  const avatarSize = Math.round(iconSize * 1.25); // 20px at fontScale=1
  const otherSavers = savers.filter(
    (s) => s.id !== creator.id && s.id !== currentUserId,
  );
  const openModal = () => setShowModal(true);

  // Viewer captured alone: handoff says collapse the row entirely.
  if (isOwnEvent && otherSavers.length === 0) {
    return null;
  }

  if (isOwnEvent) {
    const stackUsers = otherSavers.slice(0, 3);
    const extraNameCount = Math.max(otherSavers.length - 2, 0);
    return (
      <>
        <RowWrapper>
          <RowText className="text-neutral-2">Also saved by</RowText>
          <AvatarStack
            users={stackUsers}
            size={avatarSize}
            onPress={openModal}
          />
          <NameList
            users={otherSavers}
            extraCount={extraNameCount}
            maxNames={2}
            currentUserId={currentUserId}
            onOverflowPress={openModal}
          />
        </RowWrapper>
        <SavedByModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          creator={creator}
          savers={savers}
          lists={[]}
          currentUserId={currentUserId}
        />
      </>
    );
  }

  const capturerBadge = (
    <Pressable
      onPress={() => navigateToUser(creator, currentUserId)}
      hitSlop={HIT_SLOP}
      className="flex-row items-center"
      style={{ columnGap: 7, flexShrink: 1, minWidth: 0 }}
    >
      <CapturerAvatar user={creator} size={avatarSize} />
      <RowText className="font-semibold text-black" style={{ flexShrink: 1 }}>
        {displayName(creator)}
      </RowText>
    </Pressable>
  );

  if (otherSavers.length === 0) {
    return (
      <RowWrapper>
        <RowText className="text-neutral-2">Captured by</RowText>
        {capturerBadge}
      </RowWrapper>
    );
  }

  const stackUsers = otherSavers.slice(0, 3);
  const extraNameCount = Math.max(otherSavers.length - 1, 0);
  return (
    <>
      <RowWrapper>
        <RowText className="text-neutral-2">Captured by</RowText>
        {capturerBadge}
        <RowText className="text-neutral-3">·</RowText>
        <AvatarStack users={stackUsers} size={avatarSize} onPress={openModal} />
        <NameList
          users={otherSavers}
          extraCount={extraNameCount}
          maxNames={1}
          currentUserId={currentUserId}
          onOverflowPress={openModal}
        />
      </RowWrapper>
      <SavedByModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        creator={creator}
        savers={savers}
        lists={[]}
        currentUserId={currentUserId}
      />
    </>
  );
}

function MySceneRow({
  creator,
  savers,
  iconSize,
  currentUserId,
  sourceListName,
  sourceListSlug,
  additionalSourceCount,
  lists,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  currentUserId?: string;
  sourceListName?: string;
  sourceListSlug: string;
  additionalSourceCount?: number;
  lists?: Doc<"lists">[];
}) {
  const [showModal, setShowModal] = useState(false);
  const avatarSize = Math.round(iconSize * 1.25); // 20px at fontScale=1
  const listIconSize = Math.round(iconSize * 0.8125); // 13px at fontScale=1
  const openModal = () => setShowModal(true);

  // Capturer first, then savers in order, dedup'd. Per the handoff the Scene
  // row shows no "+N" for extra savers — tapping the stack opens the modal.
  const stackUsers = combineUsers(creator, savers).slice(0, 3);
  const remainingListsCount = additionalSourceCount ?? 0;

  return (
    <>
      <RowWrapper>
        <ListChip
          name={sourceListName}
          slug={sourceListSlug}
          size={listIconSize}
        />
        {remainingListsCount > 0 ? (
          <OverflowPill count={remainingListsCount} onPress={openModal} />
        ) : null}
        <RowText className="text-neutral-3">·</RowText>
        <AvatarStack
          users={stackUsers}
          size={avatarSize}
          capturerId={creator.id}
          onPress={openModal}
        />
      </RowWrapper>
      <SavedByModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        creator={creator}
        savers={savers}
        lists={lists ?? []}
        currentUserId={currentUserId}
      />
    </>
  );
}

// Discover tab and List detail page. Not covered by the attribution-row
// redesign; kept unchanged so those screens render as before.
function PeoplePrimaryRow({
  creator,
  savers,
  iconSize,
  currentUserId,
  sourceListName,
  sourceListSlug,
  additionalSourceCount,
  lists,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  currentUserId?: string;
  sourceListName?: string;
  sourceListSlug?: string;
  additionalSourceCount?: number;
  lists?: Doc<"lists">[];
}) {
  const [showModal, setShowModal] = useState(false);
  const isOwnEvent = currentUserId === creator.id;
  const allUsers = combineUsers(creator, savers);
  const displayUsers = allUsers.slice(0, 2);
  const remainingUsersCount = allUsers.length - displayUsers.length;
  const remainingListsCount = additionalSourceCount ?? 0;
  const avatarSize = iconSize * 0.9;
  const openModal = () => setShowModal(true);

  const hasAnyListInfo =
    !!sourceListSlug || !!sourceListName || remainingListsCount > 0;

  return (
    <>
      <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-2">
        {isOwnEvent ? (
          <Pressable
            onPress={() => navigateToUser(creator, currentUserId)}
            hitSlop={HIT_SLOP}
            className="flex-row items-center gap-1"
          >
            <UserAvatar user={creator} size={avatarSize} />
            <Text className="text-xs text-neutral-2">You</Text>
          </Pressable>
        ) : (
          displayUsers.map((user, index) => (
            <Pressable
              key={user.id}
              onPress={() => navigateToUser(user, currentUserId)}
              hitSlop={HIT_SLOP}
              className="flex-row items-center gap-1"
            >
              <UserAvatar user={user} size={avatarSize} />
              <Text className="text-xs text-neutral-2">
                {user.displayName || user.username}
                {index < displayUsers.length - 1 || remainingUsersCount > 0
                  ? ","
                  : ""}
              </Text>
            </Pressable>
          ))
        )}
        {!isOwnEvent && remainingUsersCount > 0 && (
          <OverflowPill count={remainingUsersCount} onPress={openModal} />
        )}
        {hasAnyListInfo && (
          <>
            <Text className="text-xs text-neutral-2">
              {isOwnEvent ? "· Shared to" : "via"}
            </Text>
            <ListChipLegacy name={sourceListName} slug={sourceListSlug} />
            {remainingListsCount > 0 && (
              <OverflowPill count={remainingListsCount} onPress={openModal} />
            )}
          </>
        )}
      </View>
      <SavedByModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        creator={creator}
        savers={savers}
        lists={lists ?? []}
        currentUserId={currentUserId}
      />
    </>
  );
}
