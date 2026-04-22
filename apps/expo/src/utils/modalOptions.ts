import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

// Shared Stack.Screen options for router-presented formSheet modals. Keep
// these in one place so every sheet-like screen (subscribed lists, pickers,
// saved-by) looks and behaves the same — native header, grabber, rounded
// corners. Per-screen tweaks can spread this and override keys.
export const defaultSheetOptions: NativeStackNavigationOptions = {
  presentation: "formSheet",
  headerShown: true,
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
};
