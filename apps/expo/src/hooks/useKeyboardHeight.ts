// useKeyboardHeight.ts
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

/**
 * Returns an object containing a Reanimated `style` that
 * you can spread onto a View. It animates marginBottom when
 * the keyboard shows/hides, offset by `offset`.
 */
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
      // iOS provides e.duration, Android often doesn’t
      const duration = e.duration && e.duration > 0 ? e.duration : 250;
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration,
        easing: Easing.out(Easing.ease),
      });
    }

    function handleKeyboardHide(e: KeyboardEvent) {
      // iOS provides e.duration, Android often doesn’t
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

  // Use a Reanimated style to transform the marginBottom
  const style = useAnimatedStyle(() => {
    return {
      marginBottom: keyboardHeight.value + offset,
    };
  });

  return { style };
}
