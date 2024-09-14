import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mail } from "lucide-react-native";

interface EmailSignInButtonProps {
  onPress: () => void;
}

export function EmailSignInButton({ onPress }: EmailSignInButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Mail size={24} color="#162135" />
      </View>
      <Text style={styles.text}>Continue with Email</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0D9FF",
    borderWidth: 1,
    borderColor: "#E0D9FF",
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 8,
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
