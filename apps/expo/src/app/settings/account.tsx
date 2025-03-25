import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Instagram, Mail, Phone } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { Button } from "~/components/Button";
import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useSignOut } from "~/hooks/useSignOut";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { logError } from "../../utils/errorLogging";

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
  const { customerInfo } = useRevenueCat();
  const signOut = useSignOut();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.imageUrl ?? null,
  );
  const { showProPaywallIfNeeded } = useRevenueCat();
  const { data: userData } = api.user.getByUsername.useQuery(
    { userName: user?.username ?? "" },
    { enabled: !!user?.username },
  );
  const queryClient = useQueryClient();
  const {
    resetOnboarding: resetOnboardingStore,
    userTimezone,
    setUserTimezone,
  } = useAppStore();

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
    onSuccess: () =>
      router.canGoBack() ? router.back() : router.navigate("/feed"),
  });

  const resetOnboardingMutation = api.user.resetOnboarding.useMutation();

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      const loadingToastId = toast.loading("Updating profile...");
      setIsSubmitting(true);
      try {
        if (data.username !== user?.username) {
          await user?.update({ username: data.username });
        }
        await updateProfile.mutateAsync(data);
        toast.dismiss(loadingToastId);
        toast.success("Profile updated successfully");
      } catch (error) {
        logError("Error updating profile", error);
        toast.dismiss(loadingToastId);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, updateProfile],
  );

  const pickImage = useCallback(async () => {
    const loadingToastId = toast.loading("Updating profile image...");
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        toast.dismiss(loadingToastId);
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
        toast.dismiss(loadingToastId);
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        toast.dismiss(loadingToastId);
        throw new Error("No image asset selected");
      }

      setProfileImage(asset.uri);
      const base64 = asset.base64;
      const mimeType = asset.mimeType;
      if (!base64 || !mimeType) {
        toast.dismiss(loadingToastId);
        throw new Error("Image data is incomplete");
      }

      const image = `data:${mimeType};base64,${base64}`;

      await user?.setProfileImage({
        file: image,
      });
      toast.dismiss(loadingToastId);
      toast.success("Profile image updated successfully");
    } catch (error) {
      toast.dismiss(loadingToastId);
      logError("Error in pickImage", error);
      toast.error("Failed to pick image");
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
      router.canGoBack() ? router.back() : router.navigate("/feed");
    }
  }, [isDirty, isValid, handleSubmit, onSubmit]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            const loadingToastId = toast.loading("Deleting account...");
            void (async () => {
              try {
                await signOut({ shouldDeleteAccount: true });
                toast.dismiss(loadingToastId);
                toast.success("Account deleted successfully");
              } catch (error) {
                logError("Error deleting account", error);
                toast.dismiss(loadingToastId);
                toast.error("Failed to delete account");
              }
            })();
          },
        },
      ],
    );
  }, [signOut]);

  const handleRestartOnboarding = useCallback(() => {
    Alert.alert(
      "Restart Onboarding",
      "This will reset your onboarding progress. You'll need to go through the onboarding process again.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Restart",
          style: "destructive",
          onPress: () => {
            const loadingToastId = toast.loading("Restarting onboarding...");
            void (async () => {
              try {
                // Execute the mutation
                await resetOnboardingMutation.mutateAsync();

                // Invalidate all user-related queries at once
                await queryClient.invalidateQueries({ queryKey: ["user"] });

                // Reset client-side onboarding state in Zustand store
                resetOnboardingStore();

                toast.dismiss(loadingToastId);
                toast.success("Onboarding reset successfully");

                router.replace("/onboarding");
              } catch (error) {
                logError("Error restarting onboarding", error);
                toast.dismiss(loadingToastId);
                toast.error("Failed to restart onboarding");
              }
            })();
          },
        },
      ],
    );
  }, [resetOnboardingMutation, queryClient, resetOnboardingStore]);

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
            title: "Account",
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
                width: 96,
                height: 96,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                source={{ uri: profileImage ?? user?.imageUrl }}
                className="h-24 w-24 rounded-full object-cover object-center"
              />
            </TouchableOpacity>
          </UserProfileFlair>

          <View className="flex-col gap-4 space-y-4">
            <View>
              <Text className="text-lg font-semibold">Account Information</Text>
            </View>

            <View>
              <Text className="mb-2 text-base font-semibold">Username</Text>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="flex-1">
                    <TextInput
                      autoComplete="username"
                      autoCorrect={false}
                      autoCapitalize="none"
                      ref={usernameRef}
                      defaultValue={value}
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
                    autoComplete="off"
                    autoCorrect={false}
                    autoCapitalize="none"
                    ref={bioRef}
                    defaultValue={value}
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
                      autoComplete="email"
                      autoCorrect={false}
                      autoCapitalize="none"
                      ref={emailRef}
                      defaultValue={value}
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
                      autoComplete="tel"
                      autoCorrect={false}
                      autoCapitalize="none"
                      ref={phoneRef}
                      defaultValue={value}
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
                      autoComplete="off"
                      autoCorrect={false}
                      autoCapitalize="none"
                      ref={instaRef}
                      defaultValue={value}
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
                      autoComplete="url"
                      autoCorrect={false}
                      autoCapitalize="none"
                      ref={websiteRef}
                      defaultValue={value}
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

            {isDirty && (
              <Button
                onPress={handleSaveOrBack}
                disabled={isSubmitting}
                className="mt-4"
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            )}

            <View className="mt-8">
              <Text className="text-lg font-semibold">Preferences</Text>
              <View className="mt-4">
                <Text className="mb-2 text-base font-medium">
                  Default Timezone
                </Text>
                <Text className="mb-2 text-sm text-neutral-500">
                  This timezone will be used for all new events you create.
                </Text>
                <TimezoneSelectNative
                  value={userTimezone}
                  onValueChange={setUserTimezone}
                  placeholder="Select a timezone"
                />
              </View>
            </View>

            <View className="mt-12">
              <Text className="text-lg font-semibold">Subscription</Text>
              {(() => {
                if (!user) return null;
                const hasUnlimited =
                  customerInfo?.entitlements.active.unlimited;

                const stripeSubscription =
                  customerInfo?.originalPurchaseDate &&
                  new Date(customerInfo.originalPurchaseDate) <=
                    new Date(2025, 2, 7);

                if (hasUnlimited && !stripeSubscription) {
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        void Linking.openURL(
                          "itms-apps://apps.apple.com/account/subscriptions",
                        );
                      }}
                      className="mt-2 rounded-md bg-neutral-100 p-4"
                    >
                      <Text className="text-base">
                        View subscription in  Settings
                      </Text>
                    </TouchableOpacity>
                  );
                }

                if (hasUnlimited && stripeSubscription) {
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        void Linking.openURL(
                          "https://www.soonlist.com/account/plans",
                        );
                      }}
                      className="mt-2 rounded-md bg-neutral-100 p-4"
                    >
                      <Text className="text-base">
                        Manage subscription on web
                      </Text>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    onPress={showProPaywallIfNeeded}
                    className="mt-2 rounded-md bg-neutral-100 p-4"
                  >
                    <Text className="text-base">Upgrade to Pro</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>

            <View className="mt-12">
              <Text className="mb-2 text-base font-semibold text-red-500">
                Danger Zone
              </Text>
              <View>
                <Button
                  onPress={handleRestartOnboarding}
                  variant="destructive"
                  className="bg-red-500"
                  disabled={isSubmitting}
                >
                  Restart Onboarding
                </Button>
                <View className="h-4" />
                <Button
                  onPress={handleDeleteAccount}
                  variant="destructive"
                  className="bg-red-500"
                  disabled={isSubmitting}
                >
                  Delete Account
                </Button>
                <Text className="mt-2 text-xs text-neutral-500">
                  This will permanently delete your account and all associated
                  data.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
