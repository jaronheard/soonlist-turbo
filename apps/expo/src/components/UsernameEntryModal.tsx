import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useConvex } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

interface UsernameEntryModalProps {
  isVisible: boolean;
  onClose: () => void;
  /**
   * Called right before navigating to the feed on a successful subscribe.
   * Used by parent empty states to dismiss their sticky `emptyStateMode` so
   * the user doesn't return to a stale empty-state screen.
   */
  onSubscribeSuccess?: () => void;
}

function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  const stripped = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return stripped.toLowerCase();
}

export function UsernameEntryModal({
  isVisible,
  onClose,
  onSubscribeSuccess,
}: UsernameEntryModalProps): React.ReactElement {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Synchronous guard against rapid double-taps — React state updates are async,
  // so `isSubmitting` alone does not prevent two calls from queuing before the
  // button disables. Mirrors the pattern used in FeaturedListRow.
  const isMutatingRef = useRef(false);

  const router = useRouter();
  const convex = useConvex();
  const { user } = useUser();
  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );

  const handleSubmit = async () => {
    if (isMutatingRef.current) return;

    const normalized = normalizeUsername(username);
    if (!normalized) {
      setError("Please enter a username");
      return;
    }

    // Client-side self-follow precheck. Backend does not reject self-follows.
    const currentUsername = user?.username?.toLowerCase();
    if (currentUsername && normalized === currentUsername) {
      setError("That's you!");
      return;
    }

    isMutatingRef.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const result = await convex.mutation(api.lists.followUserByUsername, {
        username: normalized,
      });

      if (result.success) {
        // Let parents dismiss their sticky empty-state mode so the user
        // doesn't return to a stale empty-state screen after subscribing.
        onSubscribeSuccess?.();

        if (pendingFollowUsername) {
          // Clearing pending causes the parent to switch from
          // ReferralEmptyState to DefaultEmptyState, which unmounts this
          // modal and cancels any pending setTimeout. Navigate synchronously
          // so `router.push` actually fires before unmount.
          setPendingFollowUsername(null);
          setUsername("");
          onClose();
          router.push("/(tabs)/feed");
          return;
        }

        setSuccess(true);
        timeoutRef.current = setTimeout(() => {
          onClose();
          setSuccess(false);
          setUsername("");
          router.push("/(tabs)/feed");
        }, 600);
        return;
      }

      const reason = result.reason ?? "";
      if (
        reason === "User not found" ||
        reason === "User has no personal list"
      ) {
        setError(`We couldn't find @${normalized}.`);
      } else if (reason.startsWith("Cannot follow this list")) {
        setError("This list is private.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: unknown) {
      logError("Error following user by username", err, {
        username: normalized,
      });
      setError("Something went wrong. Please try again.");
    } finally {
      isMutatingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setUsername("");
    setError("");
    setSuccess(false);
    setIsSubmitting(false);
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
                Subscribed!
              </Text>
              <Text className="text-center text-gray-500">
                Taking you to My Scene…
              </Text>
            </View>
          ) : (
            <>
              <Text className="mb-6 text-center font-heading text-xl font-bold text-gray-700">
                Enter their username
              </Text>

              <View
                className="mb-4 w-full flex-row items-center rounded-xl border border-neutral-200 bg-white px-4"
                style={{ height: 48 }}
              >
                <Text
                  className="text-neutral-2"
                  style={{ fontSize: 18, marginRight: 4 }}
                >
                  @
                </Text>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (error) setError("");
                  }}
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                  keyboardType="ascii-capable"
                  inputMode="text"
                  selectionColor="#5A32FB"
                  placeholderTextColor="#9CA3AF"
                  clearButtonMode="while-editing"
                  keyboardAppearance="light"
                  enablesReturnKeyAutomatically={true}
                  className="flex-1 text-base"
                  style={{ fontSize: 18, height: 48 }}
                  maxLength={32}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  editable={!isSubmitting}
                  spellCheck={false}
                />
              </View>

              {error ? (
                <Text className="mb-4 text-center text-sm font-medium text-red-500">
                  {error}
                </Text>
              ) : null}

              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel username entry"
                  onPress={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full border border-gray-300 py-4"
                >
                  <Text className="text-center font-semibold text-gray-600">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Subscribe to user"
                  onPress={() => void handleSubmit()}
                  disabled={isSubmitting || !username.trim()}
                  className={`flex-1 rounded-full py-4 ${
                    isSubmitting || !username.trim()
                      ? "bg-gray-400"
                      : "bg-interactive-1"
                  }`}
                >
                  <Text className="text-center font-semibold text-white">
                    {isSubmitting ? "Subscribing…" : "Subscribe"}
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
