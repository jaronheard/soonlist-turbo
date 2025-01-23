import type { KeyboardEvent } from "react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, Keyboard, Platform } from "react-native";

interface UseKeyboardHeight {
  marginBottomAnim: Animated.AnimatedAddition<number>;
}

export function useKeyboardHeight(offset: number): UseKeyboardHeight {
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const marginBottomAnim = Animated.add(keyboardHeightAnim, offset);

  useEffect(() => {
    function handleShow(e: KeyboardEvent) {
      Animated.timing(keyboardHeightAnim, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? 250 : 200,
        easing:
          Platform.OS === "ios"
            ? Easing.bezier(0.17, 0.59, 0.4, 0.77) // iOS keyboard curve
            : Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
    function handleHide() {
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === "ios" ? 250 : 200,
        easing:
          Platform.OS === "ios"
            ? Easing.bezier(0.17, 0.59, 0.4, 0.77) // iOS keyboard curve
            : Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      handleShow,
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      handleHide,
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  return { marginBottomAnim };
}
