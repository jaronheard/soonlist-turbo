import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { DiscoverSoonlistsContent } from "~/components/DiscoverSoonlistsContent";
import { SheetHeader } from "~/components/SheetHeader";

interface DiscoverSoonlistsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DiscoverSoonlistsModal({
  visible,
  onClose,
}: DiscoverSoonlistsModalProps) {
  const insets = useSafeAreaInsets();
  const followedLists = useQuery(api.lists.getFollowedLists);

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ backgroundColor: "#F4F1FF", paddingTop: insets.top }}
      >
        <SheetHeader
          title="Discover Soonlists"
          trailing={
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text className="text-base font-semibold text-interactive-1">
                Done
              </Text>
            </TouchableOpacity>
          }
        />
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <DiscoverSoonlistsContent
            followedLists={followedLists}
            onSubscribeSuccess={onClose}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
