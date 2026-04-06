import type { SharedValue } from "react-native-reanimated";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";

// ---------------------------------------------------------------------------
// OnboardingOrbit — Cast C3 (locked in from baby-soonlist-mobile animation lab)
//
// A soft tilted disc orbit of 12 event-screenshot cards. Ambient, slow, no
// entrance animation — already spinning when the screen mounts. Designed to
// sit above an onboarding CTA as a calm "your list is ready" moment.
// ---------------------------------------------------------------------------

const CARD_RATIO = 9 / 16; // width / height — portrait screenshot

// Orbit config (from animation lab variant "29 · Cast C3")
const CONFIG = {
  cardCount: 12,
  tiltRatio: 0.62, // radiusY / radiusX — rounder ellipse (closer to circle)
  durationMs: 18000, // one full revolution
  radiusRatio: 0.38, // radiusX as fraction of stage width (leaves side margin)
  cardWidthRatio: 0.14, // card width as fraction of stage width
  scaleMin: 0.6, // back (far) card scale
  scaleMax: 1.1, // front (near) card scale
  leanDeg: 5, // ±tangent lean per card
};

// Images are ordered by orbit slot. Order matters — it's the Cast C3 shuffle.
// require() is the standard RN pattern for static image assets; each call
// returns an asset-module id (number).
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const IMAGES: number[] = [
  require("./images/01.jpg"),
  require("./images/02.jpg"),
  require("./images/03.jpg"),
  require("./images/04.jpg"),
  require("./images/05.jpg"),
  require("./images/06.jpg"),
  require("./images/07.jpg"),
  require("./images/08.jpg"),
  require("./images/09.jpg"),
  require("./images/10.jpg"),
  require("./images/11.jpg"),
  require("./images/12.jpg"),
];
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

interface Props {
  /** Container width in px. Card sizes + radius scale from this. */
  width: number;
  /** Container height in px. Typically width × 4/3 for a 3:4 stage. */
  height: number;
}

export default function OnboardingOrbit({ width, height }: Props) {
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: CONFIG.durationMs,
        easing: Easing.linear,
      }),
      -1,
    );
  }, [phase]);

  const cardW = width * CONFIG.cardWidthRatio;
  const cardH = cardW / CARD_RATIO;
  const radiusX = width * CONFIG.radiusRatio;
  const radiusY = radiusX * CONFIG.tiltRatio;

  return (
    <View
      style={{
        width,
        height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {IMAGES.map((image, i) => {
        const baseAngle = (i / CONFIG.cardCount) * Math.PI * 2;
        return (
          <OrbitCard
            key={i}
            phase={phase}
            baseAngle={baseAngle}
            radiusX={radiusX}
            radiusY={radiusY}
            containerW={width}
            containerH={height}
            cardW={cardW}
            cardH={cardH}
            image={image}
          />
        );
      })}
    </View>
  );
}

function OrbitCard({
  phase,
  baseAngle,
  radiusX,
  radiusY,
  containerW,
  containerH,
  cardW,
  cardH,
  image,
}: {
  phase: SharedValue<number>;
  baseAngle: number;
  radiusX: number;
  radiusY: number;
  containerW: number;
  containerH: number;
  cardW: number;
  cardH: number;
  image: number;
}) {
  const style = useAnimatedStyle(() => {
    const angle = baseAngle + phase.value;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;

    // Depth: sin(angle) = +1 → bottom of ellipse = near viewer
    //        sin(angle) = -1 → top of ellipse    = far from viewer
    const depth = (Math.sin(angle) + 1) / 2; // 0 far .. 1 near
    const scale = CONFIG.scaleMin + depth * (CONFIG.scaleMax - CONFIG.scaleMin);

    // Subtle tangent lean — ±5° sway as cards orbit
    const leanDeg = Math.cos(angle) * CONFIG.leanDeg;

    return {
      zIndex: Math.round(depth * 100),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${leanDeg}deg` },
        { scale },
      ],
    };
  });

  return (
    // Outer view: shadow + transforms. Must NOT clip (iOS shadows break on
    // overflow:hidden), so the rounded-corner clipping happens on the inner
    // view.
    <Animated.View
      style={[
        {
          position: "absolute",
          left: containerW / 2 - cardW / 2,
          top: containerH / 2 - cardH / 2,
          width: cardW,
          height: cardH,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
        },
        style,
      ]}
    >
      <View
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <Image
          source={image}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
    </Animated.View>
  );
}
