// Shared defaults for router-presented sheet screens. Spread into a
// Stack.Screen's options and override per-screen (e.g. sheetAllowedDetents,
// title, headerRight).
export const defaultSheetOptions = {
  presentation: "formSheet",
  headerShown: true,
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
} as const;
