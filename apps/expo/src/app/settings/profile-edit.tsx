import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Camera } from "~/components/icons";
import { hapticSuccess, toast } from "~/utils/feedback";
import { logError } from "../../utils/errorLogging";

const PAGE_BG = "#F2F2F7";
const INK_0 = "#162135";
const INK_2 = "#627496";
const PURPLE = "#5A32FB";
const SECONDARY_LABEL = "rgba(60,60,67,0.6)";
const PLACEHOLDER_COLOR = "rgb(98, 116, 150)";

const FIELDS = [
  {
    key: "displayName",
    label: "Display name",
    placeholder: "Your name",
    keyboard: "default" as const,
    autoCap: "words" as const,
    maxLength: 50,
  },
  {
    key: "publicInsta",
    label: "Instagram",
    placeholder: "@handle",
    keyboard: "default" as const,
    autoCap: "none" as const,
    maxLength: 50,
  },
  {
    key: "publicWebsite",
    label: "Website",
    placeholder: "https://",
    keyboard: "url" as const,
    autoCap: "none" as const,
    maxLength: 200,
  },
  {
    key: "publicEmail",
    label: "Email",
    placeholder: "you@example.com",
    keyboard: "email-address" as const,
    autoCap: "none" as const,
    maxLength: 120,
  },
  {
    key: "publicPhone",
    label: "Phone",
    placeholder: "+1 555 555 5555",
    keyboard: "phone-pad" as const,
    autoCap: "none" as const,
    maxLength: 30,
  },
];

type ProfileState = Record<(typeof FIELDS)[number]["key"], string>;

export default function ProfileEditScreen() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updateAdditionalInfo = useMutation(api.users.updateAdditionalInfo);

  const [form, setForm] = useState<ProfileState>({
    displayName: "",
    publicInsta: "",
    publicWebsite: "",
    publicEmail: "",
    publicPhone: "",
  });
  const [avatar, setAvatar] = useState<string | null>(user?.imageUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current || !currentUser) return;
    seededRef.current = true;
    setForm({
      displayName: currentUser.displayName,
      publicInsta: currentUser.publicInsta ?? "",
      publicWebsite: currentUser.publicWebsite ?? "",
      publicEmail: currentUser.publicEmail ?? "",
      publicPhone: currentUser.publicPhone ?? "",
    });
    if (currentUser.userImage) {
      setAvatar(currentUser.userImage);
    }
  }, [currentUser]);

  const pickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.1,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) return;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const base64 = `data:${mimeType};base64,${asset.base64}`;
      await user?.setProfileImage({ file: base64 });
      setAvatar(asset.uri);
      void hapticSuccess();
    } catch (error) {
      logError("Error updating avatar", error);
      toast.error("Couldn't update photo");
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      await updateAdditionalInfo({
        userId: user.id,
        displayName: form.displayName,
        publicInsta: form.publicInsta,
        publicWebsite: form.publicWebsite,
        publicEmail: form.publicEmail,
        publicPhone: form.publicPhone,
      });
      void hapticSuccess();
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      logError("Error saving profile", error);
      Alert.alert(
        "Couldn't save",
        "Something went wrong while saving your profile. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, form, updateAdditionalInfo]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: PAGE_BG }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            alignItems: "center",
            paddingTop: 20,
            paddingBottom: 20,
            gap: 12,
            backgroundColor: "#F4F1FF",
          }}
        >
          <TouchableOpacity
            onPress={pickAvatar}
            activeOpacity={0.8}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              overflow: "hidden",
              backgroundColor: "#E0D9FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{ width: 96, height: 96 }}
              />
            ) : (
              <Camera size={28} color={PURPLE} />
            )}
          </TouchableOpacity>
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: PURPLE }}
            onPress={pickAvatar}
          >
            Change photo
          </Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 22 }}>
          <Text
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 0.13,
              color: SECONDARY_LABEL,
              paddingLeft: 16,
              paddingBottom: 6,
            }}
          >
            Your public profile
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {FIELDS.map((field, index) => (
              <View
                key={field.key}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 0.5,
                  borderTopColor: "rgba(60,60,67,0.12)",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: INK_2,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  {field.label}
                </Text>
                <TextInput
                  value={form[field.key]}
                  onChangeText={(v) =>
                    setForm((prev) => ({ ...prev, [field.key]: v }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  keyboardType={field.keyboard}
                  autoCapitalize={field.autoCap}
                  autoCorrect={false}
                  maxLength={field.maxLength}
                  style={{
                    fontSize: 17,
                    letterSpacing: -0.17,
                    color: INK_0,
                    paddingVertical: 0,
                  }}
                />
              </View>
            ))}
          </View>
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: SECONDARY_LABEL,
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 8,
            }}
          >
            This is what people see when you share an event.
          </Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 22 }}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={submitting}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 12,
              backgroundColor: PURPLE,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed || submitting ? 0.7 : 1,
            })}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 17,
                  color: "#FFFFFF",
                  fontWeight: "600",
                }}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
