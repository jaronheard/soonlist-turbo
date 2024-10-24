"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Instagram, Mail, Phone } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/Button";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { api } from "~/utils/api";
import { showToast } from "~/utils/toast";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less"),
  bio: z.string().max(150, "Bio must be 150 characters or less").optional(),
  publicEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  publicPhone: z.string().optional(),
  publicInsta: z.string().optional(),
  publicWebsite: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfileScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.imageUrl ?? null,
  );

  const { data: userData } = api.user.getByUsername.useQuery(
    { userName: user?.username ?? "" },
    { enabled: !!user?.username },
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username ?? "",
      bio: userData?.bio ?? undefined,
      publicEmail: userData?.publicEmail ?? undefined,
      publicPhone: userData?.publicPhone ?? undefined,
      publicInsta: userData?.publicInsta ?? undefined,
      publicWebsite: userData?.publicWebsite ?? undefined,
    },
    mode: "onBlur",
  });

  // Add this useEffect hook
  useEffect(() => {
    if (userData) {
      reset({
        username: user?.username ?? "",
        bio: userData.bio ?? undefined,
        publicEmail: userData.publicEmail ?? undefined,
        publicPhone: userData.publicPhone ?? undefined,
        publicInsta: userData.publicInsta ?? undefined,
        publicWebsite: userData.publicWebsite ?? undefined,
      });
    }
  }, [userData, user, reset]);

  const updateProfile = api.user.updateAdditionalInfo.useMutation({
    onMutate: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
    onSuccess: () => router.back(),
  });

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      setIsSubmitting(true);
      try {
        if (data.username !== user?.username) {
          await user?.update({ username: data.username });
        }
        await updateProfile.mutateAsync(data);
        showToast("Profile updated successfully", "success");
      } catch (error) {
        console.error("Error updating profile:", error);
        showToast("An unexpected error occurred", "error");
        // Handle error (e.g., show error message to user)
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, updateProfile],
  );

  const pickImage = useCallback(async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error("Permission to access photos was denied");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.1,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        throw new Error("No image asset selected");
      }

      setProfileImage(asset.uri);
      const base64 = asset.base64;
      const mimeType = asset.mimeType;
      if (!base64 || !mimeType) {
        throw new Error("Image data is incomplete");
      }

      const image = `data:${mimeType};base64,${base64}`;

      await user?.setProfileImage({
        file: image,
      });
      showToast("Profile image updated successfully", "success");
    } catch (error) {
      console.error("Error in pickImage:", error);
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("An unexpected error occurred", "error");
      }
      // Revert to the previous image if the update fails
      setProfileImage(user?.imageUrl ?? null);
    }
  }, [user]);

  // Create refs for each input field
  const usernameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const instaRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);

  // Function to focus the next input
  const focusNextInput = (nextRef: React.RefObject<TextInput>) => {
    nextRef.current?.focus();
  };

  const handleSaveOrBack = useCallback(() => {
    if (isDirty && isValid) {
      void handleSubmit(onSubmit)();
    } else {
      router.back();
    }
  }, [isDirty, isValid, handleSubmit, onSubmit, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen
          options={{
            title: "Edit Profile",
            headerBackTitle: "Back",
            headerBackButtonMenuEnabled: true,
          }}
        />

        <View className="flex-col gap-4 space-y-6">
          <UserProfileFlair
            className="mx-auto h-24 w-24 items-center"
            username={user?.username ?? ""}
            size="2xl"
          >
            <TouchableOpacity
              onPress={pickImage}
              className="relative"
              activeOpacity={0.7}
              style={{
                width: 96, // Adjust this value to match the image size
                height: 96, // Adjust this value to match the image size
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                source={{ uri: profileImage ?? user?.imageUrl }}
                className="h-24 w-24 rounded-full"
              />
            </TouchableOpacity>
          </UserProfileFlair>

          <View>
            <Text className="mb-2 text-base font-semibold">Username</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-1">
                  <TextInput
                    ref={usernameRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your username"
                    className="h-10 rounded-md border border-neutral-300 px-3 py-2"
                    onSubmitEditing={() => focusNextInput(bioRef)}
                    returnKeyType="next"
                  />
                  {errors.username && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.username.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Text className="mb-2 text-base font-semibold">Bio</Text>
                <TextInput
                  ref={bioRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your bio (max 150 characters)"
                  multiline
                  className="h-24 rounded-md border border-neutral-300 px-3 py-2"
                />
                <Text className="mt-1 text-xs text-neutral-500">
                  Example: I love ambient music, creative community building,
                  and vegan pop-ups.
                </Text>
                {errors.bio && (
                  <Text className="mt-1 text-xs text-red-500">
                    {errors.bio.message}
                  </Text>
                )}
              </View>
            )}
          />

          <View className="flex-col gap-4 space-y-4">
            <View>
              <Text className="text-lg font-semibold">How to connect</Text>
              <Text className="text-sm text-neutral-500">
                Share any contact info you want to publicly display.
              </Text>
            </View>

            <Controller
              control={control}
              name="publicEmail"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View className="mb-2 flex-row items-center">
                    <Mail size={16} color="#000" />
                    <Text className="ml-2 font-medium">Email</Text>
                  </View>
                  <TextInput
                    ref={emailRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    className="rounded-md border border-neutral-300 px-3 py-2"
                    onSubmitEditing={() => focusNextInput(phoneRef)}
                    returnKeyType="next"
                  />
                  {errors.publicEmail && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.publicEmail.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="publicPhone"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View className="mb-2 flex-row items-center">
                    <Phone size={16} color="#000" />
                    <Text className="ml-2 font-medium">Phone</Text>
                  </View>
                  <TextInput
                    ref={phoneRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="1234567890"
                    keyboardType="phone-pad"
                    className="rounded-md border border-neutral-300 px-3 py-2"
                  />
                  {errors.publicPhone && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.publicPhone.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="publicInsta"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View className="mb-2 flex-row items-center">
                    <Instagram size={16} color="#000" />
                    <Text className="ml-2 font-medium">Instagram</Text>
                  </View>
                  <TextInput
                    ref={instaRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="username"
                    className="rounded-md border border-neutral-300 px-3 py-2"
                    onSubmitEditing={() => focusNextInput(websiteRef)}
                    returnKeyType="next"
                  />
                  {errors.publicInsta && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.publicInsta.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="publicWebsite"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View className="mb-2 flex-row items-center">
                    <Globe size={16} color="#000" />
                    <Text className="ml-2 font-medium">Website</Text>
                  </View>
                  <TextInput
                    ref={websiteRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="www.example.com"
                    keyboardType="url"
                    className="rounded-md border border-neutral-300 px-3 py-2"
                    returnKeyType="done"
                  />
                  {errors.publicWebsite && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.publicWebsite.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          <Button
            onPress={handleSaveOrBack}
            disabled={isSubmitting}
            className="mt-4"
          >
            {isDirty ? (isSubmitting ? "Saving..." : "Save Profile") : "Done"}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
