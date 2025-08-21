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
import { Redirect, router, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Button } from "~/components/Button";
import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useSignOut } from "~/hooks/useSignOut";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "../../utils/errorLogging";

// Simplified schema - only keeping what we still need for form validation
const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less"),
  displayName: z
    .string()
    .max(50, "Display name must be 50 characters or less")
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Settings section component
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-lg font-semibold mb-3">{title}</Text>
      {children}
    </View>
  );
}

// Settings option component
function SettingsOption({ 
  title, 
  subtitle, 
  onPress 
}: { 
  title: string; 
  subtitle?: string; 
  onPress: () => void;
}) {
  return (
    <TouchableOpacity 
      className="flex-row items-center p-4 mb-2 rounded-lg border border-gray-200"
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="font-semibold text-base">{title}</Text>
        {subtitle && <Text className="text-sm text-gray-500">{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function EditProfileScreen() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const signOut = useSignOut();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.imageUrl ?? null,
  );

  const displayNameRef = useRef<TextInput>(null);
  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
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
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username ?? "",
      displayName: userData?.displayName ?? "",
    },
    mode: "onBlur",
  });

  const watchedDisplayName = watch("displayName");

  useEffect(() => {
    if (userData) {
      reset({
        username: user?.username ?? "",
        displayName: userData.displayName ?? "",
      });
    }
  }, [userData, user, reset]);

  const updateProfile = useMutation(api.users.updateAdditionalInfo);
  const resetOnboardingMutation = useMutation(api.users.resetOnboarding);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      const loadingToastId = toast.loading("Updating profile...");
      setIsSubmitting(true);
      try {
        if (data.username !== user?.username) {
          await user?.update({ username: data.username });
        }
        if (user?.id) {
          await updateProfile({
            userId: user.id,
            displayName: data.displayName,
          });
        }
        toast.dismiss(loadingToastId);
        toast.success("Profile updated successfully");
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate("/feed");
        }
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
                // No manual navigation needed - Convex auth components will handle the transition
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
      "This will reset your onboarding progress and sign you out. You'll need to go through the onboarding process again.",
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
                if (user?.id) {
                  await resetOnboardingMutation({ userId: user.id });
                }
                // Reset client-side onboarding state in Zustand store
                resetOnboardingStore();

                // Sign out the user to land on the welcome screen
                await signOut();

                // Only show success toast after signOut completes successfully
                toast.dismiss(loadingToastId);
                toast.success("Onboarding reset successfully");
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
  }, [resetOnboardingMutation, resetOnboardingStore, user?.id, signOut]);

  // Redirect unauthenticated users to sign-in
  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

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
              <Text className="mb-2 text-base font-semibold">Display Name</Text>
              <Text className="mb-2 text-sm text-neutral-500">
                How you'll appear on events
              </Text>
              <Controller
                control={control}
                name="displayName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={displayNameRef}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-base"
                    placeholder="Enter display name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    maxLength={50}
                  />
                )}
              />
              {errors.displayName && (
                <Text className="mt-1 text-sm text-red-500">
                  {errors.displayName.message}
                </Text>
              )}
            </View>

            <View className="rounded-md bg-neutral-50 p-4">
              <Text className="mb-2 text-sm font-medium text-neutral-700">
                Preview
              </Text>
              <Text className="text-sm text-neutral-500">
                On events, you'll appear as:{" "}
                <Text className="font-medium text-neutral-700">
                  {watchedDisplayName?.trim() || user?.username || "Unknown"}
                </Text>
              </Text>
            </View>

            {isDirty && (
              <Button
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                className="mt-4"
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            )}
          </View>

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

          <SettingsSection title="App Settings">
            <SettingsOption 
              title="Calendar Settings" 
              subtitle="Choose your preferred calendar app"
              onPress={() => router.navigate("/settings/calendar")}
            />
          </SettingsSection>

          <View className="mt-12">
            <Text className="text-lg font-semibold">Subscription</Text>
            {(() => {
              if (!user) return null;
              const hasUnlimited =
                customerInfo?.entitlements.active.unlimited?.isActive ?? false;

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
                      View subscription in Settings
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

          {__DEV__ && (
            <View className="mt-12">
              <Text className="mb-2 text-base font-semibold text-blue-600">
                Development Testing
              </Text>
              <TouchableOpacity
                onPress={() => router.navigate("/settings/workflow-test")}
                className="mt-2 rounded-md bg-blue-100 p-4"
              >
                <Text className="text-base text-blue-800">
                  Workflow Failure Tests
                </Text>
                <Text className="text-sm text-blue-600">
                  Test workflow failure notifications
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="mt-12">
            <Text className="mb-2 text-base font-semibold text-red-500">
              Danger Zone
            </Text>
            <View>
              <Button
                onPress={handleRestartOnboarding}
                variant="destructive"
                className="bg-red-500"
              >
                Restart Onboarding
              </Button>
              <View className="h-4" />
              <Button
                onPress={handleDeleteAccount}
                variant="destructive"
                className="bg-red-500"
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
