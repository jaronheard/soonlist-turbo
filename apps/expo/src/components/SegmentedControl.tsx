import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";

export type Segment = "upcoming" | "past";

interface SegmentedControlProps {
  selectedSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
  upcomingLabel?: string;
  pastLabel?: string;
}

function SegmentedControlFallback({
  selectedSegment,
  onSegmentChange,
  upcomingLabel = "Upcoming",
  pastLabel = "Past",
}: SegmentedControlProps) {
  return (
    <View className="flex-row rounded-lg bg-gray-100 p-1">
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("upcoming")}
      >
        <Text
          className={
            selectedSegment === "upcoming"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          {upcomingLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("past")}
      >
        <Text
          className={
            selectedSegment === "past"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          {pastLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function SegmentedControl({
  selectedSegment,
  onSegmentChange,
  upcomingLabel = "Upcoming",
  pastLabel = "Past",
}: SegmentedControlProps) {
  if (Platform.OS === "ios") {
    return (
      <View style={{ width: 260 }}>
        <Host matchContents>
          <Picker
            selection={selectedSegment}
            onSelectionChange={(value) => {
              onSegmentChange(value as Segment);
            }}
            modifiers={[pickerStyle("segmented")]}
          >
            <SwiftUIText modifiers={[tag("upcoming")]}>
              {upcomingLabel}
            </SwiftUIText>
            <SwiftUIText modifiers={[tag("past")]}>{pastLabel}</SwiftUIText>
          </Picker>
        </Host>
      </View>
    );
  }

  return (
    <SegmentedControlFallback
      selectedSegment={selectedSegment}
      onSegmentChange={onSegmentChange}
      upcomingLabel={upcomingLabel}
      pastLabel={pastLabel}
    />
  );
}
