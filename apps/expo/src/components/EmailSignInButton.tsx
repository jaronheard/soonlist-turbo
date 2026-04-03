import React from "react";
import { Pressable, Text, View } from "react-native";

import { Mail } from "~/components/icons";
import { hapticMedium } from "~/utils/feedback";

interface EmailSignInButtonProps {
  onPress: () => void;
}

export function EmailSignInButton({ onPress }: EmailSignInButtonProps) {
  return (
    <Pressable
      className="rounded-full border border-[#DCE0E8] bg-[#DCE0E8] py-3 active:scale-[0.98] active:bg-[#CDD1D9]"
      onPress={() => {
        void hapticMedium();
        onPress();
      }}
    >
      <View className="flex-row items-center justify-center">
        <View style={{ marginRight: 10 }}>
          <Mail size={24} color="#162135" />
        </View>
        <Text className="text-base font-medium text-[#162135]">
          Continue with Email
        </Text>
      </View>
    </Pressable>
  );
}
