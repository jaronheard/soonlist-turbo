import React, { useState } from "react";
import { Pressable, Text } from "react-native";
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
    router.replace("/(onboarding)/onboarding");
  };

  return (
    <>
      <Pressable
        onPress={() => setShowConfirmation(true)}
        className="flex-row items-center justify-center p-2"
        style={style}
      >
        <RefreshCw size={16} color="#6B7280" />
        <Text className="ml-2 text-sm text-gray-500">
          Stuck? Return to sign-in
        </Text>
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
        <Text className="text-center text-base text-gray-600">
          This will clear your current authentication progress and return you to
          the welcome screen.
        </Text>
      </Dialog>
    </>
  );
}
