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

const CARD_RATIO = 9 / 16;

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
  width: number;
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

    const depth = (Math.sin(angle) + 1) / 2;
    const scale = CONFIG.scaleMin + depth * (CONFIG.scaleMax - CONFIG.scaleMin);

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
