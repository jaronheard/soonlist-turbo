import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
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

import { List, ShareIcon } from "~/components/icons";
import { SheetHeader } from "~/components/SheetHeader";
import { SubscribeButton } from "~/components/SubscribeButton";
import Config from "~/utils/config";
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
        ? `${Config.apiBaseUrl}/list/${listSlug}`
        : Config.apiBaseUrl;
      try {
        await Share.share(
          Platform.OS === "ios"
            ? { url: shareUrl }
            : { message: `Check out ${listName} on Soonlist: ${shareUrl}` },
        );
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
        <SheetHeader
          title="Subscribed lists"
          trailing={
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text className="text-base font-semibold text-interactive-1">
                Done
              </Text>
            </TouchableOpacity>
          }
        />

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
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View className="rounded-2xl bg-interactive-3/60 px-4 pb-3 pt-3">
              {followedLists.map((list) => (
                <View key={list.id} className="flex-row items-center py-2.5">
                  <TouchableOpacity
                    className="min-w-0 flex-1 flex-row items-center"
                    onPress={() => handleListPress(list)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Open list ${list.name}`}
                  >
                    <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-interactive-3">
                      <List size={20} color="#5A32FB" />
                    </View>
                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-base font-semibold text-neutral-1"
                        numberOfLines={1}
                      >
                        {list.name}
                      </Text>
                    </View>
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
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
