import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { LinkValues } from "./LinkIconRow";
import { Camera } from "./icons";
import { LinkIconRow } from "./LinkIconRow";

interface FirstShareSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful Share or Share now — opens the native share sheet. */
  onComplete: () => Promise<void> | void;
}

const INPUT_CLASSES =
  "rounded-xl bg-interactive-3 px-4 text-base text-neutral-1";
const INPUT_STYLE = { height: 48 } as const;
const PLACEHOLDER_COLOR = "rgb(98, 116, 150)";

export function FirstShareSetupSheet({
  visible,
  onClose,
  onComplete,
}: FirstShareSetupSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const completeSetup = useMutation(api.users.completeFirstShareSetup);
  const markSharedWithoutEdits = useMutation(api.users.markSharedWithoutEdits);

  const defaultListName = currentUser?.publicListName
    ? currentUser.publicListName
    : `${currentUser?.displayName ?? user?.firstName ?? "My"}'s Soonlist`;

  const [listName, setListName] = useState(defaultListName);
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName ?? "",
  );
  const [links, setLinks] = useState<LinkValues>({
    publicInsta: currentUser?.publicInsta ?? null,
    publicWebsite: currentUser?.publicWebsite ?? null,
    publicEmail: currentUser?.publicEmail ?? null,
    publicPhone: currentUser?.publicPhone ?? null,
  });
  const [avatar, setAvatar] = useState<string | null>(
    currentUser?.userImage ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const seedRef = useRef({ defaultListName, currentUser });
  seedRef.current = { defaultListName, currentUser };
  useEffect(() => {
    if (!visible) return;
    const { defaultListName: seedListName, currentUser: seedUser } =
      seedRef.current;
    setListName(seedListName);
    setDisplayName(seedUser?.displayName ?? "");
    setLinks({
      publicInsta: seedUser?.publicInsta ?? null,
      publicWebsite: seedUser?.publicWebsite ?? null,
      publicEmail: seedUser?.publicEmail ?? null,
      publicPhone: seedUser?.publicPhone ?? null,
    });
    setAvatar(seedUser?.userImage ?? null);
    setError(null);
    setIsDirty(false);
  }, [visible]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.1,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const mimeType = result.assets[0].mimeType ?? "image/jpeg";
    const base64 = `data:${mimeType};base64,${result.assets[0].base64}`;
    try {
      await user?.setProfileImage({ file: base64 });
      setAvatar(result.assets[0].uri);
      markDirty();
    } catch {
      setError("Couldn't update photo. Try again.");
    }
  }, [user, markDirty]);

  const userId = currentUser?.id;

  const handleShare = useCallback(async () => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeSetup({
        userId,
        publicListName: listName,
        displayName,
        publicInsta: links.publicInsta ?? null,
        publicWebsite: links.publicWebsite ?? null,
        publicEmail: links.publicEmail ?? null,
        publicPhone: links.publicPhone ?? null,
      });
      await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [userId, listName, displayName, links, completeSetup, onComplete]);

  const handleShareNow = useCallback(async () => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isDirty) {
        await completeSetup({
          userId,
          publicListName: listName,
          displayName,
          publicInsta: links.publicInsta ?? null,
          publicWebsite: links.publicWebsite ?? null,
          publicEmail: links.publicEmail ?? null,
          publicPhone: links.publicPhone ?? null,
        });
      } else {
        await markSharedWithoutEdits({ userId });
      }
      await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [
    userId,
    isDirty,
    listName,
    displayName,
    links,
    completeSetup,
    markSharedWithoutEdits,
    onComplete,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40"
        accessibilityLabel="Dismiss"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="absolute inset-x-0 bottom-0"
      >
        <View
          className="rounded-t-3xl bg-white px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-neutral-3" />
          </View>

          <Text className="mb-1 text-center text-2xl font-bold text-neutral-1">
            Share your Soon List
          </Text>
          <Text className="mb-6 text-center text-sm text-neutral-2">
            Make it yours before sending.
          </Text>

          <View className="mb-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
              List name
            </Text>
            <TextInput
              className={INPUT_CLASSES}
              style={INPUT_STYLE}
              value={listName}
              onChangeText={(t) => {
                setListName(t);
                markDirty();
              }}
              placeholderTextColor={PLACEHOLDER_COLOR}
              maxLength={80}
            />
          </View>

          <View className="mb-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
              Your profile
            </Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={pickAvatar}
                accessibilityLabel="Change photo"
                style={{ height: 48, width: 48 }}
              >
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-interactive-3">
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={{ height: 48, width: 48 }}
                    />
                  ) : (
                    <Camera size={20} color="#5A32FB" />
                  )}
                </View>
                <View
                  className="absolute bottom-0 right-0 items-center justify-center rounded-full border-2 border-white bg-interactive-1"
                  style={{ height: 18, width: 18 }}
                >
                  <Camera size={10} color="#fff" />
                </View>
              </Pressable>
              <TextInput
                className={`flex-1 ${INPUT_CLASSES}`}
                style={INPUT_STYLE}
                value={displayName}
                onChangeText={(t) => {
                  setDisplayName(t);
                  markDirty();
                }}
                placeholder="Your name"
                placeholderTextColor={PLACEHOLDER_COLOR}
                maxLength={50}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
              Add links (optional)
            </Text>
            <LinkIconRow
              values={links}
              onChange={(next) => {
                setLinks(next);
                markDirty();
              }}
            />
          </View>

          {error ? (
            <Text className="mb-3 text-center text-sm text-red-600">
              {error}
            </Text>
          ) : null}

          <Pressable
            disabled={submitting}
            onPress={() => void handleShare()}
            className="items-center rounded-2xl bg-interactive-1"
            style={{
              height: 52,
              justifyContent: "center",
              opacity: submitting ? 0.6 : 1,
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Share</Text>
            )}
          </Pressable>

          <Pressable
            disabled={submitting}
            onPress={() => void handleShareNow()}
            className="items-center pt-4"
          >
            <Text className="text-sm font-semibold text-interactive-1">
              Share now without editing
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
