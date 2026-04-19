import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { LinkValues } from "~/components/LinkIconRow";
import { Camera } from "~/components/icons";
import { LinkIconRow } from "~/components/LinkIconRow";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

const INPUT_CLASSES = "rounded-xl bg-interactive-3 text-neutral-1";
const INPUT_STYLE = {
  paddingVertical: 14,
  paddingHorizontal: 16,
  fontSize: 16,
  lineHeight: 20,
} as const;
const PLACEHOLDER_COLOR = "rgb(98, 116, 150)";

export default function ShareSetupScreen() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const completeSetup = useMutation(api.users.completeFirstShareSetup);

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

  // Seed form values once when currentUser resolves (query starts undefined).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !currentUser) return;
    seededRef.current = true;
    setListName(
      currentUser.publicListName ||
        `${currentUser.displayName ?? user?.firstName ?? "My"}'s Soonlist`,
    );
    setDisplayName(currentUser.displayName ?? "");
    setLinks({
      publicInsta: currentUser.publicInsta ?? null,
      publicWebsite: currentUser.publicWebsite ?? null,
      publicEmail: currentUser.publicEmail ?? null,
      publicPhone: currentUser.publicPhone ?? null,
    });
    setAvatar(currentUser.userImage ?? null);
  }, [currentUser, user?.firstName]);

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
    } catch {
      setError("Couldn't update photo. Try again.");
    }
  }, [user]);

  const userId = currentUser?.id;
  const username = user?.username ?? currentUser?.username ?? "";

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
      router.back();
      if (username) {
        const url = `${Config.apiBaseUrl}/${username}`;
        try {
          await Share.share(Platform.OS === "ios" ? { url } : { message: url });
        } catch (shareError) {
          logError("Error sharing list", shareError);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [userId, listName, displayName, links, completeSetup, username]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 32,
        }}
      >
        <Text className="mb-1 text-center text-2xl font-bold text-neutral-1">
          Share your Soonlist
        </Text>
        <Text className="mb-8 text-center text-sm text-neutral-2">
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
            onChangeText={setListName}
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
              onChangeText={setDisplayName}
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
          <LinkIconRow values={links} onChange={setLinks} />
        </View>

        {error ? (
          <Text className="mb-3 text-center text-sm text-red-600">{error}</Text>
        ) : null}
      </ScrollView>

      <View className="bg-white px-5 pb-4 pt-4">
        <Pressable
          disabled={submitting}
          onPress={() => void handleShare()}
          className="items-center rounded-full bg-interactive-1"
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
            <Text className="text-base font-semibold text-white">
              Save & Share
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
