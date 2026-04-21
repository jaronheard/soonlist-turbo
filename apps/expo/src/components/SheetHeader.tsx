import React from "react";
import { Text, View } from "react-native";

interface SheetHeaderProps {
  title: string;
  trailing?: React.ReactNode;
}

export function SheetHeader({ title, trailing }: SheetHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text className="text-lg font-bold text-neutral-1">{title}</Text>
      {trailing ?? null}
    </View>
  );
}
