import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@clerk/clerk-expo";

import { Dialog } from "~/components/Dialog";
import { AlertTriangle, RefreshCw } from "~/components/icons";
import { useAuthStateManager } from "~/hooks/useAuthStateManager";
import { useSignOut } from "~/hooks/useSignOut";
import { logDebug, logError } from "~/utils/errorLogging";
import { getAccessGroup } from "~/utils/getAccessGroup";

interface ResetAuthButtonProps {
  style?: object;
}

export function ResetAuthButton({ style }: ResetAuthButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const signOut = useSignOut();
  const pathname = usePathname();
  const { attemptRecovery } = useAuthStateManager();
  const { getToken } = useAuth();

  // Don't show on main sign-in page
  if (pathname === "/sign-in") {
    return null;
  }

  const handleReset = async () => {
    setShowConfirmation(false);
    setIsResetting(true);
    
    try {
      await signOut();
      router.replace("/(onboarding)/onboarding");
    } catch (error) {
      logError("Error during auth reset", error);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleTryRecovery = async () => {
    setShowOptions(false);
    setIsResetting(true);
    
    try {
      // Try to refresh the token
      await attemptRecovery();
    } catch (error) {
      logError("Error during auth recovery", error);
    } finally {
      setIsResetting(false);
    }
  };
  
  const handleClearTokens = async () => {
    setShowOptions(false);
    setIsResetting(true);
    
    try {
      // Clear all Clerk tokens from SecureStore
      const tokenKeys = [
        "__clerk_client_jwt",
        "__clerk_session",
        "clerk-js-session",
        "clerk-js-user",
        "clerk-db-jwt",
      ];
      
      for (const key of tokenKeys) {
        try {
          await SecureStore.deleteItemAsync(key, {
            accessGroup: getAccessGroup(),
          });
          logDebug(`Deleted token: ${key}`);
        } catch (error) {
          logError(`Failed to delete token: ${key}`, error);
        }
      }
      
      // Try to get a fresh token
      try {
        await getToken({ template: "convex" });
        logDebug("Successfully refreshed token after clearing");
      } catch (tokenError) {
        logError("Failed to refresh token after clearing", tokenError);
      }
      
      // Redirect to sign-in
      router.replace("/sign-in");
    } catch (error) {
      logError("Error during token clearing", error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShowOptions(true)}
        style={[styles.button, style]}
        disabled={isResetting}
      >
        <RefreshCw size={16} color="#6B7280" />
        <Text style={styles.buttonText}>
          {isResetting ? "Working..." : "Stuck? Fix authentication"}
        </Text>
      </Pressable>

      <Dialog
        isVisible={showOptions}
        onDismiss={() => setShowOptions(false)}
        title="Authentication Options"
        confirmText={null}
        cancelText="Cancel"
        icon={<AlertTriangle size={24} color="#F59E0B" />}
      >
        <Text style={styles.dialogText}>
          If you're having trouble with authentication, try one of these options:
        </Text>
        
        <View style={styles.optionsContainer}>
          <Pressable
            onPress={handleTryRecovery}
            style={styles.optionButton}
          >
            <Text style={styles.optionButtonText}>Try to Recover Session</Text>
          </Pressable>
          
          <Pressable
            onPress={() => {
              setShowOptions(false);
              setShowConfirmation(true);
            }}
            style={styles.optionButton}
          >
            <Text style={styles.optionButtonText}>Sign Out & Reset</Text>
          </Pressable>
          
          <Pressable
            onPress={handleClearTokens}
            style={[styles.optionButton, styles.dangerButton]}
          >
            <Text style={styles.dangerButtonText}>Clear Auth Tokens</Text>
          </Pressable>
        </View>
      </Dialog>

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
          the welcome screen.
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
    marginBottom: 16,
  },
  optionsContainer: {
    marginTop: 16,
    width: "100%",
  },
  optionButton: {
    backgroundColor: "#5A32FB",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  optionButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: "#EF4444",
    marginTop: 8,
  },
  dangerButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 16,
  },
});
