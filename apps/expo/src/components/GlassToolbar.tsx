import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, GlassEffectContainer, Host, Image } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  frame,
  glassEffect,
  padding,
} from "@expo/ui/swift-ui/modifiers";

import { useAddEventFlow } from "~/hooks/useAddEventFlow";

interface GlassToolbarProps {
  bottomOffset?: number;
}

export function GlassToolbar({ bottomOffset = 100 }: GlassToolbarProps) {
  const insets = useSafeAreaInsets();
  const { triggerAddEventFlow } = useAddEventFlow();

  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <View
      style={[styles.container, { bottom: bottomOffset + insets.bottom }]}
      pointerEvents="box-none"
    >
      <Host matchContents>
        <GlassEffectContainer
          spacing={0}
          modifiers={[
            glassEffect({
              glass: { interactive: true, variant: "regular" },
            }),
          ]}
        >
          <Button
            modifiers={[
              buttonStyle("plain"),
              frame({ height: 56, minWidth: 56 }),
              padding({ horizontal: 16 }),
            ]}
            onPress={() => void triggerAddEventFlow()}
          >
            <Image systemName="plus" size={28} color="#5A32FB" />
          </Button>
        </GlassEffectContainer>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    zIndex: 100,
  },
});
