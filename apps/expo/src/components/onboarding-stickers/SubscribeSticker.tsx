import type { StyleProp, ViewStyle } from "react-native";
import React from "react";

import { Sticker } from "./Sticker";

interface SubscribeStickerProps {
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
}

export function SubscribeSticker({ style, onDismiss }: SubscribeStickerProps) {
  return (
    <Sticker
      caption="start here!"
      orientation="down-right"
      style={style}
      onDismiss={onDismiss}
      testID="onboarding-sticker-subscribe"
    />
  );
}
