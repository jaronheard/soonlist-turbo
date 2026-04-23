import type {
  EmitterSubscription,
  KeyboardEvent,
  KeyboardEventName,
} from "react-native";
import { useEffect } from "react";
import { Keyboard, Platform } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export function useKeyboardHeight(offset: number) {
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.select({
      ios: "keyboardWillShow",
      android: "keyboardDidShow",
    });
    const hideEvent = Platform.select({
      ios: "keyboardWillHide",
      android: "keyboardDidHide",
    });

    function handleKeyboardShow(e: KeyboardEvent) {
      const duration = e.duration && e.duration > 0 ? e.duration : 250;
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration,
        easing: Easing.out(Easing.ease),
      });
    }

    function handleKeyboardHide(e: KeyboardEvent) {
      const duration = e.duration && e.duration > 0 ? e.duration : 250;
      keyboardHeight.value = withTiming(0, {
        duration,
        easing: Easing.out(Easing.ease),
      });
    }

    const showSub: EmitterSubscription = Keyboard.addListener(
      showEvent as KeyboardEventName,
      handleKeyboardShow,
    );
    const hideSub: EmitterSubscription = Keyboard.addListener(
      hideEvent as KeyboardEventName,
      handleKeyboardHide,
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  const style = useAnimatedStyle(() => {
    return {
      marginBottom: keyboardHeight.value + offset,
    };
  });

  return { style };
}
