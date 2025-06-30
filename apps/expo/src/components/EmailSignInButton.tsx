import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Mail } from "~/components/icons";

interface EmailSignInButtonProps {
  onPress: () => void;
}

export function EmailSignInButton({ onPress }: EmailSignInButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Mail size={24} color="#162135" />
        </View>
        <Text style={styles.text}>Continue with Email</Text>
      </View>
    </TouchableOpacity>
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
