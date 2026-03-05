import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AppleSignInButtonProps {
  onPress: () => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
}) => (
  <Pressable
    style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    onPress={onPress}
  >
    <View style={styles.contentContainer}>
      <Ionicons name="logo-apple" size={24} color="white" style={styles.icon} />
      <Text style={styles.text}>Continue with Apple</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#000",
    borderRadius: 100,
    paddingVertical: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#222",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
