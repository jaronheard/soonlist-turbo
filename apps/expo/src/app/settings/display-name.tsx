import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner-native";
import { z } from "zod";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Button } from "~/components/Button";
import { logError } from "../../utils/errorLogging";

const displayNameSchema = z.object({
  displayName: z
    .string()
    .max(50, "Display name must be 50 characters or less")
    .optional(),
});

type DisplayNameFormData = z.infer<typeof displayNameSchema>;

export default function DisplayNameScreen() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );

  const displayNameRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    reset,
    watch,
  } = useForm<DisplayNameFormData>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      displayName: userData?.displayName ?? "",
    },
    mode: "onBlur",
  });

  const watchedDisplayName = watch("displayName");

  useEffect(() => {
    if (userData) {
      reset({
        displayName: userData.displayName ?? "",
      });
    }
  }, [userData, reset]);

  const updateProfile = useMutation(api.users.updateAdditionalInfo);

  const onSubmit = useCallback(
    async (data: DisplayNameFormData) => {
      const loadingToastId = toast.loading("Updating display name...");
      setIsSubmitting(true);
      try {
        if (user?.id) {
          await updateProfile({
            userId: user.id,
            displayName: data.displayName,
          });
        }
        toast.dismiss(loadingToastId);
        toast.success("Display name updated successfully");
        if (router.canGoBack()) {
          router.back();
        } else {
          router.navigate("/settings/account");
        }
      } catch (error) {
        logError("Error updating display name", error);
        toast.dismiss(loadingToastId);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, updateProfile],
  );

  const handleSaveOrBack = useCallback(() => {
    if (isDirty && isValid) {
      void handleSubmit(onSubmit)();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate("/settings/account");
      }
    }
  }, [isDirty, isValid, handleSubmit, onSubmit]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Calculate what will be shown on events
  const previewName = watchedDisplayName?.trim() || user.username || "Unknown";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <Stack.Screen
        options={{
          title: "Display Name",
          headerBackTitle: "Settings",
        }}
      />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="flex-1 p-4">
          <View className="mb-6">
            <Text className="mb-2 text-sm text-neutral-500">
              Your display name is shown when you create events. If you don't set one, your username will be used instead.
            </Text>
          </View>

          <View className="mb-6">
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View className="mb-2">
                    <Text className="font-medium">Display Name</Text>
                  </View>
                  <TextInput
                    ref={displayNameRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={user.username || "Enter display name"}
                    className="rounded-md border border-neutral-300 px-3 py-2"
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveOrBack}
                  />
                  {errors.displayName && (
                    <Text className="mt-1 text-xs text-red-500">
                      {errors.displayName.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>

          <View className="mb-6 rounded-md bg-neutral-50 p-4">
            <Text className="mb-2 text-sm font-medium text-neutral-700">
              Preview
            </Text>
            <Text className="text-sm text-neutral-500">
              On events, you'll appear as: <Text className="font-medium text-neutral-700">@{previewName}</Text>
            </Text>
          </View>

          {isDirty && (
            <Button
              onPress={handleSaveOrBack}
              disabled={isSubmitting || !isValid}
              className="mt-4"
            >
              {isSubmitting ? "Saving..." : "Save Display Name"}
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

