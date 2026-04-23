import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
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

import { ShareIcon } from "~/components/icons";
import { SheetHeader } from "~/components/SheetHeader";
import { SubscribedListRow } from "~/components/SubscribedListRow";
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
  const followedLists = useQuery(api.lists.getFollowedListsWithPreview);
  const [unsubscribingIds, setUnsubscribingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const unfollowListMutation = useMutation(
    api.lists.unfollowList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current !== undefined) {
      localStore.setQuery(
        api.lists.getFollowedLists,
        {},
        current.filter((l) => l.id !== args.listId),
      );
    }
    const currentWithPreview = localStore.getQuery(
      api.lists.getFollowedListsWithPreview,
      {},
    );
    if (currentWithPreview !== undefined) {
      localStore.setQuery(
        api.lists.getFollowedListsWithPreview,
        {},
        currentWithPreview.filter((row) => row.list.id !== args.listId),
      );
    }
  });

  const handleUnfollow = useCallback(
    (listId: string) => {
      setUnsubscribingIds((prev) => {
        const next = new Set(prev);
        next.add(listId);
        return next;
      });
      unfollowListMutation({ listId })
        .catch((error: unknown) => {
          logError("Error unfollowing list", error);
          toast.error("Failed to unsubscribe");
        })
        .finally(() => {
          setUnsubscribingIds((prev) => {
            const next = new Set(prev);
            next.delete(listId);
            return next;
          });
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
          <FlatList
            data={followedLists}
            keyExtractor={(row) => row.list.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 16,
            }}
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-1">
                <View className="min-w-0 flex-1">
                  <SubscribedListRow
                    list={item.list}
                    owner={item.owner}
                    previewImageUrls={item.previewImageUrls}
                    upcomingCount={item.upcomingCount}
                    hasMoreUpcoming={item.hasMoreUpcoming}
                    onPress={() => handleListPress(item.list)}
                    onUnsubscribe={() => handleUnfollow(item.list.id)}
                    isUnsubscribing={unsubscribingIds.has(item.list.id)}
                  />
                </View>
                <TouchableOpacity
                  onPress={() =>
                    void handleShareList(
                      item.list.name,
                      item.list.slug ?? undefined,
                    )
                  }
                  className="rounded-full p-2"
                  activeOpacity={0.7}
                  accessibilityLabel={`Share ${item.list.name}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ShareIcon size={18} color="#5A32FB" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
