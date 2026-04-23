import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { hapticSelection } from "~/utils/feedback";

export type UpcomingPastSegment = "upcoming" | "past";

function isUpcomingPastSegment(value: string): value is UpcomingPastSegment {
  return value === "upcoming" || value === "past";
}

interface UpcomingPastSegmentedControlProps {
  selectedSegment: UpcomingPastSegment;
  onSegmentChange: (segment: UpcomingPastSegment) => void;
}

export function UpcomingPastSegmentedControl({
  selectedSegment,
  onSegmentChange,
}: UpcomingPastSegmentedControlProps) {
  const emitChange = (segment: UpcomingPastSegment) => {
    if (segment === selectedSegment) return;
    void hapticSelection();
    onSegmentChange(segment);
  };

  if (Platform.OS === "ios" && SUPPORTS_LIQUID_GLASS) {
    return (
      <Host matchContents>
        <Picker
          selection={selectedSegment}
          onSelectionChange={(value) => {
            if (!isUpcomingPastSegment(value)) return;
            emitChange(value);
          }}
          modifiers={[pickerStyle("segmented")]}
        >
          <SwiftUIText modifiers={[tag("upcoming")]}>Upcoming</SwiftUIText>
          <SwiftUIText modifiers={[tag("past")]}>Past</SwiftUIText>
        </Picker>
      </Host>
    );
  }

  return (
    <View className="flex-row rounded-lg bg-gray-200 p-1">
      <TouchableOpacity
        className={`flex-1 items-center rounded-md px-3 py-2 ${
          selectedSegment === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => emitChange("upcoming")}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedSegment === "upcoming" }}
      >
        <Text
          className={
            selectedSegment === "upcoming"
              ? "font-semibold text-gray-950"
              : "font-medium text-gray-800"
          }
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`flex-1 items-center rounded-md px-3 py-2 ${
          selectedSegment === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => emitChange("past")}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedSegment === "past" }}
      >
        <Text
          className={
            selectedSegment === "past"
              ? "font-semibold text-gray-950"
              : "font-medium text-gray-800"
          }
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}
