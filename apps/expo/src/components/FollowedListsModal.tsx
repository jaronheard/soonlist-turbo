import React, { useCallback, useState } from "react";
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

import { ShareIcon, User } from "~/components/icons";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

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
  const unfollowListMutation = useMutation(api.lists.unfollowList);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  const handleUnfollow = useCallback(
    async (listId: string) => {
      setUnfollowingIds((prev) => new Set(prev).add(listId));
      try {
        await unfollowListMutation({ listId });
        void hapticSuccess();
      } catch (error) {
        logError("Error unfollowing list", error);
        toast.error("Failed to unfollow list");
      } finally {
        setUnfollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(listId);
          return next;
        });
      }
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

  const renderItem = useCallback(
    ({ item }: { item: Doc<"lists"> }) => {
      const isUnfollowing = unfollowingIds.has(item.id);

      return (
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center gap-3"
            onPress={() => {
              onClose();
              if (item.slug) {
                router.push(`/list/${item.slug}`);
              }
            }}
            activeOpacity={0.7}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-interactive-2">
              <User size={20} color="#627496" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold text-neutral-1"
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              void handleShareList(item.name, item.slug ?? undefined)
            }
            className="ml-2 rounded-full p-2"
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ShareIcon size={18} color="#5A32FB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleUnfollow(item.id)}
            disabled={isUnfollowing}
            className="ml-2 rounded-full bg-neutral-4 px-4 py-2"
            activeOpacity={0.7}
          >
            {isUnfollowing ? (
              <ActivityIndicator size="small" color="#627496" />
            ) : (
              <Text className="text-sm font-semibold text-neutral-2">
                Unfollow
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [unfollowingIds, handleUnfollow, handleShareList, onClose],
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
          <Text className="text-lg font-bold text-neutral-1">Following</Text>
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
        ) : (
          <FlatList
            data={followedLists}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-base text-neutral-2">
                  Not following any lists yet
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}
