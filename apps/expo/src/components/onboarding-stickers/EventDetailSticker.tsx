import type { StyleProp, ViewStyle } from "react-native";
import React from "react";

import { Sticker } from "./Sticker";

interface EventDetailStickerProps {
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
}

export function EventDetailSticker({
  style,
  onDismiss,
}: EventDetailStickerProps) {
  return (
    <Sticker
      caption="open it up!"
      orientation="down-right"
      style={style}
      onDismiss={onDismiss}
      testID="onboarding-sticker-event-detail"
    />
  );
}
