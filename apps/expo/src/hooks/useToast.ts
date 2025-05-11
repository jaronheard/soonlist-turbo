import { useCallback } from "react";
import Toast from "react-native-toast-message";

interface ToastOptions {
  message: string;
  type: "success" | "error" | "info";
  position?: "top" | "bottom";
  duration?: number;
}

export function useToast() {
  const showToast = useCallback(
    ({ message, type, position = "bottom", duration = 3000 }: ToastOptions) => {
      Toast.show({
        type,
        text1: message,
        position,
        visibilityTime: duration,
      });
    },
    []
  );

  return { showToast };
}

