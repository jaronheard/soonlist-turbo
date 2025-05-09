import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router, usePathname } from "expo-router";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

import { Dialog } from "~/components/Dialog";
import { useSignOut } from "~/hooks/useSignOut";
import { useAppStore } from "~/store";

interface ResetOnboardingButtonProps {
  style?: object;
}

export function ResetOnboardingButton({ style }: ResetOnboardingButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const signOut = useSignOut();
  const resetStore = useAppStore((state) => state.resetStore);
  const pathname = usePathname();

  // Only show on sign-in/sign-up screens
  const authPaths = ["/sign-in", "/sign-up", "/verify-email"];
  const isAuthScreen = authPaths.includes(pathname);
  if (!isAuthScreen) {
    return null;
  }

  const handleReset = async () => {
    setShowConfirmation(false);
    resetStore();
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
        title="Reset Onboarding"
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleReset}
        icon={<AlertTriangle size={24} color="#F59E0B" />}
      >
        <Text style={styles.dialogText}>
          This will reset your onboarding progress and sign you out. You'll need
          to sign in again.
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
