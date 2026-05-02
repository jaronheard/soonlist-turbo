import React, { useCallback } from "react";
import { ScrollView, Text, TouchableHighlight, View } from "react-native";

import type { EventVisibility } from "~/constants";
import { Check, EyeOff, Globe } from "~/components/icons";
import { SettingsGroup } from "~/components/settings/SettingsList";
import {
  useDefaultEventVisibility,
  useSetDefaultEventVisibility,
} from "~/store";
import { hapticSelection } from "~/utils/feedback";

const PAGE_BG = "#F2F2F7";
const PURPLE = "#5A32FB";
const INK_0 = "#162135";
const SECONDARY_LABEL = "rgba(60,60,67,0.6)";
const ROW_HIGHLIGHT = "rgba(60,60,67,0.08)";

interface VisibilityOption {
  value: EventVisibility;
  label: string;
  description: string;
  icon: typeof Globe;
}

const OPTIONS: VisibilityOption[] = [
  {
    value: "public",
    label: "Public",
    description: "Events appear on your public Soonlist by default.",
    icon: Globe,
  },
  {
    value: "private",
    label: "Private",
    description: "Events are only visible to you by default.",
    icon: EyeOff,
  },
];

function VisibilityRow({
  option,
  selected,
  onSelect,
}: {
  option: VisibilityOption;
  selected: boolean;
  onSelect: (value: EventVisibility) => void;
}) {
  const Icon = option.icon;
  return (
    <TouchableHighlight
      onPress={() => onSelect(option.value)}
      underlayColor={ROW_HIGHLIGHT}
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityState={{ selected }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: 56,
          gap: 12,
          backgroundColor: "#FFFFFF",
        }}
      >
        <Icon size={20} color={INK_0} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 17,
              letterSpacing: -0.17,
              color: INK_0,
            }}
          >
            {option.label}
          </Text>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: SECONDARY_LABEL,
              marginTop: 2,
            }}
          >
            {option.description}
          </Text>
        </View>
        {selected ? <Check size={20} color={PURPLE} strokeWidth={2.5} /> : null}
      </View>
    </TouchableHighlight>
  );
}

export default function VisibilityScreen() {
  const visibility = useDefaultEventVisibility();
  const setVisibility = useSetDefaultEventVisibility();

  const handleSelect = useCallback(
    (next: EventVisibility) => {
      if (next !== visibility) {
        setVisibility(next);
        void hapticSelection();
      }
    },
    [visibility, setVisibility],
  );

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup footer="Edit any event to override.">
          {OPTIONS.map((option) => (
            <VisibilityRow
              key={option.value}
              option={option}
              selected={visibility === option.value}
              onSelect={handleSelect}
            />
          ))}
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}
