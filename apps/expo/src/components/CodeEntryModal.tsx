import React, { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export const DISCOVER_CODE_KEY = "soonlist_discover_code";

interface CodeEntryModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function CodeEntryModal({ isVisible, onClose }: CodeEntryModalProps) {
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { isAuthenticated } = useConvexAuth();
  const redeemCode = useAction(api.codes.redeemCode);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError("Please enter a code");
      return;
    }

    setIsRedeeming(true);
    setError("");

    try {
      // Validate the code locally first
      const validCode = "DISCOVER";
      const normalizedCode = code.trim().toUpperCase();

      if (normalizedCode !== validCode) {
        setError("Invalid code. Please try again.");
        setIsRedeeming(false);
        return;
      }

      if (isAuthenticated) {
        // User is authenticated, use the Convex action
        const result = await redeemCode({ code: normalizedCode });

        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setSuccess(false);
            setCode("");
          }, 1500);
        } else {
          setError(result.error || "Invalid code. Please try again.");
        }
      } else {
        // User is anonymous, store the code for later
        await AsyncStorage.setItem(DISCOVER_CODE_KEY, normalizedCode);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setCode("");
        }, 1500);
      }
    } catch (err) {
      console.error("Error redeeming code:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    setSuccess(false);
    setIsRedeeming(false);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        <View className="w-full max-w-sm rounded-lg bg-white p-6">
          {success ? (
            <View className="items-center">
              <Text className="mb-2 text-lg font-semibold text-green-600">
                🎉 Success!
              </Text>
              <Text className="text-center text-gray-600">
                Discover access unlocked! You can now explore public events.
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-4 text-center text-lg font-semibold text-gray-800">
                Enter Your Code
              </Text>

              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Enter code"
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus={true}
                className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-mono text-lg uppercase"
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleRedeem}
                editable={!isRedeeming}
              />

              {error ? (
                <Text className="mb-3 text-center text-sm text-red-500">
                  {error}
                </Text>
              ) : null}

              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleClose}
                  disabled={isRedeeming}
                  className="flex-1 rounded-lg border border-gray-300 py-3"
                >
                  <Text className="text-center font-medium text-gray-600">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleRedeem}
                  disabled={isRedeeming || !code.trim()}
                  className={`flex-1 rounded-lg py-3 ${
                    isRedeeming || !code.trim()
                      ? "bg-gray-400"
                      : "bg-interactive-1"
                  }`}
                >
                  <Text className="text-center font-medium text-white">
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
