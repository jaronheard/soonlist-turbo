import type { ReactNode } from "react";
import React, { Children, isValidElement } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableHighlight,
  View,
} from "react-native";

import type { LucideIcon } from "~/components/icons";
import { ChevronRight } from "~/components/icons";

const SEPARATOR_COLOR = "rgba(60,60,67,0.12)";
const SECONDARY_LABEL = "rgba(60,60,67,0.6)";
const TERTIARY_LABEL = "rgba(60,60,67,0.3)";
const ROW_HIGHLIGHT = "rgba(60,60,67,0.08)";
const INK_0 = "#162135";
const DESTRUCTIVE = "#E5484D";

interface SettingsGroupProps {
  header?: string;
  footer?: string;
  children: ReactNode;
}

function isSettingsRowElement(
  child: unknown,
): child is React.ReactElement<SettingsRowProps> {
  return isValidElement(child) && child.type === SettingsRow;
}

export function SettingsGroup({
  header,
  footer,
  children,
}: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  const lastIndex = rows.length - 1;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 22 }}>
      {header ? (
        <Text
          style={{
            fontSize: 13,
            letterSpacing: 0.13,
            color: SECONDARY_LABEL,
            textTransform: "uppercase",
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          {header}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {rows.map((child, index) => {
          const childProps = isSettingsRowElement(child) ? child.props : null;
          const hasIcon = Boolean(childProps?.icon && childProps.iconBg);
          return (
            <View key={index}>
              {child}
              {index < lastIndex ? (
                <View
                  style={{
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: SEPARATOR_COLOR,
                    marginLeft: hasIcon ? 58 : 16,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      {footer ? (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: SECONDARY_LABEL,
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 8,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

interface GlyphTileProps {
  icon: LucideIcon;
  color: string;
}

function GlyphTile({ icon: Icon, color }: GlyphTileProps) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={16} color="#FFFFFF" strokeWidth={2} />
    </View>
  );
}

type RowAccessory =
  | { type: "chevron" }
  | {
      type: "toggle";
      value: boolean;
      onValueChange: (v: boolean) => void;
      disabled?: boolean;
    }
  | { type: "none" };

interface SettingsRowProps {
  icon?: LucideIcon;
  iconBg?: string;
  label: string;
  value?: string;
  accessory?: RowAccessory;
  onPress?: () => void;
  tint?: "default" | "purple" | "ink-1" | "destructive";
  testID?: string;
  accessibilityHint?: string;
}

export function SettingsRow({
  icon,
  iconBg,
  label,
  value,
  accessory = { type: "chevron" },
  onPress,
  tint = "default",
  testID,
  accessibilityHint,
}: SettingsRowProps) {
  const labelColor =
    tint === "purple"
      ? "#5A32FB"
      : tint === "ink-1"
        ? "#34435F"
        : tint === "destructive"
          ? DESTRUCTIVE
          : INK_0;

  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
        gap: 12,
        backgroundColor: "#FFFFFF",
      }}
    >
      {icon && iconBg ? <GlyphTile icon={icon} color={iconBg} /> : null}
      <Text
        style={{
          flex: 1,
          fontSize: 17,
          letterSpacing: -0.17,
          color: labelColor,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={{
            fontSize: 17,
            letterSpacing: -0.17,
            color: SECONDARY_LABEL,
            maxWidth: 180,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
      ) : null}
      {accessory.type === "chevron" ? (
        <ChevronRight size={18} color={TERTIARY_LABEL} strokeWidth={2} />
      ) : null}
      {accessory.type === "toggle" ? (
        <Switch
          value={accessory.value}
          onValueChange={accessory.onValueChange}
          disabled={accessory.disabled}
        />
      ) : null}
    </View>
  );

  if (!onPress || accessory.type === "toggle") {
    return (
      <View testID={testID} accessibilityHint={accessibilityHint}>
        {content}
      </View>
    );
  }

  return (
    <TouchableHighlight
      onPress={onPress}
      underlayColor={ROW_HIGHLIGHT}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
    >
      {content}
    </TouchableHighlight>
  );
}
