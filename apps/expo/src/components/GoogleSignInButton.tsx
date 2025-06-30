import type { ImageSourcePropType } from "react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

interface GoogleSignInButtonProps {
  onPress: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
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
    </TouchableOpacity>
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
