"use client";

import React, { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Instagram, Mail, Phone } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/Button";
import { api } from "~/utils/api";

const profileSchema = z.object({
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

  const { data: userData } = api.user.getByUsername.useQuery(
    { userName: user?.username ?? "" },
    { enabled: !!user?.username },
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: userData?.bio ?? undefined,
      publicEmail: userData?.publicEmail ?? undefined,
      publicPhone: userData?.publicPhone ?? undefined,
      publicInsta: userData?.publicInsta ?? undefined,
      publicWebsite: userData?.publicWebsite ?? undefined,
    },
    mode: "onBlur",
  });

  const updateProfile = api.user.updateAdditionalInfo.useMutation({
    onMutate: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
    onSuccess: () => router.back(),
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerBackTitle: "Back",
          headerBackButtonMenuEnabled: true,
        }}
      />

      <View className="flex-col gap-4 space-y-6">
        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <Text className="mb-2 text-base font-semibold">Bio</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter your bio (max 150 characters)"
                multiline
                className="h-24 rounded-md border border-neutral-300 px-3 py-2"
              />
              <Text className="mt-1 text-xs text-neutral-500">
                Example: I love ambient music, creative community building, and
                vegan pop-ups.
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  className="rounded-md border border-neutral-300 px-3 py-2"
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="username"
                  className="rounded-md border border-neutral-300 px-3 py-2"
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
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="www.example.com"
                  keyboardType="url"
                  className="rounded-md border border-neutral-300 px-3 py-2"
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
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isDirty}
          className="mt-4"
        >
          {isSubmitting ? "Saving..." : "Save Profile"}
        </Button>
      </View>
    </ScrollView>
  );
}
