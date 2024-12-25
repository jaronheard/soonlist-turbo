import type { ToastOptions as RNToastOptions } from "react-native-root-toast";
import Toast from "react-native-root-toast";

type ToastType = "success" | "error" | "info" | "loading";

interface CustomToastOptions {
  duration?: number;
  position?: number;
  onHide?: () => void;
}

// Define proper types for the Toast API
interface ToastConfig extends RNToastOptions {
  containerStyle?: {
    borderRadius: number;
    paddingHorizontal: number;
    paddingVertical: number;
    shadowOffset: {
      width: number;
      height: number;
    };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  textStyle?: {
    color: string;
    fontWeight: string;
    fontSize: number;
  };
}

const toastStyles: Record<
  ToastType,
  { backgroundColor: string; textColor: string }
> = {
  success: { backgroundColor: "#C4DA9D", textColor: "#162135" },
  error: { backgroundColor: "#ba2727", textColor: "#F7F7F7" },
  info: { backgroundColor: "#7ACEFC", textColor: "#162135" },
  loading: { backgroundColor: "#FFD1BA", textColor: "#162135" },
};

export const showToast = (
  message: string,
  type: ToastType = "info",
  options?: CustomToastOptions,
): number => {
  const style = toastStyles[type];

  const toast = Toast.show(message, {
    duration: options?.duration ?? Toast.durations.SHORT,
    position: options?.position ?? Toast.positions.CENTER - 200,
    animation: true,
    hideOnPress: true,
    delay: 0,
    shadow: false,
    backgroundColor: style.backgroundColor,
    opacity: 0.95,
    containerStyle: {
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 1,
    },
    textStyle: {
      color: style.textColor,
      fontWeight: "500",
      fontSize: 14,
    },
    onHide: options?.onHide,
  } as ToastConfig);

  return toast;
};

export const hideToast = (toast: number): void => {
  Toast.hide(toast);
};
