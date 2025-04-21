import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router, usePathname } from "expo-router";

import { Dialog } from "~/components/Dialog";
import { AlertTriangle, RefreshCw } from "~/components/icons";
import { useSignOut } from "~/hooks/useSignOut";

interface ResetAuthButtonProps {
  style?: object;
}

export function ResetAuthButton({ style }: ResetAuthButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const signOut = useSignOut();
  const pathname = usePathname();

  // Don't show on main sign-in page
  if (pathname === "/sign-in") {
    return null;
  }

  const handleReset = async () => {
    setShowConfirmation(false);
    await signOut();
    router.replace("/sign-in");
  };

  return (
    <>
      <Pressable
        onPress={() => setShowConfirmation(true)}
        style={[styles.button, style]}
      >
        <RefreshCw size={16} color="#6B7280" />
        <Text style={styles.buttonText}>Stuck? Return to sign-in</Text>
      </Pressable>

      <Dialog
        isVisible={showConfirmation}
        onDismiss={() => setShowConfirmation(false)}
        title="Reset Authentication"
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleReset}
        icon={<AlertTriangle size={24} color="#F59E0B" />}
      >
        <Text style={styles.dialogText}>
          This will clear your current authentication progress and return you to
          the sign-in screen.
        </Text>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  dialogText: {
    textAlign: "center",
    fontSize: 16,
    color: "#4B5563",
  },
});
