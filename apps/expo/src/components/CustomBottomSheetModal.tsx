import React, { forwardRef, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

export type Ref = BottomSheetModal;

interface Props {
  children: React.ReactNode;
}

const CustomBottomSheetModal = forwardRef<Ref, Props>(({ children }, ref) => {
  const snapPoints = useMemo(() => ["50%", "75%"], []);

  return (
    <BottomSheetModal ref={ref} index={0} snapPoints={snapPoints}>
      <View className="flex-1 items-center p-4">{children}</View>
    </BottomSheetModal>
  );
});

export default CustomBottomSheetModal;
