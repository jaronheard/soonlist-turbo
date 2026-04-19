import React from "react";
import { TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type LinkField =
  | "publicInsta"
  | "publicWebsite"
  | "publicEmail"
  | "publicPhone";

export interface LinkValues {
  publicInsta?: string | null;
  publicWebsite?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
}

interface LinkIconRowProps {
  values: LinkValues;
  onChange: (next: LinkValues) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const FIELDS: {
  key: LinkField;
  name: IoniconName;
  placeholder: string;
  label: string;
  keyboard?: "email-address" | "phone-pad" | "url" | "default";
}[] = [
  {
    key: "publicInsta",
    name: "logo-instagram",
    placeholder: "Instagram handle",
    label: "Instagram",
    keyboard: "default",
  },
  {
    key: "publicWebsite",
    name: "globe-outline",
    placeholder: "Website URL",
    label: "Website",
    keyboard: "url",
  },
  {
    key: "publicEmail",
    name: "mail-outline",
    placeholder: "Email address",
    label: "Email",
    keyboard: "email-address",
  },
  {
    key: "publicPhone",
    name: "call-outline",
    placeholder: "Phone number",
    label: "Phone",
    keyboard: "phone-pad",
  },
];

export function LinkIconRow({ values, onChange }: LinkIconRowProps) {
  const setField = (key: LinkField, value: string) => {
    onChange({ ...values, [key]: value.length === 0 ? null : value });
  };

  return (
    <View style={{ gap: 8 }}>
      {FIELDS.map(({ key, name, placeholder, keyboard, label }) => {
        const value = values[key] ?? "";
        const filled = Boolean(value);
        return (
          <View key={key} className="flex-row items-center" style={{ gap: 12 }}>
            <View
              className={`items-center justify-center rounded-full ${
                filled ? "bg-interactive-2" : "bg-interactive-3"
              }`}
              style={{ height: 40, width: 40 }}
            >
              <Ionicons
                name={name}
                size={20}
                color={filled ? "#5A32FB" : "#627496"}
              />
            </View>
            <TextInput
              className="flex-1 rounded-xl bg-interactive-3 text-neutral-1"
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 16,
                lineHeight: 20,
              }}
              placeholder={placeholder}
              placeholderTextColor="rgb(98, 116, 150)"
              keyboardType={keyboard}
              autoCapitalize="none"
              value={value}
              onChangeText={(text) => setField(key, text)}
              accessibilityLabel={label}
            />
          </View>
        );
      })}
    </View>
  );
}
