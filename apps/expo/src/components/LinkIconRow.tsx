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

const makeIcon =
  (name: IoniconName): React.ComponentType<{ size: number; color: string }> =>
  ({ size, color }) => <Ionicons name={name} size={size} color={color} />;

const ICONS: {
  key: LinkField;
  Icon: React.ComponentType<{ size: number; color: string }>;
  placeholder: string;
  keyboard?: "email-address" | "phone-pad" | "url" | "default";
}[] = [
  {
    key: "publicInsta",
    Icon: makeIcon("logo-instagram"),
    placeholder: "@handle",
    keyboard: "default",
  },
  {
    key: "publicWebsite",
    Icon: makeIcon("globe-outline"),
    placeholder: "https://...",
    keyboard: "url",
  },
  {
    key: "publicEmail",
    Icon: makeIcon("at-outline"),
    placeholder: "you@example.com",
    keyboard: "email-address",
  },
  {
    key: "publicPhone",
    Icon: makeIcon("call-outline"),
    placeholder: "+1 555 123 4567",
    keyboard: "phone-pad",
  },
];

export function LinkIconRow({ values, onChange }: LinkIconRowProps) {
  const [active, setActive] = useState<LinkField | null>(null);

  const setField = (key: LinkField, value: string) => {
    onChange({ ...values, [key]: value.length === 0 ? null : value });
  };

  return (
    <View>
      <View className="flex-row gap-3">
        {ICONS.map(({ key, Icon }) => {
          const filled = Boolean(values[key]);
          return (
            <Pressable
              key={key}
              onPress={() => setActive(active === key ? null : key)}
              accessibilityLabel={`Edit ${key}`}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                filled
                  ? "bg-interactive-2"
                  : "border border-dashed border-neutral-300"
              }`}
            >
              <Icon size={18} color={filled ? "#5A32FB" : "#999"} />
            </Pressable>
          );
        })}
      </View>

      {active ? (
        <TextInput
          key={active}
          autoFocus
          className="mt-3 rounded-md border border-neutral-300 px-3 py-2 text-base"
          placeholder={ICONS.find((i) => i.key === active)?.placeholder}
          keyboardType={ICONS.find((i) => i.key === active)?.keyboard}
          autoCapitalize="none"
          value={values[active] ?? ""}
          onChangeText={(text) => setField(active, text)}
          onBlur={() => setActive(null)}
        />
      ) : null}
    </View>
  );
}
