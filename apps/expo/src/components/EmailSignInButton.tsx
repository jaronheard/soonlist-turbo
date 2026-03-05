import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Mail } from "~/components/icons";

interface EmailSignInButtonProps {
  onPress: () => void;
}

export function EmailSignInButton({ onPress }: EmailSignInButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={onPress}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Mail size={24} color="#162135" />
        </View>
        <Text style={styles.text}>Continue with Email</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#DCE0E8",
    borderWidth: 1,
    borderColor: "#DCE0E8",
    borderRadius: 100,
    paddingVertical: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#CDD1D9",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  text: {
    color: "#162135",
    fontSize: 16,
    fontWeight: "500",
  },
});
