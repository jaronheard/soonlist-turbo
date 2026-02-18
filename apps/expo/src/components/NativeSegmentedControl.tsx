import React from "react";
import { Pressable, Text, View } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

interface NativeSegmentedControlProps {
  value: "upcoming" | "past";
  onChange: (value: "upcoming" | "past") => void;
}

const SEGMENTS: ("upcoming" | "past")[] = ["upcoming", "past"];

export function NativeSegmentedControl({
  value,
  onChange,
}: NativeSegmentedControlProps) {
  if (process.env.EXPO_OS === "ios") {
    return (
      <SegmentedControl
        values={["Upcoming", "Past"]}
        selectedIndex={SEGMENTS.indexOf(value)}
        onChange={(event) => {
          const selected =
            SEGMENTS[event.nativeEvent.selectedSegmentIndex] ?? "upcoming";
          onChange(selected);
        }}
      />
    );
  }

  return (
    <View className="flex-row rounded-xl bg-neutral-4 p-1">
      {SEGMENTS.map((segment) => {
        const isSelected = segment === value;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(segment)}
            className={`flex-1 rounded-lg px-3 py-2 ${isSelected ? "bg-white" : "bg-transparent"}`}
          >
            <Text
              className={`text-center text-sm ${isSelected ? "font-semibold text-neutral-1" : "text-neutral-2"}`}
            >
              {segment === "upcoming" ? "Upcoming" : "Past"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
