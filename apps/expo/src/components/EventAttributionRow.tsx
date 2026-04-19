import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { List, User } from "~/components/icons";
import { SavedByModal } from "~/components/SavedByModal";
import { UserProfileFlair } from "~/components/UserProfileFlair";

interface UserForDisplay {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

export type EventAttributionVariant = "list-primary" | "people-primary";

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

function combineUsers(creator: UserForDisplay, savers: UserForDisplay[]) {
  const out: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!out.some((u) => u.id === saver.id)) {
      out.push(saver);
    }
  }
  return out;
}

function navigateToUser(user: UserForDisplay, currentUserId?: string) {
  if (currentUserId && user.id === currentUserId) {
    router.push("/settings/account");
  } else {
    router.push(`/${user.username}`);
  }
}

function Avatar({ user, size }: { user: UserForDisplay; size: number }) {
  return (
    <UserProfileFlair username={user.username} size="xs">
      {user.userImage ? (
        <ExpoImage
          source={{ uri: user.userImage }}
          style={{ width: size, height: size, borderRadius: 9999 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={user.id}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: 9999,
            backgroundColor: "#E0D9FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={size * 0.6} color="#627496" />
        </View>
      )}
    </UserProfileFlair>
  );
}

function ListChip({ name, slug }: { name?: string; slug?: string }) {
  const content = (
    <>
      <List size={13} color="#5A32FB" />
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

function OverflowPill({
  count,
  onPress,
  className,
}: {
  count: number;
  onPress?: () => void;
  className?: string;
}) {
  if (count <= 0) return null;
  const pillClass = `rounded-full bg-interactive-3 px-1.5 py-0.5${
    className ? ` ${className}` : ""
  }`;
  const text = (
    <Text className="text-xs font-medium text-interactive-1">+{count}</Text>
  );
  if (!onPress) {
    return <View className={pillClass}>{text}</View>;
  }
  return (
    <Pressable className={pillClass} onPress={onPress} hitSlop={HIT_SLOP}>
      {text}
    </Pressable>
  );
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
  if (variant === "list-primary" && sourceListSlug) {
    return (
      <ListPrimaryRow
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

  // list-primary with no sourceListSlug degrades to people-primary layout,
  // dropping the "via" connector since there's no list to attribute to.
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
      showListConnector={variant === "people-primary"}
    />
  );
}

function ListPrimaryRow({
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
  const isOwnEvent = currentUserId === creator.id;
  const allUsers = combineUsers(creator, savers);
  const remainingListsCount = additionalSourceCount ?? 0;
  const avatarSize = iconSize * 0.9;
  const openModal = () => setShowModal(true);

  const maxStack = 3;
  // Own-event: "You" is already shown, so the stack surfaces other savers
  // only. Otherwise the stack combines creator + savers.
  const stackCandidates = isOwnEvent
    ? savers.filter((s) => s.id !== creator.id)
    : allUsers;
  const stackUsers = stackCandidates.slice(0, maxStack);
  const extraCount = Math.max(stackCandidates.length - maxStack, 0);

  const ownBadge = (
    <Pressable
      onPress={() => navigateToUser(creator, currentUserId)}
      hitSlop={HIT_SLOP}
      accessibilityLabel="Go to your profile"
      className="flex-row items-center gap-1"
    >
      <Avatar user={creator} size={avatarSize} />
      <Text className="text-xs text-neutral-2">You</Text>
    </Pressable>
  );

  const stack =
    stackUsers.length > 0 ? (
      <Pressable
        onPress={openModal}
        hitSlop={HIT_SLOP}
        accessibilityLabel="View everyone who saved this"
        className="flex-row items-center"
      >
        {stackUsers.map((user, index) => (
          <View key={user.id} style={{ marginLeft: index === 0 ? 0 : -6 }}>
            <Avatar user={user} size={avatarSize} />
          </View>
        ))}
        <OverflowPill count={extraCount} className="ml-1" />
      </Pressable>
    ) : null;

  return (
    <>
      <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-1">
        {isOwnEvent ? (
          <>
            {ownBadge}
            <Text className="text-xs text-neutral-2">·</Text>
          </>
        ) : null}
        <ListChip name={sourceListName} slug={sourceListSlug} />
        <OverflowPill count={remainingListsCount} onPress={openModal} />
        {stack ? (
          <>
            <Text className="text-xs text-neutral-2">·</Text>
            {stack}
          </>
        ) : null}
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

function PeoplePrimaryRow({
  creator,
  savers,
  iconSize,
  currentUserId,
  sourceListName,
  sourceListSlug,
  additionalSourceCount,
  lists,
  showListConnector,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  currentUserId?: string;
  sourceListName?: string;
  sourceListSlug?: string;
  additionalSourceCount?: number;
  lists?: Doc<"lists">[];
  showListConnector: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const isOwnEvent = currentUserId === creator.id;
  const allUsers = combineUsers(creator, savers);
  const displayUsers = allUsers.slice(0, 2);
  const remainingUsersCount = allUsers.length - displayUsers.length;
  const remainingListsCount = additionalSourceCount ?? 0;
  const avatarSize = iconSize * 0.9;
  const openModal = () => setShowModal(true);

  const listConnector = isOwnEvent ? "· Shared to" : "via";
  const hasAnyListInfo =
    !!sourceListSlug || !!sourceListName || remainingListsCount > 0;

  return (
    <>
      <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-1">
        {isOwnEvent ? (
          <Pressable
            onPress={() => navigateToUser(creator, currentUserId)}
            hitSlop={HIT_SLOP}
            className="flex-row items-center gap-1"
          >
            <Avatar user={creator} size={avatarSize} />
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
              <Avatar user={user} size={avatarSize} />
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
            {showListConnector ? (
              <Text className="text-xs text-neutral-2">{listConnector}</Text>
            ) : null}
            <ListChip name={sourceListName} slug={sourceListSlug} />
            <OverflowPill count={remainingListsCount} onPress={openModal} />
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
