import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { ChevronRight, List, User } from "~/components/icons";
import { UserProfileFlair } from "~/components/UserProfileFlair";

interface UserForDisplay {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

interface SavedByModalProps {
  visible: boolean;
  onClose: () => void;
  creator: UserForDisplay;
  savers: UserForDisplay[];
  lists: Doc<"lists">[];
  currentUserId?: string;
}

export function SavedByModal({
  visible,
  onClose,
  creator,
  savers,
  lists,
  currentUserId,
}: SavedByModalProps) {
  const insets = useSafeAreaInsets();

  // Deduplicated users: creator first, then savers
  const allUsers: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!allUsers.some((u) => u.id === saver.id)) {
      allUsers.push(saver);
    }
  }

  const handleUserPress = (user: UserForDisplay) => {
    onClose();
    if (currentUserId && user.id === currentUserId) {
      router.push("/settings/account");
    } else {
      router.push(`/${user.username}`);
    }
  };

  const handleListPress = (list: Doc<"lists">) => {
    onClose();
    if (list.slug) {
      router.push(`/list/${list.slug}`);
    }
  };

  const renderAvatar = (user: UserForDisplay) => {
    if (user.userImage) {
      return (
        <ExpoImage
          source={{ uri: user.userImage }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
          }}
          contentFit="cover"
          cachePolicy="disk"
        />
      );
    }
    return (
      <View className="h-10 w-10 items-center justify-center rounded-full bg-interactive-2">
        <User size={20} color="#627496" />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="border-b border-neutral-3 px-4 py-3">
          <Text className="text-lg font-bold text-neutral-1">Saved by</Text>
        </View>

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* People section */}
          <View className="px-4 pt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
              People
            </Text>
            {allUsers.map((user) => (
              <TouchableOpacity
                key={user.id}
                onPress={() => handleUserPress(user)}
                className="flex-row items-center py-3"
                activeOpacity={0.7}
              >
                <UserProfileFlair username={user.username} size="xs">
                  {renderAvatar(user)}
                </UserProfileFlair>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-neutral-1">
                    {user.displayName || user.username}
                  </Text>
                  <Text className="text-sm text-neutral-2">
                    {user.id === creator.id ? "Captured this event" : "Saved"}
                  </Text>
                </View>
                <ChevronRight size={16} color="#DCE0E8" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Lists section */}
          {lists.length > 0 && (
            <View className="px-4 pt-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                Lists
              </Text>
              {lists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  onPress={() => handleListPress(list)}
                  className="flex-row items-center py-3"
                  activeOpacity={0.7}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-interactive-2">
                    <List size={20} color="#5A32FB" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-neutral-1">
                      {list.name}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#DCE0E8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
