import type { ImageSourcePropType } from "react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

interface GoogleSignInButtonProps {
  onPress: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}
    >
      <View style={styles.contentContainer}>
        <Image
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-require-imports
          source={require("../assets/google-logo.png") as ImageSourcePropType}
          style={styles.logo}
          contentFit="contain"
          cachePolicy="disk"
          transition={100}
        />
        <Text style={styles.text}>Continue with Google</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 100,
    paddingVertical: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  text: {
    color: "#757575",
    fontSize: 16,
    fontWeight: "500",
  },
});
