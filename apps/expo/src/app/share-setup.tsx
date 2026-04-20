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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { LinkValues } from "~/components/LinkIconRow";
import { Camera } from "~/components/icons";
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { count: countParam } = useLocalSearchParams<{ count?: string }>();
  const count = countParam ? Number.parseInt(countParam, 10) : undefined;

  const defaultListName =
    currentUser?.publicListName ||
    `${currentUser?.displayName ?? user?.firstName ?? "My"}'s Soonlist`;

  const [listName, setListName] = useState(defaultListName);
  const [displayName, setDisplayName] = useState("");
  const [links, setLinks] = useState<LinkValues>({
    publicInsta: null,
    publicWebsite: null,
    publicEmail: null,
    publicPhone: null,
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed draft state once when currentUser resolves.
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

  // Animate between medium (preview) and large (edit) detents.
  useEffect(() => {
    navigation.setOptions({
      sheetAllowedDetents: isEditing ? [1.0] : [0.5],
    });
  }, [isEditing, navigation]);

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

  const countText =
    typeof count === "number"
      ? `${count} upcoming ${count === 1 ? "event" : "events"}`
      : "Your upcoming events";

  const subtitle =
    typeof count === "number" && count > 0
      ? `You've saved ${count} upcoming ${count === 1 ? "event" : "events"} — send it to a friend.`
      : "Send your upcoming events to friends.";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{
        flex: 1,
        flexDirection: "column",
        backgroundColor: "white",
        paddingTop: insets.top,
      }}
    >
      {isEditing ? (
        <EditForm
          listName={listName}
          setListName={setListName}
          displayName={displayName}
          setDisplayName={setDisplayName}
          avatar={avatar}
          pickAvatar={pickAvatar}
          links={links}
          setLinks={setLinks}
          error={error}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <PreviewContent
          title="Your Soonlist is ready to share"
          subtitle={subtitle}
          listName={listName}
          avatar={avatar}
          countText={countText}
          onEditPress={() => setIsEditing(true)}
        />
      )}

      <View
        collapsable={false}
        className="bg-white px-5 pt-3"
        style={{
          flexShrink: 0,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
      >
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
            <Text className="text-base font-semibold text-white">Share</Text>
          )}
        </Pressable>
        {!isEditing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={() => router.back()}
            style={({ pressed }) => ({
              height: 44,
              justifyContent: "center",
              marginTop: 16,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text className="text-center text-base font-medium text-neutral-2">
              Not now
            </Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

interface PreviewContentProps {
  title: string;
  subtitle: string;
  listName: string;
  avatar: string | null;
  countText: string;
  onEditPress: () => void;
}

function PreviewContent({
  title,
  subtitle,
  listName,
  avatar,
  countText,
  onEditPress,
}: PreviewContentProps) {
  return (
    <View collapsable={false} className="flex-1 px-5 pt-6">
      <Text className="text-center text-2xl font-bold text-neutral-1">
        {title}
      </Text>
      <Text className="mb-5 mt-2 text-center text-sm text-neutral-2">
        {subtitle}
      </Text>

      <View className="flex-row items-center rounded-2xl bg-interactive-3 p-4">
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ height: 48, width: 48 }} />
          ) : (
            <Camera size={20} color="#5A32FB" />
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text
            numberOfLines={1}
            className="text-base font-semibold text-neutral-1"
          >
            {listName}
          </Text>
          <Text className="text-sm text-neutral-2">{countText}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit list details"
          onPress={onEditPress}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text className="text-base font-semibold text-interactive-1">
            Edit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface EditFormProps {
  listName: string;
  setListName: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  avatar: string | null;
  pickAvatar: () => void;
  links: LinkValues;
  setLinks: (v: LinkValues) => void;
  error: string | null;
  onDone: () => void;
}

function EditForm({
  listName,
  setListName,
  displayName,
  setDisplayName,
  avatar,
  pickAvatar,
  links,
  setLinks,
  error,
  onDone,
}: EditFormProps) {
  return (
    <View collapsable={false} style={{ flex: 1, flexDirection: "column" }}>
      <View
        collapsable={false}
        style={{
          flexShrink: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: "white",
        }}
      >
        <Text className="text-xl font-bold text-neutral-1">Edit</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          onPress={onDone}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-base font-semibold text-interactive-1">
            Done
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
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
            Display name
          </Text>
          <TextInput
            className={INPUT_CLASSES}
            style={INPUT_STYLE}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={PLACEHOLDER_COLOR}
            maxLength={50}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
            Avatar
          </Text>
          <Pressable
            onPress={pickAvatar}
            accessibilityLabel="Change photo"
            className="flex-row items-center gap-3"
          >
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-interactive-3">
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={{ height: 56, width: 56 }}
                />
              ) : (
                <Camera size={22} color="#5A32FB" />
              )}
            </View>
            <Text className="text-base font-medium text-interactive-1">
              Change photo
            </Text>
          </Pressable>
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
            Instagram
          </Text>
          <TextInput
            className={INPUT_CLASSES}
            style={INPUT_STYLE}
            value={links.publicInsta ?? ""}
            onChangeText={(v) => setLinks({ ...links, publicInsta: v || null })}
            placeholder="@handle"
            placeholderTextColor={PLACEHOLDER_COLOR}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
            Website
          </Text>
          <TextInput
            className={INPUT_CLASSES}
            style={INPUT_STYLE}
            value={links.publicWebsite ?? ""}
            onChangeText={(v) =>
              setLinks({ ...links, publicWebsite: v || null })
            }
            placeholder="https://"
            placeholderTextColor={PLACEHOLDER_COLOR}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
            Email
          </Text>
          <TextInput
            className={INPUT_CLASSES}
            style={INPUT_STYLE}
            value={links.publicEmail ?? ""}
            onChangeText={(v) => setLinks({ ...links, publicEmail: v || null })}
            placeholder="you@example.com"
            placeholderTextColor={PLACEHOLDER_COLOR}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-2">
            Phone
          </Text>
          <TextInput
            className={INPUT_CLASSES}
            style={INPUT_STYLE}
            value={links.publicPhone ?? ""}
            onChangeText={(v) => setLinks({ ...links, publicPhone: v || null })}
            placeholder="+1 555 555 5555"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
          />
        </View>

        {error ? (
          <Text className="mb-3 text-center text-sm text-red-600">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
