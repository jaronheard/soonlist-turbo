import type { StyleProp, ViewStyle } from "react-native";
import React from "react";

import { Sticker } from "./Sticker";

interface SaveStickerProps {
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
}

export function SaveSticker({ style, onDismiss }: SaveStickerProps) {
  return (
    <Sticker
      caption="save it!"
      orientation="down-right"
      style={style}
      onDismiss={onDismiss}
      testID="onboarding-sticker-save"
    />
  );
}
