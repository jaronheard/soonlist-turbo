import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AppleSignInButtonProps {
  onPress: () => void;
}

export const AppleSignInButton: React.FC<AppleSignInButtonProps> = ({
  onPress,
}) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Ionicons name="logo-apple" size={24} color="white" style={styles.icon} />
    <Text style={styles.text}>Continue with Apple</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.2)",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
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
