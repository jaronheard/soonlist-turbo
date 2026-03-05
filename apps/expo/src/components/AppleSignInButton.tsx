import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AppleSignInButtonProps {
  onPress: () => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
}) => (
  <Pressable
    className="rounded-full bg-black py-3 active:scale-[0.98] active:bg-neutral-800"
    onPress={onPress}
  >
    <View className="flex-row items-center justify-center">
      <Ionicons name="logo-apple" size={24} color="white" className="mr-2.5" />
      <Text className="text-base font-semibold text-white">
        Continue with Apple
      </Text>
    </View>
  </Pressable>
);
