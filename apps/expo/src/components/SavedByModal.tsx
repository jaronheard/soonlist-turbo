import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import { FromTheseSoonlists } from "~/components/FromTheseSoonlists";
import { X } from "~/components/icons";

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

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header — matches the "From these Soonlists" teaching sentence,
            paired with a tinted close chip that ties to the card tint
            below. */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-neutral-1">
            From these Soonlists:
          </Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="h-8 w-8 items-center justify-center rounded-full bg-interactive-3"
          >
            <X size={16} color="#5A32FB" />
          </TouchableOpacity>
        </View>

        {/* Scrollable content */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <FromTheseSoonlists
            creator={creator}
            savers={savers}
            lists={lists}
            currentUserId={currentUserId}
            onNavigate={onClose}
            variant="card"
            showLabel={false}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
