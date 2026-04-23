import React from "react";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import type { UserForDisplay } from "~/types/user";
import { AttributionGrid } from "~/components/AttributionGrid";
import { X } from "~/components/icons";
import { SheetHeader } from "~/components/SheetHeader";

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
        <SheetHeader
          title="From these Soonlists:"
          trailing={
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="h-8 w-8 items-center justify-center rounded-full bg-interactive-3"
            >
              <X size={16} color="#5A32FB" />
            </TouchableOpacity>
          }
        />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <AttributionGrid
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
