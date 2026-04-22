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

function combineUsers(creator: UserForDisplay, savers: UserForDisplay[]) {
  const out: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!out.some((u) => u.id === saver.id)) {
      out.push(saver);
    }
  }
  return out;
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
      <PeopleOnlyRow
        creator={creator}
        savers={savers}
        iconSize={iconSize}
        currentUserId={currentUserId}
      />
    );
  }

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

function PeopleOnlyRow({
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
  const isOwnEvent = currentUserId === creator.id;
  const avatarSize = iconSize * 0.9;

  // Hide the viewer from their own savers row in either branch — they
  // already know they have it.
  const displayUsers = isOwnEvent
    ? savers.filter((s) => s.id !== creator.id)
    : combineUsers(creator, savers).filter((u) => u.id !== currentUserId);

  if (displayUsers.length === 0) {
    return null;
  }

  const maxInline = 2;
  const inlineUsers = displayUsers.slice(0, maxInline);
  const remainingUsersCount = displayUsers.length - inlineUsers.length;

  return (
    <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-2">
      {isOwnEvent ? (
        <Text className="text-xs text-neutral-2">Saved by</Text>
      ) : null}
      {inlineUsers.map((user, index) => (
        <Pressable
          key={user.id}
          onPress={() => navigateToUser(user, currentUserId)}
          hitSlop={HIT_SLOP}
          className="flex-row items-center gap-1"
        >
          <UserAvatar user={user} size={avatarSize} />
          <Text className="text-xs text-neutral-2">
            {user.displayName || user.username}
            {index < inlineUsers.length - 1 || remainingUsersCount > 0
              ? ","
              : ""}
          </Text>
        </Pressable>
      ))}
      <OverflowPill count={remainingUsersCount} />
    </View>
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
      <UserAvatar user={creator} size={avatarSize} />
      <Text className="text-xs text-neutral-2">You</Text>
    </Pressable>
  );

  const stack =
    stackUsers.length > 0 ? (
      <Pressable
        onPress={openModal}
        hitSlop={HIT_SLOP}
        accessibilityLabel="View everyone who saved this"
        className="flex-row items-center gap-2"
      >
        {stackUsers.map((user) => (
          <UserAvatar key={user.id} user={user} size={avatarSize} />
        ))}
        <OverflowPill count={extraCount} className="ml-1" />
      </Pressable>
    ) : null;

  return (
    <>
      <View className="mx-auto mt-1 flex-row flex-wrap items-center justify-center gap-2">
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
