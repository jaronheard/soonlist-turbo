import type {
  PanGestureHandlerGestureEvent,
  PinchGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import React, { useRef } from "react";
import { ScrollView } from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface ZoomableScrollViewProps {
  children: React.ReactNode;
  refreshControl?: React.ReactElement;
}

const ZoomableScrollView: React.FC<ZoomableScrollViewProps> = ({
  children,
  refreshControl,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const lastScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);

  const pinchHandler = useAnimatedGestureHandler<
    PinchGestureHandlerGestureEvent,
    { startScale: number }
  >({
    onStart: (_, ctx) => {
      ctx.startScale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = ctx.startScale * event.scale;
    },
    onEnd: () => {
      lastScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withTiming(1);
        lastScale.value = 1;
        // Reset translation when zooming out
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        lastTranslateX.value = 0;
        lastTranslateY.value = 0;
      } else if (scale.value > 3) {
        scale.value = withTiming(3);
        lastScale.value = 3;
      }
      savedScale.value = lastScale.value;
    },
  });

  const panHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      if (scale.value > 1) {
        translateX.value = ctx.startX + event.translationX;
        translateY.value = ctx.startY + event.translationY;
      }
    },
    onEnd: () => {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <PanGestureHandler onGestureEvent={panHandler}>
      <Animated.View style={{ flex: 1 }}>
        <PinchGestureHandler onGestureEvent={pinchHandler}>
          <Animated.View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              refreshControl={refreshControl}
              scrollEnabled={scale.value === 1}
            >
              <Animated.View style={animatedStyle}>{children}</Animated.View>
            </ScrollView>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default ZoomableScrollView;
