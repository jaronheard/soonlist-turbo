import { useColorScheme as useNativewindColorScheme } from "nativewind";

export function useColorScheme() {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { setColorScheme, toggleColorScheme } = useNativewindColorScheme();
  return {
    // colorScheme: colorScheme ?? "dark",
    // isDarkColorScheme:

    // light only for now
    colorScheme: "light",
    isDarkColorScheme: false,
    setColorScheme,
    toggleColorScheme,
  };
}
