import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { DISCOVER_CODE_KEY } from "~/constants";
import { useAppStore } from "~/store";

// Moved DISCOVER_CODE_KEY to shared constants

interface CodeEntryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function CodeEntryModal({
  isVisible,
  onClose,
}: CodeEntryModalProps): React.ReactElement {
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const redeemCode = useAction(api.codes.redeemCode);
  const setDiscoverAccessOverride = useAppStore(
    (s) => s.setDiscoverAccessOverride,
  );

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError("Please enter a code");
      return;
    }

    setIsRedeeming(true);
    setError("");

    try {
      const normalizedCode = code.trim().toUpperCase();

      // Always validate the code first using the backend action
      const result = await redeemCode({ code: normalizedCode });

      if (result.success) {
        if (isAuthenticated) {
          // Force UI to enable Discover immediately
          setDiscoverAccessOverride(true);
          // Refresh Clerk user so publicMetadata updates immediately
          if (user && typeof user.reload === "function") {
            await user.reload();
            // Check if showDiscover is now true in metadata and clear override
            if (user.publicMetadata.showDiscover) {
              setDiscoverAccessOverride(false);
            }
          }
          setSuccess(true);
          timeoutRef.current = setTimeout(() => {
            onClose();
            setSuccess(false);
            setCode("");
          }, 1500);
        } else {
          // User is anonymous, store the validated code for later
          await AsyncStorage.setItem(DISCOVER_CODE_KEY, normalizedCode);
          setSuccess(true);
          timeoutRef.current = setTimeout(() => {
            onClose();
            setSuccess(false);
            setCode("");
          }, 1500);
        }
      } else {
        setError(result.error ?? "Invalid code. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Error redeeming code:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCode("");
    setError("");
    setSuccess(false);
    setIsRedeeming(false);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          {success ? (
            <View className="items-center">
              <Text className="mb-2 font-heading text-xl font-bold text-green-600">
                🎉 Success!
              </Text>
              {isAuthenticated ? (
                <Text className="text-center text-gray-500">
                  Discover access unlocked! You can now explore public events.
                </Text>
              ) : (
                <Text className="text-center text-gray-500">
                  Code saved. It will be applied automatically after you sign
                  up.
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text className="mb-6 text-center font-heading text-xl font-bold text-gray-700">
                Enter Your Code
              </Text>

              <TextInput
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  if (error) setError("");
                }}
                placeholder="Enter code"
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
                keyboardType="ascii-capable"
                textContentType="oneTimeCode"
                inputMode="text"
                selectionColor="#5A32FB"
                placeholderTextColor="#9CA3AF"
                clearButtonMode="while-editing"
                keyboardAppearance="light"
                enablesReturnKeyAutomatically={true}
                className="mb-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base"
                style={{ textAlign: "center", fontSize: 18, height: 48 }}
                maxLength={32}
                returnKeyType="done"
                onSubmitEditing={() => void handleRedeem()}
                editable={!isRedeeming}
                spellCheck={false}
              />

              {error ? (
                <Text className="mb-4 text-center text-sm font-medium text-red-500">
                  {error}
                </Text>
              ) : null}

              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel code entry"
                  onPress={handleClose}
                  disabled={isRedeeming}
                  className="flex-1 rounded-full border border-gray-300 py-4"
                >
                  <Text className="text-center font-semibold text-gray-600">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Redeem code"
                  onPress={() => void handleRedeem()}
                  disabled={isRedeeming || !code.trim() || isLoading}
                  className={`flex-1 rounded-full py-4 ${
                    isRedeeming || !code.trim() || isLoading
                      ? "bg-gray-400"
                      : "bg-interactive-1"
                  }`}
                >
                  <Text className="text-center font-semibold text-white">
                    {isRedeeming ? "Redeeming..." : "Redeem"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
