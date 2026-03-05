import type { ImageSourcePropType } from "react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";

interface GoogleSignInButtonProps {
  onPress: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
}) => {
  return (
    <Pressable
      className="rounded-full border border-gray-300 bg-white py-3 active:scale-[0.98] active:bg-neutral-100"
      onPress={onPress}
    >
      <View className="flex-row items-center justify-center">
        <Image
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
          source={require("../assets/google-logo.png") as ImageSourcePropType}
          style={{ width: 24, height: 24, marginRight: 12 }}
          contentFit="contain"
          cachePolicy="disk"
          transition={100}
        />
        <Text className="text-base font-medium text-neutral-500">
          Continue with Google
        </Text>
      </View>
    </Pressable>
  );
};
