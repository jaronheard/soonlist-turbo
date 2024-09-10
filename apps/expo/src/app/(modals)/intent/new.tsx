import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";

import CustomBottomSheetModal from "~/components/CustomBottomSheetModal";

export default function IntentLoadingScreen() {
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const handleDismissModal = () => bottomSheetRef.current?.dismiss();
    handleDismissModal();
  }, []);

  return (
    <View className="flex-1 bg-interactive-3">
      <CustomBottomSheetModal ref={bottomSheetRef} />
    </View>
  );
}
