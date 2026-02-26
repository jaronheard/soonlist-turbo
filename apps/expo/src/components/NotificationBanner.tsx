import React from "react";
import { Pressable, Text, View } from "react-native";
import { initialWindowMetrics } from "react-native-safe-area-context";
import { Image } from "expo-image";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-assertions
const appIcon = require("../../assets/icon.png") as number;

interface NotificationBannerProps {
  title: string;
  subtitle: string;
  body: string;
  onPress: () => void;
  hideNotification?: () => void;
}

export function NotificationBanner({
  title,
  subtitle,
  body,
  onPress,
  hideNotification,
}: NotificationBannerProps) {
  const handlePress = () => {
    hideNotification?.();
    onPress();
  };

  return (
    <View
      className="w-full px-2"
      style={{ paddingTop: (initialWindowMetrics?.insets.top ?? 0) + 4 }}
    >
      <Pressable onPress={handlePress}>
        <View
          className="w-full flex-row items-center gap-3 rounded-[20px] px-3 py-3"
          style={{
            backgroundColor: "#F8F8F8",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={appIcon}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
            }}
            contentFit="cover"
          />

          <View className="flex-1 pt-0.5">
            <Text
              className="text-sm font-semibold text-black"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
            <Text
              className="text-sm text-black"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
            <Text
              className="text-sm text-black/60"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {body}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
