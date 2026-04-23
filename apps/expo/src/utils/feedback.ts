import * as Haptics from "expo-haptics";
import * as Burnt from "burnt";


export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const hapticHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

export const hapticSelection = () => Haptics.selectionAsync();

export const toast = {
  success: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "done",
      haptic: "success",
      duration: 2,
    });
  },

  error: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "error",
      haptic: "error",
      duration: 3,
    });
  },

  warning: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "none",
      haptic: "warning",
      duration: 2.5,
    });
  },

  dismiss: (): void => {
    // burnt toasts auto-dismiss, no manual dismiss needed
  },
};

export const alert = {
  show: (title: string, message?: string): void => {
    void Burnt.alert({
      title,
      message,
      preset: "done",
    });
  },

  error: (title: string, message?: string): void => {
    void Burnt.alert({
      title,
      message,
      preset: "error",
    });
  },
};
