import React, { useCallback } from "react";
import {
  FlatList,
  Modal,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { List, ShareIcon, User } from "~/components/icons";
import { logError } from "~/utils/errorLogging";
import { UserProfileFlair } from "./UserProfileFlair";

interface UserForDisplay {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

interface EventSaversDialogProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  creator: UserForDisplay;
  savers: UserForDisplay[];
  lists: Doc<"lists">[];
  currentUserId?: string;
}

export function EventSaversDialog({
  visible,
  onClose,
  eventId: _eventId,
  creator,
  savers,
  lists,
  currentUserId,
}: EventSaversDialogProps) {
  const insets = useSafeAreaInsets();

  // Combine creator with savers, deduplicate by id
  const allUsers: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!allUsers.some((u) => u.id === saver.id)) {
      allUsers.push(saver);
    }
  }

  const handleUserPress = useCallback(
    (user: UserForDisplay) => {
      onClose();
      if (currentUserId && user.id === currentUserId) {
        router.push("/settings/account");
      } else {
        router.push(`/${user.username}`);
      }
    },
    [currentUserId, onClose],
  );

  const handleListPress = useCallback(
    (list: Doc<"lists">) => {
      onClose();
      if (list.slug) {
        router.push(`/list/${list.slug}`);
      }
    },
    [onClose],
  );

  const handleShareList = useCallback(
    async (listName: string, listSlug?: string) => {
      const shareUrl = listSlug
        ? `https://soonlist.com/list/${listSlug}`
        : "https://soonlist.com";
      try {
        await Share.share({
          message: `Check out ${listName} on Soonlist`,
          url: shareUrl,
        });
      } catch (error) {
        logError("Error sharing list", error);
      }
    },
    [],
  );

  const avatarSize = 36;

  const renderUserRow = useCallback(
    (user: UserForDisplay, isCreator: boolean) => (
      <TouchableOpacity
        key={user.id}
        onPress={() => handleUserPress(user)}
        className="flex-row items-center px-4 py-3"
        activeOpacity={0.7}
      >
        <UserProfileFlair username={user.username} size="sm">
          {user.userImage ? (
            <ExpoImage
              source={{ uri: user.userImage }}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 9999,
              }}
              contentFit="cover"
              contentPosition="center"
              cachePolicy="disk"
              transition={100}
              recyclingKey={`dialog-saver-${user.id}`}
            />
          ) : (
            <View
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: 9999,
                backgroundColor: "#E0D9FF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={avatarSize * 0.6} color="#627496" />
            </View>
          )}
        </UserProfileFlair>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-neutral-1">
            {user.displayName || user.username}
          </Text>
          {isCreator ? (
            <Text className="text-sm font-semibold text-interactive-1">
              Captured
            </Text>
          ) : (
            <Text className="text-sm text-neutral-2">Saved</Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [handleUserPress],
  );

  const renderListRow = useCallback(
    (list: Doc<"lists">) => (
      <View
        key={list._id}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <TouchableOpacity
          className="flex-1 flex-row items-center gap-3"
          onPress={() => handleListPress(list)}
          activeOpacity={0.7}
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-interactive-2">
            <List size={20} color="#5A32FB" />
          </View>
          <Text
            className="flex-1 text-base font-semibold text-neutral-1"
            numberOfLines={1}
          >
            {list.name}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            void handleShareList(list.name, list.slug ?? undefined)
          }
          className="ml-2 rounded-full p-2"
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ShareIcon size={18} color="#5A32FB" />
        </TouchableOpacity>
      </View>
    ),
    [handleListPress, handleShareList],
  );

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between border-b border-neutral-4 px-4 py-3">
          <Text className="text-lg font-bold text-neutral-1">Event Savers</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-base font-semibold text-interactive-1">
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListHeaderComponent={
            <View>
              {/* Saved By Section */}
              <Text className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                Saved By
              </Text>
              {allUsers.map((user) =>
                renderUserRow(user, user.id === creator.id),
              )}

              {/* Appears On Section — only if there are non-personal lists */}
              {lists.length > 0 && (
                <>
                  <Text className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                    Appears On
                  </Text>
                  {lists.map((list) => renderListRow(list))}
                </>
              )}
            </View>
          }
        />
      </View>
    </Modal>
  );
}
