import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { ChevronRight, List, ShareIcon } from "~/components/icons";
import { SubscribeButton } from "~/components/SubscribeButton";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

interface FollowedListsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FollowedListsModal({
  visible,
  onClose,
}: FollowedListsModalProps) {
  const insets = useSafeAreaInsets();
  const followedLists = useQuery(api.lists.getFollowedLists);
  const unfollowListMutation = useMutation(
    api.lists.unfollowList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined) return;
    localStore.setQuery(
      api.lists.getFollowedLists,
      {},
      current.filter((l) => l.id !== args.listId),
    );
  });

  const handleUnfollow = useCallback(
    (listId: string) => {
      unfollowListMutation({ listId }).catch((error: unknown) => {
        logError("Error unfollowing list", error);
        toast.error("Failed to unsubscribe");
      });
    },
    [unfollowListMutation],
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

  const handleListPress = useCallback(
    (list: Doc<"lists">) => {
      onClose();
      if (list.slug) {
        router.push(`/list/${list.slug}`);
      }
    },
    [onClose],
  );

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-neutral-3 px-4 py-3">
          <Text className="text-lg font-bold text-neutral-1">
            Subscribed lists
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text className="text-base font-semibold text-interactive-1">
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {followedLists === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A32FB" />
          </View>
        ) : followedLists.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-base text-neutral-2">
              Not subscribed to any lists yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={followedLists}
            keyExtractor={(list) => list.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
            }}
            ListHeaderComponent={
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
                Lists
              </Text>
            }
            renderItem={({ item: list }) => {
              return (
                <View className="flex-row items-center py-3">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center"
                    onPress={() => handleListPress(list)}
                    activeOpacity={0.7}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-interactive-2">
                      <List size={20} color="#5A32FB" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        className="text-base font-semibold text-neutral-1"
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#DCE0E8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      void handleShareList(list.name, list.slug ?? undefined)
                    }
                    className="ml-2 rounded-full p-2"
                    activeOpacity={0.7}
                    accessibilityLabel={`Share ${list.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ShareIcon size={18} color="#5A32FB" />
                  </TouchableOpacity>

                  <View className="ml-1">
                    <SubscribeButton
                      isSubscribed={true}
                      onPress={() => handleUnfollow(list.id)}
                      size="sm"
                      accessibilityLabel={`Unsubscribe from ${list.name}`}
                    />
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
