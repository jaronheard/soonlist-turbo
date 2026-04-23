import * as Haptics from "expo-haptics";
import * as Burnt from "burnt";

/**
 * Feedback utilities for iOS HIG-compliant user feedback
 *
 * Uses burnt for native iOS toast (SPIndicator) when visual feedback is needed,
 * and expo-haptics for tactile feedback on simple confirmations.
 */

// Haptic-only feedback for simple confirmations (iOS HIG recommends subtle feedback)
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const hapticHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

export const hapticSelection = () => Haptics.selectionAsync();

// Toast notifications using burnt (native iOS SPIndicator)
// Use for errors and important actions that need visual confirmation
export const toast = {
  /**
   * Show a success toast with native iOS styling
   * Use sparingly - prefer hapticSuccess() for simple confirmations
   */
  success: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "done",
      haptic: "success",
      duration: 2,
    });
  },

  /**
   * Show an error toast - always use for errors that need user attention
   */
  error: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "error",
      haptic: "error",
      duration: 3,
    });
  },

  /**
   * Show a warning/info toast
   */
  warning: (title: string, message?: string): void => {
    void Burnt.toast({
      title,
      message,
      preset: "none",
      haptic: "warning",
      duration: 2.5,
    });
  },

  /**
   * Dismiss all toasts
   */
  dismiss: (): void => {
    // burnt toasts auto-dismiss, no manual dismiss needed
  },
};
