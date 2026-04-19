import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
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

const ICONS: {
  key: LinkField;
  name: IoniconName;
  placeholder: string;
  label: string;
  keyboard?: "email-address" | "phone-pad" | "url" | "default";
}[] = [
  {
    key: "publicInsta",
    name: "logo-instagram",
    placeholder: "@handle",
    label: "Instagram",
    keyboard: "default",
  },
  {
    key: "publicWebsite",
    name: "globe-outline",
    placeholder: "https://…",
    label: "Website",
    keyboard: "url",
  },
  {
    key: "publicEmail",
    name: "mail-outline",
    placeholder: "you@example.com",
    label: "Email",
    keyboard: "email-address",
  },
  {
    key: "publicPhone",
    name: "call-outline",
    placeholder: "+1 555 123 4567",
    label: "Phone",
    keyboard: "phone-pad",
  },
];

export function LinkIconRow({ values, onChange }: LinkIconRowProps) {
  const [active, setActive] = useState<LinkField | null>(null);

  const setField = (key: LinkField, value: string) => {
    onChange({ ...values, [key]: value.length === 0 ? null : value });
  };

  const activeEntry = ICONS.find((i) => i.key === active);

  return (
    <View>
      <View className="flex-row gap-3">
        {ICONS.map(({ key, name, label }) => {
          const filled = Boolean(values[key]);
          const isActive = active === key;
          return (
            <Pressable
              key={key}
              onPress={() => setActive(isActive ? null : key)}
              accessibilityLabel={`Edit ${label}`}
              className={`items-center justify-center rounded-full ${
                filled || isActive ? "bg-interactive-2" : "bg-interactive-3"
              }`}
              style={{ height: 48, width: 48 }}
            >
              <Ionicons
                name={name}
                size={22}
                color={filled || isActive ? "#5A32FB" : "#627496"}
              />
            </Pressable>
          );
        })}
      </View>

      {activeEntry ? (
        <View
          className="mt-3 rounded-xl bg-interactive-3 px-4"
          style={{ height: 48, justifyContent: "center" }}
        >
          <TextInput
            key={activeEntry.key}
            autoFocus
            className="text-base text-neutral-1"
            style={{ padding: 0 }}
            placeholder={activeEntry.placeholder}
            placeholderTextColor="rgb(98, 116, 150)"
            keyboardType={activeEntry.keyboard}
            autoCapitalize="none"
            value={values[activeEntry.key] ?? ""}
            onChangeText={(text) => setField(activeEntry.key, text)}
            onBlur={() => setActive(null)}
            returnKeyType="done"
            onSubmitEditing={() => setActive(null)}
          />
        </View>
      ) : null}
    </View>
  );
}
