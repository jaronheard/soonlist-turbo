import type { StyleProp, ViewStyle } from "react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

export type StickerOrientation =
  | "down-left"
  | "down-right"
  | "up-left"
  | "up-right";

interface StickerProps {
  caption: string;
  orientation?: StickerOrientation;
  style?: StyleProp<ViewStyle>;
  onDismiss?: () => void;
  testID?: string;
}

// Marker-stroke arrow paths for a 60x60 viewBox. Each orientation has
// a curved body and a matching chevron arrowhead at its terminus.
const ARROW_PATHS: Record<StickerOrientation, { body: string; head: string }> =
  {
    "down-right": {
      body: "M6,8 Q26,14 36,30 T52,50",
      head: "M46,44 L54,54 L42,52",
    },
    "down-left": {
      body: "M54,8 Q34,14 24,30 T8,50",
      head: "M14,44 L6,54 L18,52",
    },
    "up-right": {
      body: "M6,52 Q26,46 36,30 T52,10",
      head: "M46,16 L54,6 L42,8",
    },
    "up-left": {
      body: "M54,52 Q34,46 24,30 T8,10",
      head: "M14,16 L6,6 L18,8",
    },
  };

const STICKER_COLOR = "#FF4D4D";
const STICKER_STROKE_WIDTH = 3.5;

export function Sticker({
  caption,
  orientation = "down-right",
  style,
  onDismiss,
  testID,
}: StickerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const { body, head } = ARROW_PATHS[orientation];
  const isDown = orientation.startsWith("down");
  const isRight = orientation.endsWith("right");
  const captionRotation = isRight ? -6 : 6;

  // Caption sits at the arrow's tail (opposite the arrowhead).
  const captionPos: ViewStyle = {
    position: "absolute",
    ...(isDown ? { top: -6 } : { bottom: -6 }),
    ...(isRight ? { left: 0 } : { right: 0 }),
  };
  const arrowPos: ViewStyle = {
    position: "absolute",
    ...(isDown ? { bottom: 0 } : { top: 0 }),
    ...(isRight ? { right: 0 } : { left: 0 }),
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(250)}
      exiting={FadeOut.duration(180)}
      style={[{ position: "absolute" }, style]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel={`${caption}. Onboarding hint. Tap to dismiss.`}
        accessibilityHint="Dismisses the onboarding hint"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        testID={testID}
      >
        <View style={{ width: 120, height: 92 }}>
          <Svg
            width={60}
            height={60}
            viewBox="0 0 60 60"
            style={arrowPos}
            pointerEvents="none"
          >
            <Path
              d={body}
              stroke={STICKER_COLOR}
              strokeWidth={STICKER_STROKE_WIDTH}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={head}
              stroke={STICKER_COLOR}
              strokeWidth={STICKER_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          <View
            style={[
              captionPos,
              {
                flexDirection: "row",
                alignItems: "center",
                transform: [{ rotate: `${captionRotation}deg` }],
              },
            ]}
          >
            <Text
              style={{
                fontFamily: "Kalam_700Bold",
                fontSize: 18,
                color: STICKER_COLOR,
                textShadowColor: "rgba(255,255,255,0.6)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {caption}
            </Text>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: STICKER_COLOR,
                marginLeft: 5,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 11,
                  lineHeight: 13,
                  fontWeight: "700",
                }}
              >
                ×
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
