import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import { ChevronRight, List } from "~/components/icons";
import { UserAvatar } from "~/components/UserAvatar";
import { navigateToUser } from "~/utils/navigateToUser";

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

  // Show every non-system list this event belongs to — including the source
  // list that's shown inline on the card. This is a complete "Saved by" view,
  // and the "+N" card badge intentionally counts *additional* lists beyond
  // the source, so the modal length is N+1 by design.
  //
  // Private-list access is enforced on the SERVER (see feeds.ts
  // `queryFeed`/`queryGroupedFeed`, which filter `event.lists` through
  // `getViewableListIds`). Do NOT re-add a blanket `visibility !== "private"`
  // filter here: the server already guarantees we only receive lists the
  // viewer can see, and adding that filter would incorrectly hide private
  // lists the viewer is the owner/member of.
  const visibleLists = lists.filter((list) => !list.isSystemList);

  const handleUserPress = (user: UserForDisplay) => {
    onClose();
    navigateToUser(user, currentUserId);
  };

  const handleListPress = (list: Doc<"lists">) => {
    onClose();
    if (list.slug) {
      router.push(`/list/${list.slug}`);
    }
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
                <UserAvatar user={user} size={40} />
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
          {visibleLists.length > 0 && (
            <View className="px-4 pt-4">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                Lists
              </Text>
              {visibleLists.map((list) => (
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
