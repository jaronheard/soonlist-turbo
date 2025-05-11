import * as Haptics from "expo-haptics";

type HapticType = "success" | "error" | "light" | "medium" | "heavy";

export function useHaptics() {
  const triggerHaptic = async (type: HapticType) => {
    try {
      switch (type) {
        case "success":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "error":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error triggering haptic feedback:", error);
    }
  };

  return { triggerHaptic };
}

