import type { KeyboardEvent } from "react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, Keyboard } from "react-native";

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
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
    function handleHide() {
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }

    const showSub = Keyboard.addListener("keyboardDidShow", handleShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", handleHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeightAnim]);

  return { marginBottomAnim };
}
