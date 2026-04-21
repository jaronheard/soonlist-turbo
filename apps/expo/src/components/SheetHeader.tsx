import React from "react";
import { Text, View } from "react-native";

interface SheetHeaderProps {
  title: string;
  /** Right-aligned content — typically a close chip or text button. */
  trailing?: React.ReactNode;
}

/**
 * Shared header for page-sheet modals. Matches the "From these Soonlists"
 * and "Subscribed lists" style: title left, optional trailing action right,
 * no bottom border.
 */
export function SheetHeader({ title, trailing }: SheetHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Text className="text-lg font-bold text-neutral-1">{title}</Text>
      {trailing ?? null}
    </View>
  );
}
