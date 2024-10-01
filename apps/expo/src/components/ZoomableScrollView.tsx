import type { PinchGestureHandlerGestureEvent } from "react-native-gesture-handler";
import React, { useRef } from "react";
import { Dimensions, ScrollView } from "react-native";
import { PinchGestureHandler } from "react-native-gesture-handler";
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
  const { width, height } = Dimensions.get("window");
  const scrollRef = useRef<ScrollView>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const lastScale = useSharedValue(1);

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
      } else if (scale.value > 3) {
        scale.value = withTiming(3);
        lastScale.value = 3;
      }
      savedScale.value = lastScale.value;
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <PinchGestureHandler onGestureEvent={pinchHandler}>
      <Animated.View>
        <ScrollView
          ref={scrollRef}
          maximumZoomScale={3}
          minimumZoomScale={1}
          contentContainerStyle={{
            width: width * savedScale.value,
            height: height * savedScale.value,
          }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          <Animated.View style={animatedStyle}>{children}</Animated.View>
        </ScrollView>
      </Animated.View>
    </PinchGestureHandler>
  );
};

export default ZoomableScrollView;
