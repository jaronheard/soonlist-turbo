import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Button } from "~/components/Button";
import { ShareIcon } from "~/components/icons";
import { TimezoneSelectNative } from "~/components/TimezoneSelectNative";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useSignOut } from "~/hooks/useSignOut";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import Config from "~/utils/config";
import { hapticSuccess, toast } from "~/utils/feedback";
import { logError } from "../../utils/errorLogging";
import { getPlanStatusFromUser } from "../../utils/plan";

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
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8">
      <Text className="mb-3 text-lg font-semibold">{title}</Text>
      {children}
    </View>
  );
}

// Settings option component
function SettingsOption({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="mb-2 flex-row items-center rounded-lg border border-gray-200 p-4"
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold">{title}</Text>
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
  const updatePublicListSettings = useMutation(
    api.users.updatePublicListSettings,
  );

  // Public list state - read directly from userData, Convex reactivity handles updates
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const publicListEnabled = userData?.publicListEnabled ?? false;
  const publicListName = userData?.publicListName ?? "";
  // Local state only for TextInput (controlled component while typing)
  const [publicListNameInput, setPublicListNameInput] = useState<string>("");
  const [isUpdatingList, setIsUpdatingList] = useState(false);

  // Sync TextInput value from userData when it changes
  useEffect(() => {
    setPublicListNameInput(userData?.publicListName ?? "");
  }, [userData?.publicListName]);

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
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
        hapticSuccess();
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate("/feed");
        }
      } catch (error) {
        logError("Error updating profile", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, updateProfile],
  );

  const pickImage = useCallback(async () => {
    try {
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
      hapticSuccess();
    } catch (error) {
      logError("Error in pickImage", error);
      toast.error("Failed to update image");
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
            void (async () => {
              try {
                await signOut({ shouldDeleteAccount: true });
                hapticSuccess();
                // No manual navigation needed - Convex auth components will handle the transition
              } catch (error) {
                logError("Error deleting account", error);
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
            void (async () => {
              try {
                if (user?.id) {
                  await resetOnboardingMutation({ userId: user.id });
                }
                // Reset client-side onboarding state in Zustand store
                resetOnboardingStore();

                // Sign out the user to land on the welcome screen
                await signOut();

                hapticSuccess();
              } catch (error) {
                logError("Error restarting onboarding", error);
                toast.error("Failed to restart onboarding");
              }
            })();
          },
        },
      ],
    );
  }, [resetOnboardingMutation, resetOnboardingStore, user?.id, signOut]);

  const handleTogglePublicList = useCallback(async () => {
    if (!user?.id) return;

    const newEnabled = !publicListEnabled;
    setIsUpdatingList(true);

    try {
      const defaultName = `${userData?.displayName || user.username}'s events`;
      await updatePublicListSettings({
        userId: user.id,
        publicListEnabled: newEnabled,
        publicListName: newEnabled ? publicListName || defaultName : undefined,
      });
      hapticSuccess();
    } catch (error) {
      logError("Error toggling public list", error);
      toast.error("Failed to update public list settings");
    } finally {
      setIsUpdatingList(false);
    }
  }, [
    user?.id,
    user?.username,
    userData?.displayName,
    publicListEnabled,
    publicListName,
    updatePublicListSettings,
  ]);

  const handleUpdateListName = useCallback(async () => {
    if (!user?.id || !publicListEnabled) return;

    setIsUpdatingList(true);
    try {
      await updatePublicListSettings({
        userId: user.id,
        publicListName: publicListNameInput.trim() || undefined,
      });
      hapticSuccess();
    } catch (error) {
      logError("Error updating list name", error);
      toast.error("Failed to update list name");
    } finally {
      setIsUpdatingList(false);
    }
  }, [
    user?.id,
    publicListEnabled,
    publicListNameInput,
    updatePublicListSettings,
  ]);

  const getPublicListUrl = useCallback(() => {
    if (!user?.username) return "";
    return `${Config.apiBaseUrl}/${user.username}`;
  }, [user?.username]);

  const handleSharePublicList = useCallback(async () => {
    const url = getPublicListUrl();
    if (!url) return;

    try {
      await Share.share({
        message: "Check out my events on Soonlist:",
        url,
      });
    } catch {
      // Share can be cancelled, so don't show error toast
    }
  }, [getPublicListUrl]);

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

          {!showDiscover && (
            <SettingsSection title="Share Your Events">
              <View className="mb-4 rounded-lg border border-gray-200 p-4">
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="mb-1 text-base font-semibold">
                      Public List
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Share all your events with anyone via a public link
                    </Text>
                  </View>
                  <Switch
                    value={publicListEnabled}
                    onValueChange={handleTogglePublicList}
                    disabled={isUpdatingList}
                    accessibilityLabel="Public list enabled"
                    accessibilityRole="switch"
                    accessibilityState={{
                      checked: publicListEnabled,
                      disabled: isUpdatingList,
                    }}
                    testID="public-list-switch"
                    accessibilityHint="Toggle to enable or disable sharing your events via a public link"
                  />
                </View>

                {publicListEnabled && (
                  <View className="mt-4 border-t border-gray-100 pt-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">
                      List Name
                    </Text>
                    <TextInput
                      className="mb-4 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base"
                      placeholder="Enter list name"
                      value={publicListNameInput}
                      onChangeText={setPublicListNameInput}
                      onBlur={handleUpdateListName}
                      onSubmitEditing={handleUpdateListName}
                      returnKeyType="done"
                      maxLength={50}
                    />

                    <Text className="mb-2 text-sm font-medium text-gray-700">
                      Your public link
                    </Text>
                    <TouchableOpacity
                      onPress={handleSharePublicList}
                      className="flex-row items-center justify-between rounded-lg border border-interactive-1 bg-interactive-1/5 px-4 py-3"
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Share public list link"
                      accessibilityHint="Opens share sheet to copy or share your public list URL"
                    >
                      <Text
                        className="flex-1 text-base font-medium text-interactive-1"
                        numberOfLines={1}
                      >
                        {getPublicListUrl().replace("https://", "")}
                      </Text>
                      <View accessible={false}>
                        <ShareIcon size={20} color="#5A32FB" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </SettingsSection>
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
