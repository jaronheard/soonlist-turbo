import Toast from "react-native-root-toast";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastOptions {
  duration?: number;
  position?: number;
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
  options?: ToastOptions,
) => {
  const style = toastStyles[type];

  Toast.show(message, {
    duration: options?.duration ?? Toast.durations.SHORT,
    position: options?.position ?? 40,
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
    },
    textStyle: {
      color: style.textColor,
      fontWeight: "500",
      fontSize: 14,
    },
  });
};
